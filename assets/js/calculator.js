(function($){
'use strict';
var A=$('#eeho-app');if(!A.length)return;

/* ================================================================
   API CONFIG
   ================================================================ */
var EEHO_API_URL = "https://eeho-ai-tax-calculator-1070315020839.asia-northeast3.run.app";

/* ================================================================
   STATE
   ================================================================ */
var formData = {
  taxType: 'cgt', assetType: 're', reSubType: 'apt',
  amount: 0, address: '', stockName: '',
  regulated: 'no', houses: '1',
  saleDate: '', acqDate: '',
  reside: '2', area: 'under85', acqPrice: 0,
  // ★ v7.1: 주식 CGT 전용 필드
  stockListed: 'listed',   // listed | unlisted
  stockMajor:  'minor',    // minor | major        (상장 전용)
  stockSme:    'sme',      // sme | mid | large    (비상장 전용)
  // ★ v7.2: 상속세 전용 필드
  hasSpouse:   'yes',      // yes | no  (배우자 유무)
};

var aiState = {
  payload: {},
  userText: '',
  callCount: 0,
  sessionId: '',
};

var currentStep = 1;
var currentEstimatedTax = 0;
var lastCalcResult = { items: [], total: 0 };

function generateSessionId() {
  return 'usr_' + Date.now() + '_session_' + String(Math.floor(Math.random()*100)).padStart(2,'0');
}

/* --- 맵 정의 --- */
var MAP_TAX_CATEGORY = {
  'cgt': '양도소득세', 'acq': '취득세', 'prop': '재산세/종합부동산세',
  'gift': '증여세', 'inherit': '상속세'
};
var MAP_TYPE_ASSET = {
  'apt': '아파트', 'villa': '빌라', 'officetel': '오피스텔',
  'commercial': '상가', 'building': '건물', 'land': '토지', 'rights': '입주권/분양권'
};

var FIELD_LABELS = {
  'tax_category':'세목','category_asset':'자산종류','addr_property':'주소',
  'type_asset':'자산유형','amt_transfer':'양도가액','dt_acq':'취득일',
  'dt_transfer':'양도일','amt_acq':'취득가액','is_regulated_trans':'조정대상지역 여부',
  'num_house_at_sell':'양도 시점 보유주택 수','type_period_residence':'실거주 기간',
  'type_area_exclusive':'전용면적','amt_expected_tax':'예상세액','dt_acq_prev':'종전주택 취득일',
};
var FIELD_TYPES = {
  'tax_category':'text','category_asset':'text','addr_property':'text','type_asset':'text',
  'amt_transfer':'number','dt_acq':'date','dt_transfer':'date','amt_acq':'number',
  'is_regulated_trans':'toggle','num_house_at_sell':'number',
  'type_period_residence':'select','type_area_exclusive':'select',
  'amt_expected_tax':'number','dt_acq_prev':'date',
};

/* ================================================================
   UTILS
   ================================================================ */
function fmt(n){return Number(n).toLocaleString('ko-KR')}
function raw(s){return String(s).replace(/[^0-9]/g,'')||'0'}
function esc(s){return $('<div>').text(String(s)).html().replace(/\n/g,'<br>')}
function safeParse(data) {
  if (typeof data === 'object' && data !== null) return data;
  if (typeof data === 'string') {
    try { var p=JSON.parse(data); if(typeof p==='string') try{p=JSON.parse(p);}catch(e2){} return p; }
    catch(e){console.error('[EEHO] safeParse:',e);return null;}
  }
  return null;
}

/* ================================================================
   buildPayload
   ================================================================ */
function buildPayload(freeText) {
  function safe(val){ return (val===undefined||val===null||val==='') ? '모름' : val; }

  var sellPrice = formData.amount || 0;
  var buyPrice  = formData.acqPrice || 0;
  var buyDate   = safe($('#inpAcqDate').val());
  var sellDate  = safe($('#inpSaleDate').val());

  var regulatedStr = ({yes:'여',no:'부',unknown:'모름'})[formData.regulated] || '모름';
  var houseStr     = ({'1':'1주택','2':'2주택','3':'3주택','multi':'4주택 이상','unknown':'모름'})[formData.houses] || '모름';
  var resideStr    = ({'0':'없음','2':'2년+','5':'5년+','10':'10년+','unknown':'모름'})[formData.reside] || '모름';

  var calcData = { estimated_total_tax: lastCalcResult.total || 0 };
  (lastCalcResult.items || []).forEach(function(item) {
    switch(item.name) {
      case '양도소득세':   calcData.estimated_yangdo_tax  = item.amount; break;
      case '지방소득세':   calcData.estimated_local_tax   = item.amount; break;
      case '중과가산':     calcData.estimated_surcharge   = item.amount; break;
      case '취득세':       calcData.estimated_acq_tax     = item.amount; break;
      case '지방교육세':   calcData.estimated_local_edu_tax = item.amount; break;
      case '농어촌특별세': calcData.estimated_rural_tax   = item.amount; break;
      case '재산세':       calcData.estimated_property_tax = item.amount; break;
      case '종합부동산세': calcData.estimated_comprehensive_tax = item.amount; break;
      case '지방교육세(재산세)': calcData.estimated_prop_edu_tax = item.amount; break;
      case '농어촌특별세(종부세)': calcData.estimated_jonbu_rural_tax = item.amount; break;
      case '도시지역분':   calcData.estimated_city_tax = item.amount; break;
      case '증여세':       calcData.estimated_gift_tax    = item.amount; break;
      case '상속세':       calcData.estimated_inherit_tax = item.amount; break;
      case '신고세액공제': calcData.estimated_filing_deduction = item.amount; break;
    }
  });

  // condition_info: 주식 CGT면 주식 분류 정보 추가
  var conditionInfo = {
    is_regulated_area: regulatedStr,
    house_count:       houseStr,
    residence_period:  resideStr
  };
  if (formData.taxType === 'cgt' && formData.assetType === 'stock') {
    conditionInfo.stock_listed = formData.stockListed === 'listed' ? '상장' : '비상장';
    if (formData.stockListed === 'listed') {
      conditionInfo.stock_major = formData.stockMajor === 'major' ? '대주주' : '소액주주';
    } else {
      conditionInfo.stock_corp_size = ({sme:'중소기업',mid:'중견기업',large:'일반법인'})[formData.stockSme] || '중소기업';
    }
  }
  // ★ 상속세: 배우자 유무 정보 추가
  if (formData.taxType === 'inherit') {
    conditionInfo.has_spouse = formData.hasSpouse === 'yes' ? '여' : '부';
  }

  return {
    session_id: aiState.sessionId,
    tax_category: { type: MAP_TAX_CATEGORY[formData.taxType] || '모름' },
    structured_data: {
      asset_info: {
        asset_type: formData.assetType === 'stock' ? '주식' : (MAP_TYPE_ASSET[formData.reSubType] || '모름'),
        address:    ($('#inpAddress').val()||'').trim() || '모름',
        area_size:  ({'under85':'85㎡ 이하','over85':'85㎡ 초과','unknown':'모름'})[formData.area] || '모름'
      },
      price_info:     { buy_price: buyPrice, sell_price: sellPrice },
      date_info:      { buy_date: buyDate, sell_date: sellDate },
      condition_info: conditionInfo
    },
    calculated_data:    calcData,
    unstructured_data:  { user_context: freeText || '' }
  };
}

/* ================================================================
   API 통신
   ================================================================ */
function callAPI(payload) {
  return new Promise(function(resolve, reject) {
    console.log('[EEHO] → API 요청:', JSON.stringify(payload, null, 2));
    $.ajax({
      url: EEHO_API_URL, method: 'POST', contentType: 'application/json',
      data: JSON.stringify(payload), timeout: 60000,
      success: function(res){ var p=safeParse(res); if(p) resolve(p); else reject('응답 파싱 실패'); },
      error:   function(xhr,status,err){
        if(xhr.responseText){ var p=safeParse(xhr.responseText); if(p&&p.status){resolve(p);return;} }
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
    var s=+$(this).data('s'); $(this).removeClass('active done');
    if(s<step)$(this).addClass('done'); else if(s===step)$(this).addClass('active');
  });
  A.find('.eh-pg-line').each(function(){ $(this).toggleClass('done',+$(this).data('a')<step); });
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
function showAI(id){ A.find('.eh-step').removeClass('active'); hideAI(); $(id).addClass('active'); scrollTop(); }
function scrollTop(){ $('html,body').animate({scrollTop:A.offset().top-20},300); }

/* ================================================================
   STEP 1
   ================================================================ */
A.on('click','.eh-type-card',function(){
  A.find('.eh-type-card').removeClass('active'); $(this).addClass('active');
  formData.taxType=$(this).data('type');
});
$('#toStep2').on('click',function(){ configStep2(); goStep(2); });

/* ================================================================
   STEP 2
   ================================================================ */
function configStep2(){
  var t=formData.taxType;
  var labels={cgt:'양도가액',acq:'취득가액',prop:'공시가격',gift:'증여가액',inherit:'상속재산가액'};
  $('#amountLabel').text(labels[t]||'금액');
  // ★ 상속세 전용 필드 기본 숨김
  $('#f3Spouse').addClass('eh-hd');
  if(t==='cgt'){
    $('#assetTabs').show(); $('#tabStock2').removeClass('dis').show(); $('#tabCash2').addClass('dis');
    $('#s2Title').text('자산과 금액을 입력하세요');
  } else if(t==='acq'){
    $('#assetTabs').hide(); formData.assetType='re'; $('#s2Title').text('취득 대상과 금액을 입력하세요');
  } else if(t==='prop'){
    $('#assetTabs').hide(); formData.assetType='re'; $('#s2Title').text('보유 부동산의 공시가격을 입력하세요');
  } else if(t==='gift'){
    $('#assetTabs').show(); $('#tabStock2,#tabCash2').removeClass('dis').show();
    $('#s2Title').text('증여 재산과 금액을 입력하세요');
  } else if(t==='inherit'){
    $('#assetTabs').show(); $('#tabStock2,#tabCash2').removeClass('dis').show();
    $('#s2Title').text('상속 재산의 총 가액을 입력하세요');
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
  $('#reTypes .eh-chip').removeClass('active'); $(this).addClass('active');
  formData.reSubType=$(this).data('v');
});
$('#reTypeSelect').on('change',function(){ formData.reSubType=$(this).val(); });

function numToKorean(n){
  if(!n||n<=0)return '';
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
  $(this).val(n>0?fmt(n):''); formData.amount=n; $('#amountKr').text(numToKorean(n));
});
A.on('click','.eh-quick',function(){
  var a=+$(this).data('a');
  if(a===0)formData.amount=0; else formData.amount+=a;
  $('#inpAmount').val(formData.amount>0?fmt(formData.amount):'').trigger('input');
});
$('#inpAcqPrice').on('input',function(){
  var v=raw($(this).val()),n=parseInt(v)||0;
  $(this).val(n>0?fmt(n):''); formData.acqPrice=n; $('#acqPriceKr').text(numToKorean(n));
});
$('#inpAddress').on('input',function(){ formData.address=$(this).val(); });
$('#inpStockName').on('input',function(){ formData.stockName=$(this).val(); });
$('#toStep3').on('click',function(){
  if(formData.amount<=0){alert('금액을 입력해주세요.');return;}
  if(formData.assetType==='re'){
    var addr=$('#inpAddress').val().trim();
    if(!addr){alert('주소를 입력해주세요.');$('#inpAddress').focus();return;}
  }
  configStep3(); goStep(3);
});
$('#backStep1').on('click',function(){ goStep(1); });

/* ================================================================
   STEP 3
   ================================================================ */
function configStep3(){
  var t=formData.taxType, asset=formData.assetType;
  // 주식 전용 필드 기본 숨김
  $('#f3StockListed,#f3StockMajor,#f3StockSme').addClass('eh-hd');
  // ★ 상속세 전용 필드 기본 숨김
  $('#f3Spouse').addClass('eh-hd');
  if(t==='cgt'){
    if(asset==='stock'){
      $('#f3Dates,#f3AcqPrice').show();
      $('#f3Reg,#f3Houses,#f3Reside,#f3Area').hide();
      $('#f3StockListed,#f3StockMajor,#f3StockSme').removeClass('eh-hd');
    } else {
      $('#f3Dates,#f3AcqPrice,#f3Reg,#f3Houses,#f3Reside,#f3Area').show();
    }
  } else if(t==='acq'){
    $('#f3Dates,#f3AcqPrice,#f3Reside').hide();
    $('#f3Reg,#f3Houses,#f3Area').show();
  } else if(t==='prop'){
    $('#f3Dates,#f3AcqPrice,#f3Reg,#f3Reside,#f3Area').hide();
    $('#f3Houses').show();
  } else if(t==='gift'){
    $('#f3Dates,#f3AcqPrice,#f3Houses,#f3Reside,#f3Area').hide();
    $('#f3Reg').show();
  } else if(t==='inherit'){
    // 상속세: 배우자 유무만 노출, 나머지 숨김
    $('#f3Dates,#f3AcqPrice,#f3Reg,#f3Houses,#f3Reside,#f3Area').hide();
    $('#f3Spouse').removeClass('eh-hd');
  }
}

/* ★ 상장/비상장 선택에 따라 대주주/중소기업 하위 필드 토글 */
function updateStockSubFields() {
  if (formData.stockListed === 'listed') {
    $('#f3StockMajor').show(); $('#f3StockSme').hide();
  } else {
    $('#f3StockMajor').hide(); $('#f3StockSme').show();
  }
}

$('#selStockListed').on('change', function(){ formData.stockListed=$(this).val(); updateStockSubFields(); });
$('#selStockMajor').on('change',  function(){ formData.stockMajor=$(this).val(); });
$('#selStockSme').on('change',    function(){ formData.stockSme=$(this).val(); });

$('#stockMajorHelpBtn').on('click',   function(e){ e.preventDefault(); $('#stockMajorHelpPopup').toggleClass('eh-hd'); });
$('#stockMajorHelpClose').on('click', function(){ $('#stockMajorHelpPopup').addClass('eh-hd'); });

/* ★ v7.2: 상속세 — 배우자 유무 선택 */
$('#selSpouse').on('change', function(){ formData.hasSpouse=$(this).val(); });

A.on('click','.eh-chips .eh-chip',function(){
  var p=$(this).closest('.eh-chips'); p.find('.eh-chip').removeClass('active'); $(this).addClass('active');
  var g=p.data('g'),v=$(this).data('v');
  if(g==='houses')formData.houses=v; else if(g==='reside')formData.reside=v;
  else if(g==='area')formData.area=v; else if(g==='regulated')formData.regulated=v;
});
$('#selRegulated').on('change',function(){ formData.regulated=$(this).val(); });
$('#selHouses').on('change',   function(){ formData.houses=$(this).val(); });
$('#selReside').on('change',   function(){ formData.reside=$(this).val(); });
$('#selArea').on('change',     function(){ formData.area=$(this).val(); });
$('#inpAcqDate').on('change',  function(){ formData.acqDate=$(this).val(); });
$('#inpSaleDate').on('change', function(){ formData.saleDate=$(this).val(); });
$('#regHelpBtn').on('click',   function(e){ e.preventDefault(); $('#regHelpPopup').toggleClass('eh-hd'); });
$('#regHelpClose').on('click', function(){ $('#regHelpPopup').addClass('eh-hd'); });
A.on('click','.eh-acq-q',function(){
  var a=+$(this).data('a');
  if(a===0)formData.acqPrice=0; else formData.acqPrice+=a;
  $('#inpAcqPrice').val(formData.acqPrice>0?fmt(formData.acqPrice):'');
});
$('#backStep2').on('click',function(){ goStep(2); });

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
  currentEstimatedTax=result.total; lastCalcResult=result;
  renderResult(result); goStep(4);
});

/* ================================================================
   ★ 누진세율 헬퍼 (소득세법 §55, 2024년 기준)
   ================================================================ */
function calcProgressiveTax(base) {
  if(base<=0)              return 0;
  if(base<=14000000)       return Math.round(base*0.06);
  if(base<=50000000)       return Math.round(base*0.15-1260000);
  if(base<=88000000)       return Math.round(base*0.24-5220000);
  if(base<=150000000)      return Math.round(base*0.35-14900000);
  if(base<=300000000)      return Math.round(base*0.38-19400000);
  if(base<=500000000)      return Math.round(base*0.40-25400000);
  if(base<=1000000000)     return Math.round(base*0.42-35400000);
                           return Math.round(base*0.45-65400000);
}

/* ================================================================
   ★ [v7.2] calculateTax()
   ──────────────────────────────────────────────────────────────────
   [v7.2 수정사항 — 부동산 CGT]
     수정 1: 1세대 1주택 장특공제 보유기간 공제율 0.08 → 0.04
             (소득세법 시행령 §159조의4)
             보유기간 연 4% 최대40% + 거주기간 연 4% 최대40% = 최대 80%
     수정 2: 단기양도 세율 자산유형별 분기
             (소득세법 §104①)
             주택/입주권/분양권: 1년 미만 70%, 1~2년 60%
             토지/상가/건물:     1년 미만 50%, 1~2년 40%

   [주식 CGT] v7.1 유지
   [취득세·재산세·증여세] 다음 버전에서 순차 수정 예정
   ================================================================ */
function calculateTax(fd) {
  var amt=fd.amount||0, t=fd.taxType, items=[], total=0;

  if (t === 'cgt') {

    /* ── 주식 CGT (v7.1) ── */
    if (fd.assetType === 'stock') {
      var gain = Math.max(0, amt - (fd.acqPrice || 0));
      var holdMonths = 0;
      if (fd.acqDate && fd.saleDate) {
        var d1=new Date(fd.acqDate), d2=new Date(fd.saleDate);
        holdMonths = (d2.getFullYear()-d1.getFullYear())*12 + (d2.getMonth()-d1.getMonth());
      }
      var yangdoTax = 0;

      if (fd.stockListed === 'listed') {
        if (fd.stockMajor !== 'major') {
          console.log('[EEHO STOCK] 상장 소액주주 → 비과세');
          return {
            items: [
              { name: '양도소득세', amount: 0 },
              { name: '지방소득세', amount: 0 },
              { name: '※ 상장주식 소액주주 비과세', amount: 0 }
            ],
            total: 0
          };
        }
        var taxBase = Math.max(0, gain - 2500000);
        if (holdMonths < 12) {
          yangdoTax = Math.round(taxBase * 0.30);
        } else {
          yangdoTax = taxBase <= 300000000
            ? Math.round(taxBase * 0.20)
            : Math.round(300000000 * 0.20 + (taxBase - 300000000) * 0.25);
        }
      } else {
        var taxBase = Math.max(0, gain - 2500000);
        var rate = (fd.stockSme === 'sme') ? 0.10 : 0.20;
        yangdoTax = Math.round(taxBase * rate);
      }

      var localTax = Math.round(yangdoTax * 0.10);
      total = yangdoTax + localTax;
      items = [{ name:'양도소득세', amount:yangdoTax }, { name:'지방소득세', amount:localTax }];

      console.log('[EEHO STOCK]', {
        gain, holdMonths,
        stockListed:fd.stockListed, stockMajor:fd.stockMajor, stockSme:fd.stockSme,
        yangdoTax, localTax, total
      });

    /* ── 부동산 CGT (v7.2) ── */
    } else {
      var gain = Math.max(0, amt - (fd.acqPrice || 0));
      var holdMonths = 0;
      if (fd.acqDate && fd.saleDate) {
        var d1=new Date(fd.acqDate), d2=new Date(fd.saleDate);
        holdMonths = (d2.getFullYear()-d1.getFullYear())*12 + (d2.getMonth()-d1.getMonth());
      }
      var holdFullYears = Math.floor(holdMonths / 12);
      var isUnder1yr = holdMonths > 0 && holdMonths < 12;
      var is1to2yr   = holdMonths >= 12 && holdMonths < 24;

      // ★ [v7.2 수정 2] 주거용 vs 비주거용 자산 판별
      var isHousing = (fd.reSubType === 'apt' || fd.reSubType === 'villa' ||
                       fd.reSubType === 'officetel' || fd.reSubType === 'rights');

      var houseNum = 1;
      if(fd.houses==='2') houseNum=2;
      else if(fd.houses==='3'||fd.houses==='multi') houseNum=3;
      var isJungKwa      = (fd.regulated==='yes') && (houseNum>=2);
      var jungKwaAddRate = (houseNum===2)?0.20:(houseNum>=3?0.30:0);

      // 장기보유특별공제 (3년 이상, 단기·중과 제외)
      var ltdRate = 0;
      if (!isJungKwa && !isUnder1yr && !is1to2yr && holdFullYears >= 3) {
        if (fd.houses === '1') {
          // ★ [v7.2 수정 1] 1세대 1주택: 보유 연 4%(최대40%) + 거주 연 4%(최대40%) = 최대 80%
          var resideYrs = fd.reside==='2'?2 : fd.reside==='5'?5 : fd.reside==='10'?10 : 0;
          ltdRate = Math.min(0.80, Math.min(holdFullYears,10)*0.04 + Math.min(resideYrs,10)*0.04);
        } else {
          // 다주택/비주거: 연 2%, 최대 30%
          ltdRate = Math.min(0.30, holdFullYears * 0.02);
        }
      }

      var ltdAmt    = Math.round(gain * ltdRate);
      var taxBase   = Math.max(0, gain - ltdAmt - 2500000);

      // ★ [v7.2 수정 2] 단기양도 세율: 주거용 vs 비주거용 분기
      var yangdoTax;
      if (isUnder1yr) {
        yangdoTax = isHousing ? Math.round(taxBase * 0.70) : Math.round(taxBase * 0.50);
      } else if (is1to2yr) {
        yangdoTax = isHousing ? Math.round(taxBase * 0.60) : Math.round(taxBase * 0.40);
      } else if (isJungKwa) {
        yangdoTax = Math.round(calcProgressiveTax(taxBase) + taxBase * jungKwaAddRate);
      } else {
        yangdoTax = calcProgressiveTax(taxBase);
      }

      var localTax = Math.round(yangdoTax * 0.10);
      total = yangdoTax + localTax;
      items = [{ name:'양도소득세', amount:yangdoTax }, { name:'지방소득세', amount:localTax }];

      console.log('[EEHO CGT RE v7.2]', {
        gain, holdMonths, holdFullYears, isUnder1yr, is1to2yr,
        isHousing, isJungKwa, ltdRate, taxBase, yangdoTax, localTax, total
      });
    }

  /* ══════════════════════════════════════════════════════════════
     ★ [v7.2] 취득세 (지방세법 §11, 2024년 기준)
     ──────────────────────────────────────────────────────────────
     수정 1: 1주택 세율 1% 단일 → 가액별 1~3% (6억/9억 구간)
     수정 2: 비조정 2주택 8% → 일반세율 (1~3%)
     수정 3: 조정 2주택 10% → 8%
     수정 4: 조정 3주택+ 14% → 12%, 비조정 3주택+ → 8%
     수정 5: 농어촌특별세 무조건 부과 → 85㎡ 초과만 (취득가액×0.2%)
     ══════════════════════════════════════════════════════════════ */
  } else if (t==='acq') {

    // 일반 주택 취득세율: 6억 이하 1%, 6~9억 선형보간, 9억 초과 3%
    function normalAcqRate(price) {
      if (price <= 600000000) return 0.01;
      if (price <= 900000000) return (price / 100000000 * 2 / 3 - 3) / 100;
      return 0.03;
    }

    var houseNum = fd.houses==='1'?1 : fd.houses==='2'?2 : fd.houses==='3'?3 : fd.houses==='multi'?4 : 1;
    var isReg = (fd.regulated === 'yes');
    var rate;

    if (houseNum === 1) {
      // 1주택: 조정/비조정 동일, 가액별 1~3%
      rate = normalAcqRate(amt);
    } else if (houseNum === 2) {
      // 2주택: 조정 8%, 비조정 일반세율
      rate = isReg ? 0.08 : normalAcqRate(amt);
    } else {
      // 3주택 이상: 조정 12%, 비조정 8%
      rate = isReg ? 0.12 : 0.08;
    }

    var acqTax = Math.round(amt * rate);
    var eduTax = Math.round(acqTax * 0.1);  // 지방교육세 = 취득세 × 10%

    // ★ 농어촌특별세: 85㎡ 초과만 부과 (취득가액 × 0.2%)
    var ruralTax = 0;
    if (fd.area === 'over85') {
      ruralTax = Math.round(amt * 0.002);
    }

    items = [{name:'취득세', amount:acqTax}, {name:'지방교육세', amount:eduTax}];
    if (ruralTax > 0) {
      items.push({name:'농어촌특별세', amount:ruralTax});
    }
    total = acqTax + eduTax + ruralTax;

    console.log('[EEHO ACQ v7.2]', {
      amt:amt, houseNum:houseNum, isReg:isReg, rate:rate,
      acqTax:acqTax, eduTax:eduTax, ruralTax:ruralTax, area:fd.area, total:total
    });

  /* ══════════════════════════════════════════════════════════════
     ★ [v7.2] 재산세 / 종합부동산세 (지방세법 §111, 종부세법 §9)
     ──────────────────────────────────────────────────────────────
     수정 1: 재산세 공정시장가액비율(60%) + 구간별 세율 적용
     수정 2: 종부세 기본공제 주택수별 분기 (1주택 12억 / 다주택 9억)
     수정 3: 종부세 0.5% 단일 → 누진세율 7단계 적용
     수정 4: 재산세 지방교육세(재산세×20%) 추가
     수정 5: 재산세 도시지역분(과표×0.14%) 추가
     ══════════════════════════════════════════════════════════════ */
  } else if (t==='prop') {

    // ── 재산세 ──
    var fairRatio = 0.60;  // 공정시장가액비율 60%
    var propTaxBase = Math.round(amt * fairRatio);

    // 재산세 구간별 세율 (지방세법 §111)
    function calcPropertyTax(base) {
      if (base <= 0)          return 0;
      if (base <= 60000000)   return Math.round(base * 0.001);
      if (base <= 150000000)  return Math.round(base * 0.0015 - 30000);
      if (base <= 300000000)  return Math.round(base * 0.0025 - 180000);
                              return Math.round(base * 0.004  - 630000);
    }

    var propTax    = calcPropertyTax(propTaxBase);
    var propEduTax = Math.round(propTax * 0.20);       // 재산세 지방교육세 20%
    var cityTax    = Math.round(propTaxBase * 0.0014);  // 도시지역분 0.14%

    // ── 종합부동산세 ──
    var houseNum = fd.houses==='1'?1 : fd.houses==='2'?2 : fd.houses==='3'?3 : fd.houses==='multi'?4 : 1;
    var jonbuExemption = (houseNum === 1) ? 1200000000 : 900000000;
    var jonbuTaxBase = Math.round(Math.max(0, amt - jonbuExemption) * fairRatio);

    // 종부세 누진세율 (종부세법 §9, 2023년 이후 일반/중과 동일)
    function calcJonbuTax(base) {
      if (base <= 0)            return 0;
      if (base <= 300000000)    return Math.round(base * 0.005);
      if (base <= 600000000)    return Math.round(base * 0.007  - 600000);
      if (base <= 1200000000)   return Math.round(base * 0.010  - 2400000);
      if (base <= 2500000000)   return Math.round(base * 0.013  - 6000000);
      if (base <= 5000000000)   return Math.round(base * 0.015  - 11000000);
      if (base <= 9400000000)   return Math.round(base * 0.020  - 36000000);
                                return Math.round(base * 0.027  - 101800000);
    }

    var jonbuTax    = calcJonbuTax(jonbuTaxBase);
    var jonbuEduTax = Math.round(jonbuTax * 0.20);  // 종부세 농어촌특별세 20%

    items = [
      {name:'재산세',       amount:propTax},
      {name:'지방교육세(재산세)', amount:propEduTax},
      {name:'도시지역분',   amount:cityTax},
      {name:'종합부동산세', amount:jonbuTax},
      {name:'농어촌특별세(종부세)', amount:jonbuEduTax}
    ];
    total = propTax + propEduTax + cityTax + jonbuTax + jonbuEduTax;

    console.log('[EEHO PROP v7.2]', {
      amt:amt, propTaxBase:propTaxBase, propTax:propTax, propEduTax:propEduTax, cityTax:cityTax,
      houseNum:houseNum, jonbuExemption:jonbuExemption, jonbuTaxBase:jonbuTaxBase,
      jonbuTax:jonbuTax, jonbuEduTax:jonbuEduTax, total:total
    });

  /* ══════════════════════════════════════════════════════════════
     ★ [v7.2] 증여세 (상속세 및 증여세법 §56)
     ══════════════════════════════════════════════════════════════ */
  } else if (t==='gift') {
    // 증여공제 (현재 UI에 관계 선택 없으므로 성인 직계존비속 5천만 기본)
    var giftExemption = 50000000;
    var taxBase = Math.max(0, amt - giftExemption);

    // 증여세 누진세율 (상증법 §56)
    function calcGiftTax(base) {
      if (base <= 0)           return 0;
      if (base <= 100000000)   return Math.round(base * 0.10);
      if (base <= 500000000)   return Math.round(base * 0.20 - 10000000);
      if (base <= 1000000000)  return Math.round(base * 0.30 - 60000000);
      if (base <= 3000000000)  return Math.round(base * 0.40 - 160000000);
                               return Math.round(base * 0.50 - 460000000);
    }

    var giftTax = calcGiftTax(taxBase);
    items = [{name:'증여세', amount:giftTax}];
    total = giftTax;

    console.log('[EEHO GIFT v7.2]', {
      amt:amt, giftExemption:giftExemption, taxBase:taxBase, giftTax:giftTax
    });

  /* ══════════════════════════════════════════════════════════════
     ★ [v7.2] 상속세 신규 (상속세 및 증여세법 §18~§26)
     ──────────────────────────────────────────────────────────────
     공제 구조:
       일괄공제 5억 (기초2억+인적 vs 일괄 중 큰 금액 → 간이 계산기는 일괄 5억)
       + 배우자 상속공제: 배우자 有 → 최소 5억 추가
       ∴ 배우자 없으면 총 공제 5억, 배우자 있으면 총 공제 10억
     세율: 증여세와 동일 10~50% 누진 5단계
     ══════════════════════════════════════════════════════════════ */
  } else if (t==='inherit') {
    // 상속세 누진세율 (상증법 §26, 증여세와 동일 구간)
    function calcInheritTax(base) {
      if (base <= 0)           return 0;
      if (base <= 100000000)   return Math.round(base * 0.10);
      if (base <= 500000000)   return Math.round(base * 0.20 - 10000000);
      if (base <= 1000000000)  return Math.round(base * 0.30 - 60000000);
      if (base <= 3000000000)  return Math.round(base * 0.40 - 160000000);
                               return Math.round(base * 0.50 - 460000000);
    }

    // 일괄공제 5억
    var bulkDeduction = 500000000;
    // 배우자 상속공제: 배우자 있으면 최소 5억 추가
    var spouseDeduction = (fd.hasSpouse === 'yes') ? 500000000 : 0;
    var totalDeduction = bulkDeduction + spouseDeduction;

    var taxBase = Math.max(0, amt - totalDeduction);
    var inheritTax = calcInheritTax(taxBase);

    items = [{name:'상속세', amount:inheritTax}];
    if (spouseDeduction > 0) {
      items.push({name:'※ 배우자 상속공제 5억 적용', amount:0});
    }
    total = inheritTax;

    console.log('[EEHO INHERIT v7.2]', {
      amt:amt, bulkDeduction:bulkDeduction, spouseDeduction:spouseDeduction,
      totalDeduction:totalDeduction, taxBase:taxBase, inheritTax:inheritTax
    });
  }

  if(total<0) total=0;
  return { items:items, total:total };
}

function renderResult(data){
  $('#resultTotal').text('₩'+fmt(data.total));
  var h='';
  data.items.forEach(function(it){
    if(it.name.indexOf('※')===0){
      h+='<div class="eh-ri eh-ri-note"><span>'+it.name+'</span></div>';
    } else {
      var pf=it.amount<0?'-₩':'₩';
      h+='<div class="eh-ri"><span>'+it.name+'</span><span>'+pf+fmt(Math.abs(it.amount))+'</span></div>';
    }
  });
  $('#resultItems').html(h);
}

$('#backStep3').on('click',function(){ goStep(3); });
$('#resetAll').on('click',function(){
  formData={
    taxType:'cgt',assetType:'re',reSubType:'apt',
    amount:0,address:'',stockName:'',
    regulated:'no',houses:'1',saleDate:'',acqDate:'',
    reside:'2',area:'under85',acqPrice:0,
    stockListed:'listed',stockMajor:'minor',stockSme:'sme',
    hasSpouse:'yes'
  };
  aiState={payload:{},userText:'',callCount:0,sessionId:''};
  currentEstimatedTax=0;
  $('#inpAmount,#inpAcqPrice,#inpAddress,#inpStockName').val('');
  $('#inpAcqDate,#inpSaleDate').val('');
  $('#aiTextInput').val(''); $('#aiTxtCnt').text('0');
  A.find('.eh-type-card').removeClass('active').first().addClass('active');
  A.find('.eh-asset-tab').removeClass('active').first().addClass('active');
  $('#reTypes .eh-chip').removeClass('active').first().addClass('active');
  $('#reTypeSelect').val('apt'); $('#selRegulated').val('no'); $('#selHouses').val('1');
  $('#selReside').val('2'); $('#selArea').val('under85');
  $('#selStockListed').val('listed'); $('#selStockMajor').val('minor'); $('#selStockSme').val('sme');
  $('#selSpouse').val('yes');
  $('#amountKr,#acqPriceKr').text('');
  A.find('[data-g="houses"] .eh-chip').removeClass('active').first().addClass('active');
  A.find('[data-g="regulated"] .eh-chip').removeClass('active').eq(1).addClass('active');
  A.find('[data-g="reside"] .eh-chip').removeClass('active').eq(1).addClass('active');
  A.find('[data-g="area"] .eh-chip').removeClass('active').first().addClass('active');
  $('#regHelpPopup,#stockMajorHelpPopup').addClass('eh-hd');
  goStep(1);
});

/* ================================================================
   AI FLOW
   ================================================================ */
$('#startAI').on('click',function(){ showAI('#aiTextPhase'); });
$('#aiBackToResult').on('click',function(){ goStep(4); });
$('#aiTextInput').on('input',function(){ $('#aiTxtCnt').text($(this).val().length); });

$('#aiSendText').on('click',function(){
  var text=$('#aiTextInput').val().trim();
  if(!text){alert('상황을 입력해주세요.');return;}
  aiState.userText=text; aiState.callCount=0; aiState.sessionId=generateSessionId();
  var chat=$('#aiConvChat').empty();
  addBubble(chat,'user',text);
  addBubble(chat,'ai','안녕하세요, EEHO AI입니다.\n고객님이 제출하신 자료에 최적화된 절세 전략을 구상하고 있습니다.');
  aiState.payload=buildPayload(text);
  console.log('[EEHO] ★ 최종 Payload:',JSON.stringify(aiState.payload,null,2));
  sendToAPI();
});

function sendToAPI(){
  aiState.callCount++;
  $('#aiProgressFill').css('width', Math.min(90,aiState.callCount*25)+'%');
  showAI('#aiLoading');
  callAPI(aiState.payload)
    .then(function(response){
      var data=safeParse(response);
      if(!data||!data.status) throw new Error('올바르지 않은 응답 형식');
      if(data.status==='need_more_info'){ handleNeedMoreInfo(data); return; }
      if(data.status==='success'){ $('#aiProgressFill').css('width','100%'); handleSuccess(data); return; }
      throw new Error('알 수 없는 status: '+data.status);
    })
    .catch(function(err){
      console.error('[EEHO] API 실패:',err);
      alert('AI 분석 중 오류가 발생했습니다.\n'+String(err)+'\n\n다시 시도해주세요.');
      showAI('#aiTextPhase');
    });
}

function handleNeedMoreInfo(data){
  showAI('#aiConvPhase');
  var chat=$('#aiConvChat'), missing=[];
  if(data.missing_variables&&data.missing_variables.length){
    missing=data.missing_variables;
  } else if(data.checklist&&data.checklist.length){
    var seen={};
    data.checklist.forEach(function(item){
      if(item.alias) addBubble(chat,'ai','📋 검토 중인 조항: '+item.alias);
      (item.fields||[]).forEach(function(f){ if(!seen[f]){seen[f]=true;missing.push(f);} });
    });
  }
  addBubble(chat,'ai',data.message||'정확한 분석을 위해 추가 정보가 필요합니다.');
  if(missing.length===0){addBubble(chat,'ai','추가 정보 항목이 비어 있습니다. 다시 시도해주세요.');return;}
  if(missing.length>4) missing=missing.slice(0,4);
  var inputArea=$('#aiConvInputArea').empty();
  missing.forEach(function(varName){
    var label=FIELD_LABELS[varName]||varName;
    var html='<div class="eh-conv-field" data-var="'+varName+'">';
    html+='<label class="eh-conv-label">'+esc(label)+'</label>';
    var type=FIELD_TYPES[varName]||'text';
    if(type==='date'){
      html+='<input type="date" class="eh-date-input eh-conv-input" data-var="'+varName+'">';
    } else {
      html+='<input type="text" class="eh-text-input eh-conv-input" data-var="'+varName+'" placeholder="입력하세요">';
    }
    html+='</div>';
    inputArea.append(html);
  });
  inputArea.append('<button class="eh-btn-primary eh-btn-full eh-conv-submit" id="convSubmit">확인 →</button>');
  chat[0].scrollTop=chat[0].scrollHeight;
}

A.on('click','.eh-conv-toggle-btn',function(){
  $(this).closest('.eh-conv-toggle-row').find('.eh-conv-toggle-btn').removeClass('selected');
  $(this).addClass('selected');
});
A.on('click','.eh-conv-select-btn',function(){
  $(this).closest('.eh-conv-select-row').find('.eh-conv-select-btn').removeClass('selected');
  $(this).addClass('selected');
});
A.on('click','#convSubmit',function(){
  var allOK=true,chat=$('#aiConvChat'),answerTexts=[];
  if(!aiState.payload.additional_data) aiState.payload.additional_data={};
  $('.eh-conv-field').each(function(){
    var varName=$(this).data('var'),label=FIELD_LABELS[varName]||varName,val=$(this).find('.eh-conv-input').val();
    if(!val||val.trim()===''){allOK=false;$(this).addClass('eh-field-error');return;}
    $(this).removeClass('eh-field-error');
    aiState.payload.additional_data[varName]=val.trim();
    answerTexts.push(label+': '+val.trim());
  });
  if(!allOK){alert('모든 항목을 입력해주세요.');return;}
  addBubble(chat,'user',answerTexts.join('\n'));
  $('#aiConvInputArea').empty();
  sendToAPI();
});

function handleSuccess(data){
  var origTotal=currentEstimatedTax, isPASS, detailText, riskText, badgeLabel;
  if(data.result_type){
    isPASS=(data.result_type==='PASS'); detailText=data.details||''; riskText=data.risk_warning||'';
  } else if(data.final_alias){
    isPASS=true; badgeLabel=data.final_alias; detailText=data.calculation||''; riskText='';
  } else {
    isPASS=false; detailText='결과를 분석할 수 없습니다.'; riskText='';
  }
  var $badge=$('#finalResultBadge'); $badge.removeClass('eh-badge-pass eh-badge-fail');
  if(isPASS){
    $badge.addClass('eh-badge-pass'); $('#finalBadgeIcon').text('✓');
    $('#finalBadgeLabel').text(badgeLabel||'비과세 특례 적용 가능'); $('#finalBadgeType').text('PASS');
  } else {
    $badge.addClass('eh-badge-fail'); $('#finalBadgeIcon').text('✗');
    $('#finalBadgeLabel').text(badgeLabel||'비과세 요건 미충족'); $('#finalBadgeType').text('FAIL');
  }
  $('#finalBefore').text('₩'+fmt(origTotal));
  $('#finalAfter').text(isPASS?'₩0 (비과세)':'₩'+fmt(origTotal));
  $('#finalDetails').html(detailText&&detailText.trim()
    ?'<div class="eh-details-content">'+esc(detailText)+'</div>'
    :'<p>상세 분석 결과는 세무 전문가 상담 시 안내드립니다.</p>');
  $('#finalRisks').html(riskText&&riskText.trim()
    ?'<div class="eh-risk-item">'+esc(riskText)+'</div>'
    :'<div class="eh-risk-item eh-risk-none">현재 확인된 리스크가 없습니다.</div>');
  showAI('#aiFinal');
}

function addBubble(container,role,text){
  var html='<div class="eh-bubble '+role+'"><div>'+(role==='ai'?'<div class="eh-bubble-label">EEHO AI</div>':'')+
    '<div class="eh-bubble-content">'+esc(text)+'</div></div></div>';
  container.append(html); container[0].scrollTop=container[0].scrollHeight;
}

$('#backToResult').on('click',function(){ goStep(4); });

/* ================================================================
   INIT
   ================================================================ */
updateProgress(1);
$('#ehLdYear').text(new Date().getFullYear());

})(jQuery);
