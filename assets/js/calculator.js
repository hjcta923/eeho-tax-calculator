(function($){
'use strict';
var A=$('#eeho-app');if(!A.length)return;

/* ================================================================
   API CONFIG — WordPress AJAX 프록시 경유 (CORS 우회)
   ================================================================ */
var EEHO_API_URL = "https://eeho-ai-api-1070315020839.asia-northeast3.run.app";

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
  // 2차: 보완 내용 포함해서 /generate-questions 재호출 → 추가 체크리스트
  callAPI(aiState.payload, '/generate-questions')
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
  var isPASS    = data.result_type==='PASS';
  var isREVIEW  = data.result_type==='REVIEW';
  var detailText= data.details      || '';
  var riskText  = data.risk_warning || '';
  var lawText   = data.applicable_law || aiState.applicableLaw || '';

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

  // 절세 효과 (상단)
  $('#finalBefore').text('₩'+fmt(currentEstimatedTax));
  $('#finalAfter').text(isPASS?'₩0 (비과세)':'₩'+fmt(currentEstimatedTax));

  // 판단 근거: 불릿 포인트로 렌더링
  var detailHtml = '';
  if(detailText){
    // JSON 코드블럭 제거
    var cleanDetail = detailText.replace(/```[\s\S]*?```/g,'').replace(/^[\s\S]*?"details"\s*:\s*"/,'').replace(/"[\s\S]*/,'').trim();
    if(!cleanDetail) cleanDetail = detailText;
    // 【판단】【근거】【절세효과】【판례시사점】 블럭 파싱해서 불릿으로
    var bullets = [];
    var판단 = cleanDetail.match(/【판단[^】]*】([^【]*)/);
    var근거 = cleanDetail.match(/【근거[^】]*】([^【]*)/);
    if(판단) bullets.push(판단[1].trim());
    if(근거){
      var 근거Lines = 근거[1].trim().split(/\n+/).filter(function(l){return l.trim().length>5;});
      근거Lines.slice(0,2).forEach(function(l){ bullets.push(l.trim().replace(/^[-•·]\s*/,'')); });
    }
    if(!bullets.length){
      // 구조가 없으면 줄 단위로 파싱
      cleanDetail.split(/\n+/).filter(function(l){return l.trim().length>10;}).slice(0,4).forEach(function(l){
        bullets.push(l.trim().replace(/^[-•·【】]\s*/,''));
      });
    }
    if(bullets.length){
      detailHtml = '<ul style="list-style:none;padding:0;margin:0">';
      bullets.forEach(function(b){
        if(b.length>5) detailHtml += '<li style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-l)"><span style="color:var(--teal);font-size:16px;flex-shrink:0;margin-top:1px">✓</span><span style="font-size:14px;line-height:1.6;color:var(--text)">'+esc(b)+'</span></li>';
      });
      detailHtml += '</ul>';
    }
  }
  $('#finalDetails').html(detailHtml || '<li style="padding:8px 0;font-size:14px;color:var(--text-m)">세무 전문가 상담 시 상세 안내드립니다.</li>');

  // 법령 배지 + 요약 (판단근거 아래)
  var lawSummary = data.law_summary || aiState.lawSummary || '';
  if(lawText){
    $('#finalAppliedLaw').text(lawText);
    $('#finalLawWrap').show();
  }
  if(lawSummary){
    $('#finalLawSummary').text(lawSummary);
    $('#finalLawSummaryWrap').show();
  }
  $('#finalRisks').html(riskText?'<div class="eh-risk-item">'+esc(riskText)+'</div>':'<div class="eh-risk-item eh-risk-none">현재 확인된 리스크가 없습니다.</div>');

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
