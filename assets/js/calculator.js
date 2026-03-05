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
  'cgt': '양도소득세', 'acq': '취득세', 'prop': '재산세/종합부동산세', 'gift': '상속·증여'
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
      case '증여세':       calcData.estimated_gift_tax    = item.amount; break;
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
  var labels={cgt:'양도가액',acq:'취득가액',prop:'공시가격',gift:'증여가액'};
  $('#amountLabel').text(labels[t]||'금액');
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
   ★ [v7.1] 누진세율 헬퍼 (소득세법 §55, 2024년 기준)
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
   ★ [v7.1] calculateTax()
   ──────────────────────────────────────────────────────────────────
   [CGT - 주식] 신규 (소득세법 §104①11호, 2024년 기준)
     · 상장 소액주주  → 비과세
     · 상장 대주주    → 1년 미만 30% / 1년 이상 20%(3억 이하)·25%(초과)
     · 비상장 중소기업 → 10%
     · 비상장 중견/일반 → 20%
     · 기본공제 250만원, 지방소득세 10% 공통 적용
   [CGT - 부동산] v7.0 유지
   [취득세·재산세·증여세] 다음 버전에서 순차 수정 예정
   ================================================================ */
function calculateTax(fd) {
  var amt=fd.amount||0, t=fd.taxType, items=[], total=0;

  if (t === 'cgt') {

    /* ── 주식 CGT ── */
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
          // 소액주주: 장내 비과세
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
        // 대주주
        var taxBase = Math.max(0, gain - 2500000);
        if (holdMonths < 12) {
          yangdoTax = Math.round(taxBase * 0.30);  // 1년 미만 30%
        } else {
          // 1년 이상: 3억 이하 20%, 초과분 25%
          yangdoTax = taxBase <= 300000000
            ? Math.round(taxBase * 0.20)
            : Math.round(300000000 * 0.20 + (taxBase - 300000000) * 0.25);
        }
      } else {
        // 비상장
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

    /* ── 부동산 CGT (v7.0) ── */
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

      var houseNum = 1;
      if(fd.houses==='2') houseNum=2;
      else if(fd.houses==='3'||fd.houses==='multi') houseNum=3;
      var isJungKwa      = (fd.regulated==='yes') && (houseNum>=2);
      var jungKwaAddRate = (houseNum===2)?0.20:(houseNum>=3?0.30:0);

      var ltdRate = 0;
      if (!isJungKwa && !isUnder1yr && !is1to2yr && holdFullYears >= 3) {
        if (fd.houses === '1') {
          var resideYrs = fd.reside==='2'?2 : fd.reside==='5'?5 : fd.reside==='10'?10 : 0;
          ltdRate = Math.min(0.80, Math.min(holdFullYears,10)*0.08 + Math.min(resideYrs,10)*0.04);
        } else {
          ltdRate = Math.min(0.30, holdFullYears * 0.02);
        }
      }

      var ltdAmt    = Math.round(gain * ltdRate);
      var taxBase   = Math.max(0, gain - ltdAmt - 2500000);
      var yangdoTax = isUnder1yr  ? Math.round(taxBase*0.70)
                    : is1to2yr    ? Math.round(taxBase*0.60)
                    : isJungKwa   ? Math.round(calcProgressiveTax(taxBase) + taxBase*jungKwaAddRate)
                    :                calcProgressiveTax(taxBase);
      var localTax = Math.round(yangdoTax * 0.10);
      total = yangdoTax + localTax;
      items = [{ name:'양도소득세', amount:yangdoTax }, { name:'지방소득세', amount:localTax }];

      console.log('[EEHO CGT RE]', {
        gain, holdMonths, holdFullYears, isUnder1yr, is1to2yr,
        isJungKwa, ltdRate, taxBase, yangdoTax, localTax, total
      });
    }

  /* ── 취득세 — v7.2에서 수정 예정 ── */
  } else if (t==='acq') {
    var r=fd.houses==='1'?0.01:(fd.houses==='2'?0.08:0.12);
    if(fd.regulated==='yes'&&fd.houses!=='1') r+=0.02;
    var a=Math.round(amt*r),e=Math.round(a*0.1),ru=Math.round(a*0.02);
    items=[{name:'취득세',amount:a},{name:'지방교육세',amount:e},{name:'농어촌특별세',amount:ru}];
    total=a+e+ru;

  /* ── 재산세/종부세 — v7.2에서 수정 예정 ── */
  } else if (t==='prop') {
    var b=Math.max(0,amt-1200000000)*0.6, p=Math.round(b*0.005), ep=Math.round(p*0.2);
    items=[{name:'재산세',amount:Math.round(amt*0.001)},{name:'종합부동산세',amount:p},{name:'지방교육세',amount:ep}];
    total=Math.round(amt*0.001)+p+ep;

  /* ── 증여세 — v7.3에서 수정 예정 ── */
  } else {
    var tx=Math.max(0,amt-50000000), g=Math.round(tx*0.2), d=-Math.round(g*0.03), eg=Math.round(g*0.1);
    items=[{name:'증여세',amount:g},{name:'신고세액공제',amount:d},{name:'지방교육세',amount:eg}];
    total=g+d+eg;
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
    stockListed:'listed',stockMajor:'minor',stockSme:'sme'
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
