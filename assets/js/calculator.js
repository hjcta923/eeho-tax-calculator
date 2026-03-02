(function($){
'use strict';
var A=$('#eeho-app');if(!A.length)return;

/* ================================================================
   API CONFIG
   ================================================================ */
var EEHO_API_URL = "https://eeho-ai-tax-calculator-1070315020839.asia-northeast3.run.app";

/* ================================================================
   STATE (프론트엔드 내부 상태 — UI 제어용)
   ================================================================ */
var formData = {
  taxType: 'cgt', assetType: 're', reSubType: 'apt',
  amount: 0, address: '', stockName: '',
  regulated: 'no', houses: '1',
  saleDate: '', acqDate: '',
  reside: '2', area: 'under85', acqPrice: 0,
};

var aiState = {
  payload: {},        // ★ 새 명세서 기반 계층적 JSON (API 전송용)
  userText: '',       // 사용자 자연어 입력
  callCount: 0,       // API 호출 횟수 (progress bar용)
  sessionId: '',      // 세션 ID
};

var currentStep = 1;
var currentEstimatedTax = 0;
var lastCalcResult = { items: [], total: 0 }; // ★ 세액 항목별 내역 보관

/* ================================================================
   세션 ID 생성기
   ================================================================ */
function generateSessionId() {
  return 'usr_' + Date.now() + '_session_' + String(Math.floor(Math.random()*100)).padStart(2,'0');
}

/* ================================================================
   표준 변수 사전 — 새 백엔드 명세서 매핑 참조표
   ================================================================
   Payload Key                         ← Frontend Source
   ──────────────────────────────────   ──────────────────────────
   session_id                          ← generateSessionId()
   tax_category.type                   ← MAP_TAX_CATEGORY[formData.taxType]
   structured_data.asset_info.asset_type   ← MAP_TYPE_ASSET[formData.reSubType]
   structured_data.asset_info.address      ← #inpAddress
   structured_data.asset_info.area_size    ← formData.area → 한글
   structured_data.price_info.buy_price    ← formData.acqPrice
   structured_data.price_info.sell_price   ← formData.amount
   structured_data.date_info.buy_date      ← #inpAcqDate
   structured_data.date_info.sell_date     ← #inpSaleDate
   structured_data.condition_info.is_regulated_area  ← 여/부/모름
   structured_data.condition_info.house_count        ← 1주택~4주택 이상/모름
   structured_data.condition_info.residence_period   ← 없음/2년+/5년+/10년+/모름
   calculated_data.estimated_total_tax     ← lastCalcResult.total
   calculated_data.estimated_*_tax         ← lastCalcResult.items[]
   unstructured_data.user_context          ← textarea 자유 입력
   additional_data.*                       ← need_more_info 추가질문 응답 (2차+)
   ================================================================ */

/* --- 내부코드 → 한글 라벨 변환 맵 --- */
var MAP_TAX_CATEGORY = {
  'cgt': '양도소득세', 'acq': '취득세', 'prop': '재산세/종합부동산세', 'gift': '상속·증여'
};
var MAP_CATEGORY_ASSET = {
  're': '부동산', 'stock': '주식', 'cash': '현금'
};
var MAP_TYPE_ASSET = {
  'apt': '아파트', 'villa': '빌라', 'officetel': '오피스텔',
  'commercial': '상가', 'building': '건물', 'land': '토지', 'rights': '입주권/분양권'
};
var MAP_HOUSES = { '1':1, '2':2, '3':3, 'multi':4, 'unknown':'모름' };
var MAP_RESIDE = {
  '0': '없음', '2': '2년+', '5': '5년+', '10': '10년+', 'unknown': '모름'
};
var MAP_AREA = {
  'under85': '85㎡ 이하', 'over85': '85㎡ 초과', 'unknown': '모름'
};
var MAP_REGULATED = {
  'yes': true, 'no': false, 'unknown': '모름'
};

/* ================================================================
   FIELD_LABELS / FIELD_TYPES: need_more_info 동적 폼 렌더링용
   백엔드가 missing_variables로 보내는 키에 대응
   ================================================================ */
var FIELD_LABELS = {
  'tax_category':          '세목',
  'category_asset':        '자산종류',
  'addr_property':         '주소',
  'type_asset':            '자산유형',
  'amt_transfer':          '양도가액',
  'dt_acq':                '취득일',
  'dt_transfer':           '양도일',
  'amt_acq':               '취득가액',
  'is_regulated_trans':    '조정대상지역 여부',
  'num_house_at_sell':     '양도 시점 보유주택 수',
  'type_period_residence': '실거주 기간',
  'type_area_exclusive':   '전용면적',
  'amt_expected_tax':      '예상세액',
  'dt_acq_prev':           '종전주택 취득일',
};

var FIELD_TYPES = {
  'tax_category':          'text',
  'category_asset':        'text',
  'addr_property':         'text',
  'type_asset':            'text',
  'amt_transfer':          'number',
  'dt_acq':                'date',
  'dt_transfer':           'date',
  'amt_acq':               'number',
  'is_regulated_trans':    'toggle',
  'num_house_at_sell':     'number',
  'type_period_residence': 'select',
  'type_area_exclusive':   'select',
  'amt_expected_tax':      'number',
  'dt_acq_prev':           'date',
};

/* select 타입의 선택지 정의 */
var FIELD_OPTIONS = {
  'type_period_residence': ['없음', '2년+', '5년+', '10년+', '모름'],
  'type_area_exclusive':   ['85㎡ 이하', '85㎡ 초과', '모름'],
};

/* ================================================================
   UTILS
   ================================================================ */
function fmt(n){return Number(n).toLocaleString('ko-KR')}
function raw(s){return String(s).replace(/[^0-9]/g,'')||'0'}
function esc(s){return $('<div>').text(String(s)).html().replace(/\n/g,'<br>')}

/* ================================================================
   JSON 파싱 방어 (이중 인코딩 대응)
   ================================================================ */
function safeParse(data) {
  if (typeof data === 'object' && data !== null) return data;
  if (typeof data === 'string') {
    try {
      var p = JSON.parse(data);
      if (typeof p === 'string') try { p = JSON.parse(p); } catch(e2){}
      return p;
    } catch(e) { console.error('[EEHO] safeParse:', e); return null; }
  }
  return null;
}

/* ================================================================
   ★ buildPayload(freeText): 새 백엔드 명세서 기반 계층적 JSON 생성
   ──────────────────────────────────────────────────────────────────
   핵심 규칙 ①  calculated_data 누락 방지
   핵심 규칙 ②  '모름' 값 → 반드시 "모름" 문자열 전송 (null/빈문자열 금지)
   ================================================================ */
function buildPayload(freeText) {

  // ── "모름" 안전 처리 헬퍼 ──
  function safe(val) {
    if (val === undefined || val === null || val === '') return '모름';
    return val;
  }

  // ── 1. tax_category ──
  var taxTypeStr = MAP_TAX_CATEGORY[formData.taxType] || '모름';

  // ── 2. structured_data.asset_info ──
  var assetTypeStr = MAP_TYPE_ASSET[formData.reSubType] || '모름';
  var addressStr   = ($('#inpAddress').val() || '').trim() || '모름';
  var areaMap      = { 'under85':'85㎡ 이하', 'over85':'85㎡ 초과', 'unknown':'모름' };
  var areaStr      = areaMap[formData.area] || '모름';

  // ── 3. structured_data.price_info ──
  var sellPrice = formData.amount || 0;
  var buyPrice  = formData.acqPrice || 0;

  // ── 4. structured_data.date_info  (빈 값 → "모름") ──
  var buyDate  = safe($('#inpAcqDate').val());
  var sellDate = safe($('#inpSaleDate').val());

  // ── 5. structured_data.condition_info  (★ "모름" 규칙 엄수) ──
  var regulatedMap = { 'yes':'여', 'no':'부', 'unknown':'모름' };
  var regulatedStr = regulatedMap[formData.regulated] || '모름';

  var housesMap = { '1':'1주택', '2':'2주택', '3':'3주택', 'multi':'4주택 이상', 'unknown':'모름' };
  var houseStr  = housesMap[formData.houses] || '모름';

  var resideMap = { '0':'없음', '2':'2년+', '5':'5년+', '10':'10년+', 'unknown':'모름' };
  var resideStr = resideMap[formData.reside] || '모름';

  // ── 6. calculated_data  (★ 규칙 ①: 1차 예상세액 항목별 전달) ──
  var calcData = {
    estimated_total_tax: lastCalcResult.total || 0
  };
  // 항목별 매핑 (calculateTax가 name으로 반환한 값 기준)
  (lastCalcResult.items || []).forEach(function(item) {
    switch (item.name) {
      case '양도소득세':     calcData.estimated_yangdo_tax  = item.amount; break;
      case '지방소득세':     calcData.estimated_local_tax   = item.amount; break;
      case '중과가산':       calcData.estimated_surcharge   = item.amount; break;
      case '취득세':         calcData.estimated_acq_tax     = item.amount; break;
      case '지방교육세':     calcData.estimated_local_edu_tax = item.amount; break;
      case '농어촌특별세':   calcData.estimated_rural_tax   = item.amount; break;
      case '재산세':         calcData.estimated_property_tax = item.amount; break;
      case '종합부동산세':   calcData.estimated_comprehensive_tax = item.amount; break;
      case '증여세':         calcData.estimated_gift_tax    = item.amount; break;
      case '신고세액공제':   calcData.estimated_filing_deduction = item.amount; break;
    }
  });

  // ── 최종 Payload 조립 ──
  return {
    session_id: aiState.sessionId,

    tax_category: {
      type: taxTypeStr
    },

    structured_data: {
      asset_info: {
        asset_type: assetTypeStr,
        address:    addressStr,
        area_size:  areaStr
      },
      price_info: {
        buy_price:  buyPrice,
        sell_price: sellPrice
      },
      date_info: {
        buy_date:  buyDate,
        sell_date: sellDate
      },
      condition_info: {
        is_regulated_area: regulatedStr,
        house_count:       houseStr,
        residence_period:  resideStr
      }
    },

    calculated_data: calcData,

    unstructured_data: {
      user_context: freeText || ''
    }
  };
}

/* ================================================================
   API 통신
   ================================================================ */
function callAPI(payload) {
  return new Promise(function(resolve, reject) {
    console.log('[EEHO] → API 요청:', JSON.stringify(payload, null, 2));
    $.ajax({
      url: EEHO_API_URL,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      timeout: 60000,
      success: function(res) {
        console.log('[EEHO] ← API 원본:', res);
        var parsed = safeParse(res);
        if (parsed) resolve(parsed);
        else reject('응답 파싱 실패');
      },
      error: function(xhr, status, err) {
        console.error('[EEHO] API Error:', status, err);
        if (xhr.responseText) {
          var p = safeParse(xhr.responseText);
          if (p && p.status) { resolve(p); return; }
        }
        reject('서버 연결 실패 (' + (xhr.status || status) + ')');
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
    if(s<step) $(this).addClass('done');
    else if(s===step) $(this).addClass('active');
  });
  A.find('.eh-pg-line').each(function(){
    $(this).toggleClass('done', +$(this).data('a') < step);
  });
}

/* ================================================================
   NAVIGATION
   ================================================================ */
function goStep(n){
  currentStep=n;
  A.find('.eh-step').removeClass('active');
  A.find('.eh-step[data-step="'+n+'"]').addClass('active');
  hideAI(); updateProgress(n); scrollTop();
}
function hideAI(){ $('#aiTextPhase,#aiConvPhase,#aiLoading,#aiFinal').removeClass('active'); }
function showAI(id){
  A.find('.eh-step').removeClass('active');
  hideAI(); $(id).addClass('active'); scrollTop();
}
function scrollTop(){ $('html,body').animate({scrollTop:A.offset().top-20},300); }

/* ================================================================
   STEP 1
   ================================================================ */
A.on('click','.eh-type-card',function(){
  A.find('.eh-type-card').removeClass('active');
  $(this).addClass('active');
  formData.taxType=$(this).data('type');
});
$('#toStep2').on('click',function(){ configStep2(); goStep(2); });

/* ================================================================
   STEP 2
   ================================================================ */
function configStep2(){
  var t=formData.taxType;
  var labels={cgt:'양도가액',acq:'취득가액',prop:'공시가격',gift:'증여가액'};
  $('#amountLabel').text(labels[t]||'금액');
  if(t==='cgt'){
    $('#assetTabs').show();
    $('#tabStock2').removeClass('dis').show();
    $('#tabCash2').addClass('dis');
    $('#s2Title').text('자산과 금액을 입력하세요');
  } else if(t==='acq'){
    $('#assetTabs').hide(); formData.assetType='re';
    $('#s2Title').text('취득 대상과 금액을 입력하세요');
  } else if(t==='prop'){
    $('#assetTabs').hide(); formData.assetType='re';
    $('#s2Title').text('보유 부동산의 공시가격을 입력하세요');
  } else if(t==='gift'){
    $('#assetTabs').show();
    $('#tabStock2,#tabCash2').removeClass('dis').show();
    $('#s2Title').text('증여 재산과 금액을 입력하세요');
  }
  updateReTypes();
}
function updateReTypes(){
  var isRe=formData.assetType==='re', isSt=formData.assetType==='stock';
  $('#reTypeDropWrap').toggle(isRe); $('#reAddressWrap').toggle(isRe);
  $('#stockNameWrap').toggleClass('eh-hd',!isSt);
}
A.on('click','.eh-asset-tab',function(){
  if($(this).hasClass('dis'))return;
  $(this).closest('.eh-asset-tabs').find('.eh-asset-tab').removeClass('active');
  $(this).addClass('active'); formData.assetType=$(this).data('v'); updateReTypes();
});
$('#reTypes').on('click','.eh-chip',function(){
  $('#reTypes .eh-chip').removeClass('active');
  $(this).addClass('active'); formData.reSubType=$(this).data('v');
});
/* ★ v6.1: 부동산 유형 드롭다운 */
$('#reTypeSelect').on('change',function(){
  formData.reSubType=$(this).val();
});

/* ★ v6.1: 국문 금액 읽기 함수 */
function numToKorean(n){
  if(!n||n<=0) return '';
  var units=['','만','억','조'];
  var parts=[];
  var idx=0;
  while(n>0){
    var chunk=n%10000;
    if(chunk>0){
      var s='';
      var chun=Math.floor(chunk/1000); if(chun) s+=chun+'천';
      var baek=Math.floor((chunk%1000)/100); if(baek) s+=baek+'백';
      var sip=Math.floor((chunk%100)/10); if(sip) s+=sip+'십';
      var il=chunk%10; if(il) s+=il;
      parts.unshift(s+units[idx]);
    }
    n=Math.floor(n/10000);
    idx++;
  }
  return parts.join(' ')+'원';
}

$('#inpAmount').on('input',function(){
  var v=raw($(this).val()),n=parseInt(v)||0;
  $(this).val(n>0?fmt(n):''); formData.amount=n;
  $('#amountKr').text(numToKorean(n));
});
A.on('click','.eh-quick',function(){
  var a=+$(this).data('a');
  if(a===0) formData.amount=0; else formData.amount+=a;
  $('#inpAmount').val(formData.amount>0?fmt(formData.amount):'').trigger('input');
});
$('#inpAcqPrice').on('input',function(){
  var v=raw($(this).val()),n=parseInt(v)||0;
  $(this).val(n>0?fmt(n):''); formData.acqPrice=n;
  $('#acqPriceKr').text(numToKorean(n));
});
$('#inpAddress').on('input',function(){ formData.address=$(this).val(); });
$('#inpStockName').on('input',function(){ formData.stockName=$(this).val(); });
$('#toStep3').on('click',function(){
  if(formData.amount<=0){alert('금액을 입력해주세요.');return;}
  // 부동산이면 주소 필수
  if(formData.assetType==='re'){
    var addr=$('#inpAddress').val().trim();
    if(!addr){
      alert('주소를 입력해주세요.');
      $('#inpAddress').focus();
      return;
    }
  }
  configStep3(); goStep(3);
});
$('#backStep1').on('click',function(){ goStep(1); });

/* ================================================================
   STEP 3
   ================================================================ */
function configStep3(){
  var t=formData.taxType;
  if(t==='cgt'){
    $('#f3Dates,#f3AcqPrice,#f3Reg,#f3Houses,#f3Reside,#f3Area').show();
  } else if(t==='acq'){
    $('#f3Dates,#f3AcqPrice,#f3Reside').hide();
    $('#f3Reg,#f3Houses,#f3Area').show();
  } else if(t==='prop'){
    $('#f3Dates,#f3AcqPrice,#f3Reg,#f3Reside,#f3Area').hide();
    $('#f3Houses').show();
  } else if(t==='gift'){
    $('#f3Dates,#f3AcqPrice,#f3Houses,#f3Reside,#f3Area').hide();
    $('#f3Reg').show();
  }
}

A.on('click','.eh-chips .eh-chip',function(){
  var p=$(this).closest('.eh-chips');
  p.find('.eh-chip').removeClass('active');
  $(this).addClass('active');
  var g=p.data('g'), v=$(this).data('v');
  if(g==='houses') formData.houses=v;
  else if(g==='reside') formData.reside=v;
  else if(g==='area') formData.area=v;
  else if(g==='regulated') formData.regulated=v;
});
/* ★ v6.1: Step 3 드롭다운 이벤트 */
$('#selRegulated').on('change',function(){ formData.regulated=$(this).val(); });
$('#selHouses').on('change',function(){ formData.houses=$(this).val(); });
$('#selReside').on('change',function(){ formData.reside=$(this).val(); });
$('#selArea').on('change',function(){ formData.area=$(this).val(); });
$('#inpAcqDate').on('change',function(){ formData.acqDate=$(this).val(); });
$('#inpSaleDate').on('change',function(){ formData.saleDate=$(this).val(); });
$('#regHelpBtn').on('click',function(e){ e.preventDefault(); $('#regHelpPopup').toggleClass('eh-hd'); });
$('#regHelpClose').on('click',function(){ $('#regHelpPopup').addClass('eh-hd'); });
A.on('click','.eh-acq-q',function(){
  var a=+$(this).data('a');
  if(a===0) formData.acqPrice=0; else formData.acqPrice+=a;
  $('#inpAcqPrice').val(formData.acqPrice>0?fmt(formData.acqPrice):'');
});
$('#backStep2').on('click',function(){ goStep(2); });

/* ================================================================
   STEP 3 → 4: 간이 계산
   ================================================================ */
$('#doCalc').on('click',function(){
  // 양도세: 취득일, 양도일 필수
  if(formData.taxType==='cgt'){
    var acq=$('#inpAcqDate').val(), sale=$('#inpSaleDate').val();
    if(!acq){alert('취득일을 입력해주세요.');$('#inpAcqDate').focus();return;}
    if(!sale){alert('양도일을 입력해주세요.');$('#inpSaleDate').focus();return;}
  }
  var result = calculateTax(formData);
  currentEstimatedTax = result.total;
  lastCalcResult = result;  // ★ 항목별 내역 보관 (calculated_data용)
  renderResult(result); goStep(4);
});

function calculateTax(fd) {
  var amt=fd.amount||0, t=fd.taxType, items=[], total=0;
  if(t==='cgt'){
    var gain=Math.round(amt*0.3),tax=Math.round(gain*0.24),loc=Math.round(tax*0.1);
    items=[{name:'양도소득세',amount:tax},{name:'지방소득세',amount:loc}];
    if(fd.houses!=='1'){var s=Math.round(tax*0.2);items.push({name:'중과가산',amount:s});total=tax+loc+s;}
    else total=tax+loc;
  } else if(t==='acq'){
    var r=fd.houses==='1'?0.01:(fd.houses==='2'?0.08:0.12);
    if(fd.regulated==='yes'&&fd.houses!=='1')r+=0.02;
    var a=Math.round(amt*r),e=Math.round(a*0.1),ru=Math.round(a*0.02);
    items=[{name:'취득세',amount:a},{name:'지방교육세',amount:e},{name:'농어촌특별세',amount:ru}];total=a+e+ru;
  } else if(t==='prop'){
    var b=Math.max(0,amt-1200000000)*0.6,p=Math.round(b*0.005),ep=Math.round(p*0.2);
    items=[{name:'재산세',amount:Math.round(amt*0.001)},{name:'종합부동산세',amount:p},{name:'지방교육세',amount:ep}];
    total=Math.round(amt*0.001)+p+ep;
  } else {
    var tx=Math.max(0,amt-50000000),g=Math.round(tx*0.2),d=-Math.round(g*0.03),eg=Math.round(g*0.1);
    items=[{name:'증여세',amount:g},{name:'신고세액공제',amount:d},{name:'지방교육세',amount:eg}];total=g+d+eg;
  }
  if(total<0)total=0; return{items:items,total:total};
}
function renderResult(data){
  $('#resultTotal').text('₩'+fmt(data.total));
  var h='';
  data.items.forEach(function(it){var pf=it.amount<0?'-₩':'₩';h+='<div class="eh-ri"><span>'+it.name+'</span><span>'+pf+fmt(Math.abs(it.amount))+'</span></div>';});
  $('#resultItems').html(h);
}
$('#backStep3').on('click',function(){ goStep(3); });
$('#resetAll').on('click',function(){
  formData={taxType:'cgt',assetType:'re',reSubType:'apt',amount:0,address:'',stockName:'',
    regulated:'no',houses:'1',saleDate:'',acqDate:'',reside:'2',area:'under85',acqPrice:0};
  aiState={payload:{},userText:'',callCount:0,sessionId:''};
  currentEstimatedTax=0;
  $('#inpAmount,#inpAcqPrice,#inpAddress,#inpStockName').val('');
  $('#inpAcqDate,#inpSaleDate').val('');
  $('#aiTextInput').val(''); $('#aiTxtCnt').text('0');
  A.find('.eh-type-card').removeClass('active').first().addClass('active');
  A.find('.eh-asset-tab').removeClass('active').first().addClass('active');
  $('#reTypes .eh-chip').removeClass('active').first().addClass('active');
  /* ★ v6.1: 드롭다운 초기화 */
  $('#reTypeSelect').val('apt');
  $('#selRegulated').val('no');
  $('#selHouses').val('1');
  $('#selReside').val('2');
  $('#selArea').val('under85');
  $('#amountKr,#acqPriceKr').text('');
  A.find('[data-g="houses"] .eh-chip').removeClass('active').first().addClass('active');
  A.find('[data-g="regulated"] .eh-chip').removeClass('active').eq(1).addClass('active');
  A.find('[data-g="reside"] .eh-chip').removeClass('active').eq(1).addClass('active');
  A.find('[data-g="area"] .eh-chip').removeClass('active').first().addClass('active');
  $('#regHelpPopup').addClass('eh-hd'); goStep(1);
});

/* ================================================================
   ===  AI FLOW: 통신 아키텍처  ===
   ================================================================
   [EEHO AI로 분석하기] → 텍스트 입력
     → [분석 요청] → buildUserData() + free_text → POST
       → need_more_info: 대화형 추가질문 (루프)
       → success: PASS/FAIL 최종 결과
   ================================================================ */

$('#startAI').on('click',function(){ showAI('#aiTextPhase'); });
$('#aiBackToResult').on('click',function(){ goStep(4); });
$('#aiTextInput').on('input',function(){ $('#aiTxtCnt').text($(this).val().length); });

/* ================================================================
   ★ [분석 요청 →] 클릭: 새 명세서 기반 JSON Payload → API 1차 호출
   ================================================================ */
$('#aiSendText').on('click',function(){
  var text=$('#aiTextInput').val().trim();
  if(!text){alert('상황을 입력해주세요.');return}
  aiState.userText = text;
  aiState.callCount = 0;
  aiState.sessionId = generateSessionId();

  // 대화 채팅 영역 초기화
  var chat = $('#aiConvChat').empty();
  addBubble(chat, 'user', text);
  addBubble(chat, 'ai', '안녕하세요, EEHO AI입니다.\n고객님이 제출하신 자료에 최적화된 절세 전략을 구상하고 있습니다.');

  // ★ 새 명세서 기반 계층적 Payload 생성
  aiState.payload = buildPayload(text);

  console.log('[EEHO] ★ 최종 Payload:', JSON.stringify(aiState.payload, null, 2));
  sendToAPI();
});

/* ================================================================
   sendToAPI: 핵심 API 호출 + 응답 분기
   ★ aiState.payload 전체를 전송 (추가 질문 응답은 additional_data에 누적)
   ================================================================ */
function sendToAPI() {
  var payload = aiState.payload;
  aiState.callCount++;

  var pct = Math.min(90, aiState.callCount * 25);
  $('#aiProgressFill').css('width', pct + '%');

  showAI('#aiLoading');

  callAPI(payload)
    .then(function(response) {
      var data = safeParse(response);
      if (!data || !data.status) throw new Error('올바르지 않은 응답 형식');

      if (data.status === 'need_more_info') {
        handleNeedMoreInfo(data);
        return;
      }
      if (data.status === 'success') {
        $('#aiProgressFill').css('width', '100%');
        handleSuccess(data);
        return;
      }
      throw new Error('알 수 없는 status: ' + data.status);
    })
    .catch(function(err) {
      console.error('[EEHO] API 실패:', err);
      alert('AI 분석 중 오류가 발생했습니다.\n' + String(err) + '\n\n다시 시도해주세요.');
      showAI('#aiTextPhase');
    });
}

/* ================================================================
   CASE 1: need_more_info → 대화형 추가질문 UI
   백엔드 응답 형식 2가지 모두 대응:
     A) { missing_variables: ["var1","var2"] }
     B) { checklist: [{ alias:"...", fields:["var1","var2"] }] }
   ================================================================ */
function handleNeedMoreInfo(data) {
  showAI('#aiConvPhase');

  var chat = $('#aiConvChat');

  // ★ 백엔드 응답 구조에 따라 missing 변수 추출
  var missing = [];
  if (data.missing_variables && data.missing_variables.length) {
    // 형식 A: 단순 배열
    missing = data.missing_variables;
  } else if (data.checklist && data.checklist.length) {
    // 형식 B: checklist 배열 → fields를 합침 (중복 제거)
    var seen = {};
    data.checklist.forEach(function(item) {
      // alias 정보를 AI 말풍선으로 표시
      if (item.alias) {
        addBubble(chat, 'ai', '📋 검토 중인 조항: ' + item.alias);
      }
      (item.fields || []).forEach(function(f) {
        if (!seen[f]) { seen[f] = true; missing.push(f); }
      });
    });
  }

  addBubble(chat, 'ai', data.message || '정확한 분석을 위해 추가 정보가 필요합니다.');

  if (missing.length === 0) {
    addBubble(chat, 'ai', '추가 정보 항목이 비어 있습니다. 다시 시도해주세요.');
    return;
  }

  // ★ v6.1: 최대 4개로 제한
  if (missing.length > 4) {
    missing = missing.slice(0, 4);
  }

  var inputArea = $('#aiConvInputArea').empty();

  missing.forEach(function(varName) {
    var label = FIELD_LABELS[varName] || varName;

    var html = '<div class="eh-conv-field" data-var="'+varName+'">';
    html += '<label class="eh-conv-label">' + esc(label) + '</label>';
    // ★ v6.1: 모든 필드를 텍스트 입력으로 통일 (date 타입만 유지)
    var type = FIELD_TYPES[varName] || 'text';
    if (type === 'date') {
      html += '<input type="date" class="eh-date-input eh-conv-input" data-var="'+varName+'">';
    } else {
      html += '<input type="text" class="eh-text-input eh-conv-input" data-var="'+varName+'" placeholder="입력하세요">';
    }
    html += '</div>';
    inputArea.append(html);
  });

  inputArea.append('<button class="eh-btn-primary eh-btn-full eh-conv-submit" id="convSubmit">확인 →</button>');
  chat[0].scrollTop = chat[0].scrollHeight;
}

/* --- 토글 버튼 클릭 --- */
A.on('click', '.eh-conv-toggle-btn', function(){
  $(this).closest('.eh-conv-toggle-row').find('.eh-conv-toggle-btn').removeClass('selected');
  $(this).addClass('selected');
});

/* --- 셀렉트 버튼 클릭 --- */
A.on('click', '.eh-conv-select-btn', function(){
  $(this).closest('.eh-conv-select-row').find('.eh-conv-select-btn').removeClass('selected');
  $(this).addClass('selected');
});

/* --- 대화형 폼 제출 → payload.additional_data 병합 → API 재호출 --- */
A.on('click', '#convSubmit', function(){
  var allOK = true;
  var chat = $('#aiConvChat');
  var answerTexts = [];

  // ★ additional_data 누적 객체 초기화 (없으면 생성)
  if (!aiState.payload.additional_data) {
    aiState.payload.additional_data = {};
  }

  $('.eh-conv-field').each(function(){
    var varName = $(this).data('var');
    var label = FIELD_LABELS[varName] || varName;
    var val = $(this).find('.eh-conv-input').val();

    if (!val || val.trim() === '') {
      allOK = false;
      $(this).addClass('eh-field-error');
      return;
    }
    $(this).removeClass('eh-field-error');

    // ★ 추가 응답을 payload.additional_data에 병합
    aiState.payload.additional_data[varName] = val.trim();
    answerTexts.push(label + ': ' + val.trim());
  });

  if (!allOK) { alert('모든 항목을 입력해주세요.'); return; }

  addBubble(chat, 'user', answerTexts.join('\n'));
  $('#aiConvInputArea').empty();

  console.log('[EEHO] 보완 데이터 병합 (additional_data):', JSON.stringify(aiState.payload.additional_data, null, 2));
  sendToAPI();
});

/* ================================================================
   CASE 2: success → 최종 결과 렌더링
   백엔드 응답 형식 2가지 모두 대응:
     A) { result_type:"PASS", details:"...", risk_warning:"..." }
     B) { final_alias:"일시적 2주택", calculation:"..." }
   ================================================================ */
function handleSuccess(data) {
  var origTotal = currentEstimatedTax;

  // ★ 응답 구조 판별
  var isPASS, detailText, riskText, badgeLabel;

  if (data.result_type) {
    // 형식 A: result_type 명시
    isPASS = (data.result_type === 'PASS');
    detailText = data.details || '';
    riskText = data.risk_warning || '';
  } else if (data.final_alias) {
    // 형식 B: final_alias + calculation (Gemini 분석 결과)
    isPASS = true; // 최종 계산까지 도달했으면 PASS
    badgeLabel = data.final_alias;
    detailText = data.calculation || '';
    riskText = '';
  } else {
    isPASS = false;
    detailText = '결과를 분석할 수 없습니다.';
    riskText = '';
  }

  var $badge = $('#finalResultBadge');
  $badge.removeClass('eh-badge-pass eh-badge-fail');

  if (isPASS) {
    $badge.addClass('eh-badge-pass');
    $('#finalBadgeIcon').text('✓');
    $('#finalBadgeLabel').text(badgeLabel || '비과세 특례 적용 가능');
    $('#finalBadgeType').text('PASS');
  } else {
    $badge.addClass('eh-badge-fail');
    $('#finalBadgeIcon').text('✗');
    $('#finalBadgeLabel').text(badgeLabel || '비과세 요건 미충족');
    $('#finalBadgeType').text('FAIL');
  }

  $('#finalBefore').text('₩' + fmt(origTotal));
  $('#finalAfter').text(isPASS ? '₩0 (비과세)' : '₩' + fmt(origTotal));

  if (detailText && detailText.trim()) {
    $('#finalDetails').html('<div class="eh-details-content">' + esc(detailText) + '</div>');
  } else {
    $('#finalDetails').html('<p>상세 분석 결과는 세무 전문가 상담 시 안내드립니다.</p>');
  }

  if (riskText && riskText.trim()) {
    $('#finalRisks').html('<div class="eh-risk-item">' + esc(riskText) + '</div>');
  } else {
    $('#finalRisks').html('<div class="eh-risk-item eh-risk-none">현재 확인된 리스크가 없습니다.</div>');
  }

  showAI('#aiFinal');
}

/* ================================================================
   말풍선 추가 함수
   ================================================================ */
function addBubble(container, role, text) {
  var html = '<div class="eh-bubble '+role+'">' +
    '<div>' + (role==='ai' ? '<div class="eh-bubble-label">EEHO AI</div>' : '') +
    '<div class="eh-bubble-content">' + esc(text) + '</div></div></div>';
  container.append(html);
  container[0].scrollTop = container[0].scrollHeight;
}

$('#backToResult').on('click',function(){ goStep(4); });

/* ================================================================
   INIT
   ================================================================ */
updateProgress(1);
$('#ehLdYear').text(new Date().getFullYear());

})(jQuery);
