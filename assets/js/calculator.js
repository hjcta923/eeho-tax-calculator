(function($){
'use strict';
var A=$('#eeho-app');if(!A.length)return;

/* ================================================================
   API CONFIG — WordPress AJAX 프록시 경유 (CORS 우회)
   ================================================================ */
var EEHO_API_URL = "https://eeho-api-1070315020839.us-central1.run.app";

/* ================================================================
   STATE
   ================================================================ */
var formData = {
  taxType:'cgt', assetType:'re', reSubType:'apt',
  amount:0, address:'', stockName:'',
  regulated:'no', houses:'1',
  saleDate:'', acqDate:'',
  reside:'2', area:'under85', acqPrice:0,
};

var aiState = {
  payload:          {},   // 기본 Payload
  userText:         '',
  callCount:        0,
  sessionId:        '',
  applicableLaw:    '',   // /generate-questions 반환
  lawSummary:       '',
  checklistAnswers: [],   // [{id, question, answer}]
  factSummary:      '',   // /confirm 반환
  supplementText:   '',   // 보완 입력
};

var currentStep        = 1;
var currentEstimatedTax= 0;
var lastCalcResult     = { items:[], total:0 };

/* ================================================================
   세션 ID 생성
   ================================================================ */
function generateSessionId(){
  return 'usr_'+Date.now()+'_session_'+String(Math.floor(Math.random()*100)).padStart(2,'0');
}

/* ================================================================
   매핑 테이블
   ================================================================ */
var MAP_TAX_CATEGORY = {'cgt':'양도소득세','acq':'취득세','prop':'재산세/종합부동산세','gift':'상속·증여'};
var MAP_TYPE_ASSET   = {'apt':'아파트','villa':'빌라','officetel':'오피스텔','commercial':'상가','building':'건물','land':'토지','rights':'입주권/분양권'};

/* ================================================================
   UTILS
   ================================================================ */
function fmt(n){return Number(n).toLocaleString('ko-KR');}
function raw(s){return String(s).replace(/[^0-9]/g,'')||'0';}
function esc(s){return $('<div>').text(String(s)).html().replace(/\n/g,'<br>');}
function safeParse(data){
  if(typeof data==='object'&&data!==null)return data;
  if(typeof data==='string'){
    try{var p=JSON.parse(data);if(typeof p==='string')try{p=JSON.parse(p);}catch(e2){}return p;}
    catch(e){console.error('[EEHO] safeParse:',e);return null;}
  }
  return null;
}

/* ================================================================
   buildPayload: 새 명세서 기반 계층적 JSON 생성
   규칙 ① calculated_data 누락 방지
   규칙 ② 모름 값 → "모름" 문자열 전송
   ================================================================ */
function buildPayload(freeText){
  function safe(v){return(v===undefined||v===null||v==='')? '모름':v;}

  var taxTypeStr   = MAP_TAX_CATEGORY[formData.taxType]||'모름';
  var assetTypeStr = MAP_TYPE_ASSET[formData.reSubType]||'모름';
  var addressStr   = ($('#inpAddress').val()||'').trim()||'모름';
  var areaMap      = {'under85':'85㎡ 이하','over85':'85㎡ 초과','unknown':'모름'};
  var areaStr      = areaMap[formData.area]||'모름';
  var regulatedMap = {'yes':'여','no':'부','unknown':'모름'};
  var regulatedStr = regulatedMap[formData.regulated]||'모름';
  var housesMap    = {'1':'1주택','2':'2주택','3':'3주택','multi':'4주택 이상','unknown':'모름'};
  var houseStr     = housesMap[formData.houses]||'모름';
  var resideMap    = {'0':'없음','2':'2년+','5':'5년+','10':'10년+','unknown':'모름'};
  var resideStr    = resideMap[formData.reside]||'모름';

  var calcData = {estimated_total_tax: lastCalcResult.total||0};
  (lastCalcResult.items||[]).forEach(function(item){
    switch(item.name){
      case '양도소득세':   calcData.estimated_yangdo_tax=item.amount;break;
      case '지방소득세':   calcData.estimated_local_tax=item.amount;break;
      case '중과가산':     calcData.estimated_surcharge=item.amount;break;
      case '취득세':       calcData.estimated_acq_tax=item.amount;break;
      case '지방교육세':   calcData.estimated_local_edu_tax=item.amount;break;
      case '농어촌특별세': calcData.estimated_rural_tax=item.amount;break;
      case '재산세':       calcData.estimated_property_tax=item.amount;break;
      case '종합부동산세': calcData.estimated_comprehensive_tax=item.amount;break;
      case '증여세':       calcData.estimated_gift_tax=item.amount;break;
      case '신고세액공제': calcData.estimated_filing_deduction=item.amount;break;
    }
  });

  return {
    session_id:   aiState.sessionId,
    tax_category: {type: taxTypeStr},
    structured_data: {
      asset_info:     {asset_type:assetTypeStr, address:addressStr, area_size:areaStr},
      price_info:     {buy_price:formData.acqPrice||0, sell_price:formData.amount||0},
      date_info:      {buy_date:safe($('#inpAcqDate').val()), sell_date:safe($('#inpSaleDate').val())},
      condition_info: {is_regulated_area:regulatedStr, house_count:houseStr, residence_period:resideStr}
    },
    calculated_data:   calcData,
    unstructured_data: {user_context: freeText||''}
  };
}

/* ================================================================
   callAPI: WordPress AJAX 프록시 경유
   브라우저 → admin-ajax.php(eeho_api_proxy) → Cloud Run
   ================================================================ */
function callAPI(payload, endpoint){
  endpoint = endpoint||'/generate-questions';
  var ajaxUrl = (typeof eehoTax!=='undefined'&&eehoTax.ajax)?eehoTax.ajax:'/wp-admin/admin-ajax.php';
  var nonce   = (typeof eehoTax!=='undefined'&&eehoTax.nonce)?eehoTax.nonce:'';

  console.log('[EEHO] → WP Proxy ('+endpoint+'):', JSON.stringify(payload,null,2));

  return new Promise(function(resolve,reject){
    $.ajax({
      url:    ajaxUrl,
      method: 'POST',
      data:{
        action:   'eeho_api_proxy',
        nonce:    nonce,
        payload:  JSON.stringify(payload),
        endpoint: endpoint
      },
      timeout: 90000,
      success: function(res){
        console.log('[EEHO] ← Proxy 응답:', res);
        if(res&&res.success===false){reject('프록시 오류: '+(res.data||'알 수 없는 오류'));return;}
        var inner  = (res&&res.success&&res.data)?res.data:res;
        var parsed = safeParse(inner);
        if(parsed)resolve(parsed);
        else reject('응답 파싱 실패');
      },
      error: function(xhr,status,err){
        console.error('[EEHO] Proxy Error:',status,err,xhr.responseText);
        if(xhr.responseText){var p=safeParse(xhr.responseText);if(p&&p.status){resolve(p);return;}}
        reject('서버 연결 실패 ('+(xhr.status||status)+')');
      }
    });
  });
}

/* ================================================================
   PROGRESS BAR
   ================================================================ */
function updateProgress(step){
  A.find('.eh-pg-item').each(function(){
    var s=+$(this).data('s');
    $(this).removeClass('active done');
    if(s<step)$(this).addClass('done');
    else if(s===step)$(this).addClass('active');
  });
  A.find('.eh-pg-line').each(function(){$(this).toggleClass('done',+$(this).data('a')<step);});
}

/* ================================================================
   NAVIGATION
   ================================================================ */
var AI_PHASES = ['#aiTextPhase','#aiChecklistPhase','#aiConfirmPhase','#aiSupplementPhase','#aiLoading','#aiFinal'];

function goStep(n){
  currentStep=n;
  A.find('.eh-step').removeClass('active');
  A.find('.eh-step[data-step="'+n+'"]').addClass('active');
  hideAI(); updateProgress(n); scrollTop();
}
function hideAI(){
  $(AI_PHASES.join(',')).removeClass('active');
}
function showAI(id){
  A.find('.eh-step').removeClass('active');
  hideAI(); $(id).addClass('active'); scrollTop();
}
function showLoading(){showAI('#aiLoading');}
function scrollTop(){$('html,body').animate({scrollTop:A.offset().top-20},300);}

/* ================================================================
   STEP 1
   ================================================================ */
A.on('click','.eh-type-card',function(){
  A.find('.eh-type-card').removeClass('active');
  $(this).addClass('active');
  formData.taxType=$(this).data('type');
});
$('#toStep2').on('click',function(){configStep2();goStep(2);});

/* ================================================================
   STEP 2
   ================================================================ */
function configStep2(){
  var t=formData.taxType;
  var labels={cgt:'양도가액',acq:'취득가액',prop:'공시가격',gift:'증여가액'};
  $('#amountLabel').text(labels[t]||'금액');
  if(t==='cgt'){$('#assetTabs').show();$('#tabStock2').removeClass('dis').show();$('#tabCash2').addClass('dis');$('#s2Title').text('자산과 금액을 입력하세요');}
  else if(t==='acq'){$('#assetTabs').hide();formData.assetType='re';$('#s2Title').text('취득 대상과 금액을 입력하세요');}
  else if(t==='prop'){$('#assetTabs').hide();formData.assetType='re';$('#s2Title').text('보유 부동산의 공시가격을 입력하세요');}
  else if(t==='gift'){$('#assetTabs').show();$('#tabStock2,#tabCash2').removeClass('dis').show();$('#s2Title').text('증여 재산과 금액을 입력하세요');}
  updateReTypes();
}
function updateReTypes(){
  var isRe=formData.assetType==='re',isSt=formData.assetType==='stock';
  $('#reTypeDropWrap').toggle(isRe);$('#reAddressWrap').toggle(isRe);
  $('#stockNameWrap').toggleClass('eh-hd',!isSt);
}
A.on('click','.eh-asset-tab',function(){
  if($(this).hasClass('dis'))return;
  $(this).closest('.eh-asset-tabs').find('.eh-asset-tab').removeClass('active');
  $(this).addClass('active');formData.assetType=$(this).data('v');updateReTypes();
});
$('#reTypeSelect').on('change',function(){formData.reSubType=$(this).val();});

function numToKorean(n){
  if(!n||n<=0)return'';
  var units=['','만','억','조'],parts=[],idx=0;
  while(n>0){
    var chunk=n%10000;
    if(chunk>0){
      var s='';
      var chun=Math.floor(chunk/1000);if(chun)s+=chun+'천';
      var baek=Math.floor((chunk%1000)/100);if(baek)s+=baek+'백';
      var sip=Math.floor((chunk%100)/10);if(sip)s+=sip+'십';
      var il=chunk%10;if(il)s+=il;
      parts.unshift(s+units[idx]);
    }
    n=Math.floor(n/10000);idx++;
  }
  return parts.join(' ')+'원';
}

$('#inpAmount').on('input',function(){
  var v=raw($(this).val()),n=parseInt(v)||0;
  $(this).val(n>0?fmt(n):'');formData.amount=n;$('#amountKr').text(numToKorean(n));
});
A.on('click','.eh-quick',function(){
  var a=+$(this).data('a');
  if(a===0)formData.amount=0;else formData.amount+=a;
  $('#inpAmount').val(formData.amount>0?fmt(formData.amount):'').trigger('input');
});
$('#inpAcqPrice').on('input',function(){
  var v=raw($(this).val()),n=parseInt(v)||0;
  $(this).val(n>0?fmt(n):'');formData.acqPrice=n;$('#acqPriceKr').text(numToKorean(n));
});
$('#inpAddress').on('input',function(){formData.address=$(this).val();});
$('#inpStockName').on('input',function(){formData.stockName=$(this).val();});
$('#toStep3').on('click',function(){
  if(formData.amount<=0){alert('금액을 입력해주세요.');return;}
  if(formData.assetType==='re'){
    var addr=$('#inpAddress').val().trim();
    if(!addr){alert('주소를 입력해주세요.');$('#inpAddress').focus();return;}
  }
  configStep3();goStep(3);
});
$('#backStep1').on('click',function(){goStep(1);});

/* ================================================================
   STEP 3
   ================================================================ */
function configStep3(){
  var t=formData.taxType;
  if(t==='cgt'){$('#f3Dates,#f3AcqPrice,#f3Reg,#f3Houses,#f3Reside,#f3Area').show();}
  else if(t==='acq'){$('#f3Dates,#f3AcqPrice,#f3Reside').hide();$('#f3Reg,#f3Houses,#f3Area').show();}
  else if(t==='prop'){$('#f3Dates,#f3AcqPrice,#f3Reg,#f3Reside,#f3Area').hide();$('#f3Houses').show();}
  else if(t==='gift'){$('#f3Dates,#f3AcqPrice,#f3Houses,#f3Reside,#f3Area').hide();$('#f3Reg').show();}
}
A.on('click','.eh-chips .eh-chip',function(){
  var p=$(this).closest('.eh-chips');
  p.find('.eh-chip').removeClass('active');$(this).addClass('active');
  var g=p.data('g'),v=$(this).data('v');
  if(g==='houses')formData.houses=v;
  else if(g==='reside')formData.reside=v;
  else if(g==='area')formData.area=v;
  else if(g==='regulated')formData.regulated=v;
});
$('#selRegulated').on('change',function(){formData.regulated=$(this).val();});
$('#selHouses').on('change',function(){formData.houses=$(this).val();});
$('#selReside').on('change',function(){formData.reside=$(this).val();});
$('#selArea').on('change',function(){formData.area=$(this).val();});
$('#inpAcqDate').on('change',function(){formData.acqDate=$(this).val();});
$('#inpSaleDate').on('change',function(){formData.saleDate=$(this).val();});
$('#regHelpBtn').on('click',function(e){e.preventDefault();$('#regHelpPopup').toggleClass('eh-hd');});
$('#regHelpClose').on('click',function(){$('#regHelpPopup').addClass('eh-hd');});
$('#backStep2').on('click',function(){goStep(2);});

/* ================================================================
   STEP 3 → 4: 간이 계산
   ================================================================ */
$('#doCalc').on('click',function(){
  if(formData.taxType==='cgt'){
    var acq=$('#inpAcqDate').val(),sale=$('#inpSaleDate').val();
    if(!acq){alert('취득일을 입력해주세요.');$('#inpAcqDate').focus();return;}
    if(!sale){alert('양도일을 입력해주세요.');$('#inpSaleDate').focus();return;}
  }
  var result=calculateTax(formData);
  currentEstimatedTax=result.total;
  lastCalcResult=result;
  renderResult(result);goStep(4);
});

function calculateTax(fd){
  var amt=fd.amount||0,t=fd.taxType,items=[],total=0;
  if(t==='cgt'){
    var gain=Math.round(amt*0.3),tax=Math.round(gain*0.24),loc=Math.round(tax*0.1);
    items=[{name:'양도소득세',amount:tax},{name:'지방소득세',amount:loc}];
    if(fd.houses!=='1'){var s=Math.round(tax*0.2);items.push({name:'중과가산',amount:s});total=tax+loc+s;}
    else total=tax+loc;
  }else if(t==='acq'){
    var r=fd.houses==='1'?0.01:(fd.houses==='2'?0.08:0.12);
    if(fd.regulated==='yes'&&fd.houses!=='1')r+=0.02;
    var a=Math.round(amt*r),e=Math.round(a*0.1),ru=Math.round(a*0.02);
    items=[{name:'취득세',amount:a},{name:'지방교육세',amount:e},{name:'농어촌특별세',amount:ru}];total=a+e+ru;
  }else if(t==='prop'){
    var b=Math.max(0,amt-1200000000)*0.6,p=Math.round(b*0.005),ep=Math.round(p*0.2);
    items=[{name:'재산세',amount:Math.round(amt*0.001)},{name:'종합부동산세',amount:p},{name:'지방교육세',amount:ep}];
    total=Math.round(amt*0.001)+p+ep;
  }else{
    var tx=Math.max(0,amt-50000000),g=Math.round(tx*0.2),d=-Math.round(g*0.03),eg=Math.round(g*0.1);
    items=[{name:'증여세',amount:g},{name:'신고세액공제',amount:d},{name:'지방교육세',amount:eg}];total=g+d+eg;
  }
  if(total<0)total=0;return{items:items,total:total};
}
function renderResult(data){
  $('#resultTotal').text('₩'+fmt(data.total));
  var h='';
  data.items.forEach(function(it){var pf=it.amount<0?'-₩':'₩';h+='<div class="eh-ri"><span>'+it.name+'</span><span>'+pf+fmt(Math.abs(it.amount))+'</span></div>';});
  $('#resultItems').html(h);
}
$('#backStep3').on('click',function(){goStep(3);});
$('#resetAll').on('click',function(){
  formData={taxType:'cgt',assetType:'re',reSubType:'apt',amount:0,address:'',stockName:'',regulated:'no',houses:'1',saleDate:'',acqDate:'',reside:'2',area:'under85',acqPrice:0};
  aiState={payload:{},userText:'',callCount:0,sessionId:'',applicableLaw:'',lawSummary:'',checklistAnswers:[],factSummary:'',supplementText:'',isSecondRound:false};
  currentEstimatedTax=0;
  $('#inpAmount,#inpAcqPrice,#inpAddress,#inpStockName').val('');
  $('#inpAcqDate,#inpSaleDate').val('');
  $('#aiTextInput').val('');$('#aiTxtCnt').text('0');
  A.find('.eh-type-card').removeClass('active').first().addClass('active');
  A.find('.eh-asset-tab').removeClass('active').first().addClass('active');
  $('#reTypeSelect').val('apt');$('#selRegulated').val('no');$('#selHouses').val('1');$('#selReside').val('2');$('#selArea').val('under85');
  $('#amountKr,#acqPriceKr').text('');
  $('#regHelpPopup').addClass('eh-hd');goStep(1);
});

/* ================================================================
   ===  AI FLOW  ===
   [텍스트 입력] → /generate-questions → [1차 체크리스트]
     → /confirm → [사실관계 + 제출하기/보완하기]
       → 제출하기 → /report → [최종 리포트]
       → 보완하기 → [보완 텍스트 입력] → /generate-questions → [2차 체크리스트]
         → /confirm → [사실관계 (보완하기 없음)] → /report → [최종 리포트]
   ================================================================ */

$('#startAI').on('click',function(){resetAIState();showAI('#aiTextPhase');});
$('#aiBackToResult').on('click',function(){resetAIState();goStep(4);});
$('#aiTextInput').on('input',function(){$('#aiTxtCnt').text($(this).val().length);});

/* ================================================================
   Phase 1: [분석 요청 →] → /generate-questions → 체크리스트 렌더
   ================================================================ */
$('#aiSendText').on('click',function(){
  var text=$('#aiTextInput').val().trim();
  if(!text){alert('상황을 입력해주세요.');return;}
  aiState.userText  = text;
  aiState.callCount = 0;
  aiState.sessionId = generateSessionId();
  aiState.payload   = buildPayload(text);

  console.log('[EEHO] ★ Payload:', JSON.stringify(aiState.payload,null,2));
  showLoading();

  callAPI(aiState.payload, '/generate-questions')
    .then(function(data){
      if(!data||!data.status)throw new Error('status 필드 없음');
      if(data.status==='checklist'){renderChecklist(data);return;}
      // 만약 바로 success가 오면 리포트 렌더
      if(data.status==='success'){renderFinalReport(data);return;}
      throw new Error('알 수 없는 status: '+data.status);
    })
    .catch(handleError);
});

/* ================================================================
   체크리스트 렌더링
   ================================================================ */
function renderChecklist(data){
  aiState.applicableLaw = data.applicable_law || '';
  aiState.lawSummary    = data.law_summary    || '';

  $('#checklistLawName').text(data.applicable_law || '');
  $('#checklistLawSummary').text(data.law_summary || '');

  var questions = data.questions || [];
  var $wrap = $('#checklistQuestions').empty();

  questions.forEach(function(q){
    var html = '<div class="eh-cl-item" data-id="'+esc(q.id)+'">'
      + '<div class="eh-cl-category">'+esc(q.category)+'</div>'
      + '<div class="eh-cl-question">'+esc(q.question)+'</div>'
      + '<div class="eh-cl-btns">'
      + '<button class="eh-cl-btn" data-val="예">✓ 예</button>'
      + '<button class="eh-cl-btn" data-val="아니오">✗ 아니오</button>'
      + '<button class="eh-cl-btn" data-val="모름">? 모름</button>'
      + '</div>'
      + '<input type="hidden" class="eh-cl-answer" data-id="'+esc(q.id)+'" data-question="'+esc(q.question)+'" value="">'
      + '</div>';
    $wrap.append(html);
  });

  showAI('#aiChecklistPhase');
}

// 체크리스트 버튼 토글
A.on('click','.eh-cl-btn',function(){
  var $item=$(this).closest('.eh-cl-item');
  $item.find('.eh-cl-btn').removeClass('selected');
  $(this).addClass('selected');
  $item.find('.eh-cl-answer').val($(this).data('val'));
  $item.removeClass('eh-cl-error');
});

/* ================================================================
   Phase 2: [체크리스트 제출] → /confirm → 사실관계 렌더
   ================================================================ */
$('#checklistSubmit').on('click',function(){
  var answers = [];
  var allAnswered = true;

  $('.eh-cl-item').each(function(){
    var id       = $(this).data('id');
    var question = $(this).find('.eh-cl-answer').data('question');
    var answer   = $(this).find('.eh-cl-answer').val();
    if(!answer){allAnswered=false;$(this).addClass('eh-cl-error');}
    else{$(this).removeClass('eh-cl-error');answers.push({id:id,question:question,answer:answer});}
  });

  if(!allAnswered){alert('모든 항목에 답변해주세요.');return;}

  aiState.checklistAnswers = answers;

  // payload에 체크리스트 답변 + 조문 정보 추가
  aiState.payload.additional_data = {
    checklist_answers: answers,
    applicable_law:    aiState.applicableLaw,
    law_summary:       aiState.lawSummary
  };

  showLoading();

  callAPI(aiState.payload, '/confirm')
    .then(function(data){
      if(!data||!data.status)throw new Error('status 필드 없음');
      if(data.status==='confirm'){renderConfirm(data);return;}
      if(data.status==='success'){renderFinalReport(data);return;}
      throw new Error('알 수 없는 status: '+data.status);
    })
    .catch(handleError);
});

/* ================================================================
   사실관계 정리본 렌더링
   ================================================================ */
function renderConfirm(data){
  aiState.factSummary = data.fact_summary || '';

  // 사실관계 요약
  $('#confirmFactSummary').text(data.fact_summary || '');

  // 요건 체크 테이블
  var reqs = data.requirement_check || [];
  var $reqWrap = $('#confirmRequirements').empty();
  reqs.forEach(function(r){
    var cls = r.충족여부==='충족' ? 'pass' : (r.충족여부==='미충족' ? 'fail' : 'review');
    var icon = r.충족여부==='충족' ? '✓' : (r.충족여부==='미충족' ? '✗' : '△');
    $reqWrap.append(
      '<div class="eh-req-row eh-req-'+cls+'">'
      + '<span class="eh-req-icon">'+icon+'</span>'
      + '<div class="eh-req-info"><strong>'+esc(r.요건||'')+'</strong><span>'+esc(r.근거||'')+'</span></div>'
      + '<span class="eh-req-status">'+esc(r.충족여부||'')+'</span>'
      + '</div>'
    );
  });

  // 세액 비교
  var tax = data.tax_impact || {};
  $('#confirmTaxBefore').text(tax.before  || '-');
  $('#confirmTaxAfter').text(tax.after_pass || '-');
  $('#confirmTaxSaving').text(tax.saving   || '-');

  // 비과세 가능성
  var conf = data.confidence || '';
  var confLabel = conf==='높음' ? '비과세 가능성 높음' : (conf==='낮음' ? '비과세 가능성 낮음' : '추가 검토 필요');
  var confCls = conf==='높음' ? 'high' : (conf==='낮음' ? 'low' : 'mid');
  $('#confirmConfidence').text(confLabel).attr('class','eh-conf-badge eh-conf-'+confCls);

  // 2차 라운드면 보완하기 버튼 숨김
  if(aiState.isSecondRound){
    $('#supplementBtn').hide();
    $('#confirmGuideText').hide();
  } else {
    $('#supplementBtn').show();
    $('#confirmGuideText').show();
  }
  showAI('#aiConfirmPhase');
}

/* ================================================================
   Phase 3a: [제출하기] → /report
   ================================================================ */
$('#submitFinal').on('click',function(){
  // fact_summary를 additional_data에 추가
  if(!aiState.payload.additional_data)aiState.payload.additional_data={};
  aiState.payload.additional_data.fact_summary = aiState.factSummary;

  showLoading();
  callAPI(aiState.payload, '/report')
    .then(function(data){
      if(!data||!data.status)throw new Error('status 필드 없음');
      renderFinalReport(data);
    })
    .catch(handleError);
});

/* ================================================================
   Phase 3b: [보완하기] → 보완 텍스트 입력 화면
   ================================================================ */
$('#supplementBtn').on('click',function(){
  showAI('#aiSupplementPhase');
});
$('#backToConfirm').on('click',function(){
  showAI('#aiConfirmPhase');
});
$('#supplementInput').on('input',function(){
  $('#supplementCnt').text($(this).val().length);
});

/* ================================================================
   Phase 3b-2: [보완 제출] → /generate-questions 재호출 → 2차 체크리스트
   ================================================================ */
$('#supplementSubmit').on('click',function(){
  var text=$('#supplementInput').val().trim();
  if(!text){alert('추가 상황을 입력해주세요.');return;}
  aiState.supplementText = text;
  aiState.isSecondRound  = true;

  // RLHF 저장 (비동기)
  saveRlhfData(text);

  // 보완 텍스트를 payload에 누적
  if(!aiState.payload.additional_data)aiState.payload.additional_data={};
  aiState.payload.additional_data.supplement_text = text;
  aiState.payload.additional_data.fact_summary    = aiState.factSummary;
  aiState.payload.additional_data.is_second_round = true;

  showLoading();
  // 보완 텍스트 포함해서 /confirm 직접 호출 (체크리스트 없이 요건 재검토)
  callAPI(aiState.payload, '/confirm')
    .then(function(data){
      if(!data||!data.status)throw new Error('status 필드 없음');
      if(data.status==='checklist'){renderChecklist(data);return;}
      // 추가 질문 없이 바로 confirm/success로 올 수도 있음
      if(data.status==='confirm'){renderConfirm(data);return;}
      if(data.status==='success'){renderFinalReport(data);return;}
      throw new Error('알 수 없는 status: '+data.status);
    })
    .catch(handleError);
});

/* ================================================================
   RLHF 데이터 저장 (eeho_save_rlhf WP AJAX)
   ================================================================ */
function saveRlhfData(supplementText){
  var ajaxUrl = (typeof eehoTax!=='undefined'&&eehoTax.ajax)?eehoTax.ajax:'/wp-admin/admin-ajax.php';
  var nonce   = (typeof eehoTax!=='undefined'&&eehoTax.nonce)?eehoTax.nonce:'';

  $.ajax({
    url:    ajaxUrl,
    method: 'POST',
    data:{
      action:           'eeho_save_rlhf',
      nonce:            nonce,
      session_id:       aiState.sessionId,
      original_context: aiState.userText,
      supplement_text:  supplementText,
      fact_summary:     aiState.factSummary,
      checklist_answers:JSON.stringify(aiState.checklistAnswers)
    }
  }).done(function(res){
    console.log('[EEHO] RLHF 저장 완료:', res);
  }).fail(function(err){
    console.warn('[EEHO] RLHF 저장 실패 (무시):', err);
  });
}

/* ================================================================
   최종 리포트 렌더링
   ================================================================ */
function renderFinalReport(data){
  var isPASS   = data.result_type==='PASS';
  var isREVIEW = data.result_type==='REVIEW';

  // ── 배지 ──────────────────────────────────────────────────────
  var $badge=$('#finalResultBadge');
  $badge.removeClass('eh-badge-pass eh-badge-fail eh-badge-review');
  if(isPASS){
    $badge.addClass('eh-badge-pass');
    $('#finalBadgeIcon').text('✓');
    $('#finalBadgeLabel').text('비과세 특례 적용 가능');
    $('#finalBadgeType').text('PASS');
  }else if(isREVIEW){
    $badge.addClass('eh-badge-review');
    $('#finalBadgeIcon').text('△');
    $('#finalBadgeLabel').text('전문가 추가 검토 필요');
    $('#finalBadgeType').text('REVIEW');
  }else{
    $badge.addClass('eh-badge-fail');
    $('#finalBadgeIcon').text('✗');
    $('#finalBadgeLabel').text('비과세 요건 미충족');
    $('#finalBadgeType').text('FAIL');
  }

  // ── 세액 비교 (핵심 변경) ────────────────────────────────────
  var baseTax   = data.base_tax          || currentEstimatedTax || 0;
  var afterTax  = (data.tax_after_applied != null) ? data.tax_after_applied : baseTax;
  var confPct   = (typeof data.confidence_pct === 'number') ? data.confidence_pct : null;

  // 적용 가능성 색상
  var pctColor = '#888';
  if(confPct !== null){
    if(confPct >= 70)      pctColor = 'var(--teal)';
    else if(confPct >= 40) pctColor = '#e08800';
    else                   pctColor = 'var(--ember)';
  }

  // "AI 적용 전" — 현재 예상 세액
  $('#finalBefore').text('₩'+fmt(baseTax));

  // "AI 적용 후" — 조문 적용 시 세액 + 적용 가능성 배지
  var afterHtml = '<span style="font-size:1.4em;font-weight:700;color:var(--teal)">₩'+fmt(afterTax)+'</span>';
  if(confPct !== null){
    afterHtml +=
      '<span style="'
      +'display:inline-block;margin-left:10px;padding:3px 10px;'
      +'border-radius:20px;font-size:12px;font-weight:700;'
      +'background:'+pctColor+';color:#fff;vertical-align:middle;'
      +'white-space:nowrap'
      +'">적용 가능성 '+confPct+'%</span>';
  }
  var $afterEl = $('#finalAfter');
  // finalAfter가 span이면 부모 div에 html 삽입
  if($afterEl.length){
    $afterEl.html(afterHtml);
  }

  // 절세 효과 문구 (금액 차이)
  var saving = baseTax - afterTax;
  if(saving > 0 && confPct !== null){
    var savingTxt = '특례 적용 시 최대 ₩'+fmt(saving)+' 절세 가능'
      +(confPct < 70 ? ' — 세무 전문가 확인 권장' : '');
    $('#finalTaxSaving').text(savingTxt).show();
  } else {
    $('#finalTaxSaving').hide();
  }

  // ── 키워드 강조 함수 ──────────────────────────────────────────
  function highlight(txt){
    return esc(txt)
      .replace(/(비과세|절세|감면|공제|특례|요건 충족|적용 가능)/g,
               '<strong style="color:var(--teal);text-decoration:underline">$1</strong>')
      .replace(/(미충족|적용 불가|주의|위험|추징)/g,
               '<strong style="color:var(--red,#e53935);text-decoration:underline">$1</strong>')
      .replace(/([0-9,]+원)/g,'<strong>$1</strong>')
      .replace(/(3년|2년|1년|[0-9]+개월)/g,'<u><strong>$1</strong></u>');
  }

  // ── 텍스트 → 문장 단위 불릿 변환 ─────────────────────────────
  function toBullets(raw, max){
    if(!raw) return [];
    var clean = raw
      .replace(/```[\s\S]*?```/g,'')
      .replace(/【[^】]+】/g,'')
      .replace(/\\n/g,' ')
      .trim();
    var sents = clean.split(/(?<=[.!?。])\s+|(?<=합니다)\s+|(?<=습니다)\s+|(?<=됩니다)\s+/)
      .map(function(s){ return s.trim().replace(/^[-•·✓·]\s*/,''); })
      .filter(function(s){ return s.length > 8; });
    var seen={}, result=[];
    sents.forEach(function(s){
      var key=s.slice(0,15);
      if(!seen[key]){ seen[key]=1; result.push(s); }
    });
    return result.slice(0, max||3);
  }

  // ── 판단 근거 ─────────────────────────────────────────────────
  var detailBullets = toBullets(data.details||'', 3);
  var detailHtml='';
  if(detailBullets.length){
    detailHtml='<ul style="list-style:none;padding:0;margin:0">';
    detailBullets.forEach(function(b){
      detailHtml+='<li style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--gray-l)">'
        +'<span style="color:var(--teal);font-weight:700;flex-shrink:0;margin-top:2px">✓</span>'
        +'<span style="font-size:14px;line-height:1.7;color:var(--text)">'+highlight(b)+'</span>'
        +'</li>';
    });
    detailHtml+='</ul>';
  }
  $('#finalDetails').html(detailHtml||'<p style="font-size:14px;color:var(--text-m);padding:8px 0">세무 전문가 상담 시 안내드립니다.</p>');

  // ── 법령 배지 ─────────────────────────────────────────────────
  var lawText    = data.applicable_law || aiState.applicableLaw || '';
  var lawSummary = data.law_summary    || aiState.lawSummary    || '';
  if(lawText){    $('#finalAppliedLaw').text(lawText);       $('#finalLawWrap').show(); }
  if(lawSummary){ $('#finalLawSummary').text(lawSummary);    $('#finalLawSummaryWrap').show(); }

  // ── 리스크 (미충족 요건 강조) ─────────────────────────────────
  var riskBullets = toBullets(data.risk_warning||'', 3);
  var riskHtml='';
  if(riskBullets.length){
    riskHtml='<ul style="list-style:none;padding:0;margin:0">';
    riskBullets.forEach(function(b){
      riskHtml+='<li style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid rgba(249,92,50,.15)">'
        +'<span style="color:var(--ember);font-weight:700;flex-shrink:0;margin-top:2px">△</span>'
        +'<span style="font-size:14px;line-height:1.7;color:var(--text)">'+highlight(b)+'</span>'
        +'</li>';
    });
    riskHtml+='</ul>';
  }
  // REVIEW / FAIL 시 적용 가능성 안내 문구 추가
  if(!isPASS && confPct !== null){
    var pctNote='<p style="margin:12px 0 0;padding:10px 14px;border-radius:8px;'
      +'background:rgba(249,92,50,.08);font-size:13px;color:var(--ember);font-weight:600">'
      +'⚠ 현재 확인된 정보 기준 적용 가능성은 <strong>'+confPct+'%</strong>입니다. '
      +'세무 전문가 상담으로 나머지 요건을 확인하면 실제 적용 가능성이 높아질 수 있습니다.</p>';
    riskHtml += pctNote;
  }
  $('#finalRisks').html(riskHtml||'<p style="font-size:14px;color:var(--text-m);padding:8px 0">현재 확인된 리스크가 없습니다.</p>');

  showAI('#aiFinal');
}

/* ================================================================
   공통 에러 핸들러
   ================================================================ */
function handleError(err){
  console.error('[EEHO] 오류:', err);
  alert('AI 분석 중 오류가 발생했습니다.\n\n'+String(err)+'\n\n잠시 후 다시 시도해주세요.');
  showAI('#aiTextPhase');
}

function resetAIState(){
  aiState={payload:{},userText:'',callCount:0,sessionId:'',applicableLaw:'',lawSummary:'',checklistAnswers:[],factSummary:'',supplementText:'',isSecondRound:false};
  $('#aiTextInput').val('');$('#aiTxtCnt').text('0');
  $('#supplementInput').val('');$('#supplementCnt').text('0');
}
$('#backToResult').on('click',function(){ resetAIState(); goStep(4); });
$('#backToResultFromConfirm').on('click',function(){ resetAIState(); goStep(4); });

/* ================================================================
   INIT
   ================================================================ */
updateProgress(1);
$('#ehLdYear').text(new Date().getFullYear());

})(jQuery);
