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
  // v7.1: 주식 CGT 전용
  stockListed:'listed', stockMajor:'minor', stockSme:'sme',
  // v7.2: 상속세 전용
  hasSpouse:'yes',
  childCount:'1',
  decedentHouses:'1',
  cohabitation:'no',
  cohabYears:'over10',
  heirHasHouse:'no',
  priorGift:'no',
  // 상속세 복수 자산
  inheritAssets:[],
  // 상속세 채무
  inheritDebts:[],
  // 증여세 전용
  giftRelation:'child_adult',
  priorGiftFromSame:'no',
  priorGiftAmount:0,
  // 취득세 전용
  acqReason:'buy',
  // v7.5: 재산세/종부세 — 주택별 공시가격 배열
  propHouseAmounts:[],
};

var aiState = {
  payload:{}, userText:'', callCount:0, sessionId:'',
  applicableLaw:'', lawSummary:'',
  checklistAnswers:[], factSummary:'',
  supplementText:'', isSecondRound:false,
  stage0Analysis: null,
  guideSections: null,
};

var currentStep        = 1;
var currentEstimatedTax= 0;
var lastCalcResult     = { items:[], total:0 };

/* ================================================================
   세션 ID
   ================================================================ */
function generateSessionId(){
  return 'usr_'+Date.now()+'_session_'+String(Math.floor(Math.random()*100)).padStart(2,'0');
}

/* ================================================================
   매핑 테이블
   ================================================================ */
var MAP_TAX_CATEGORY = {
  'cgt':'양도소득세','acq':'취득세','prop':'재산세/종합부동산세',
  'gift':'증여세','inherit':'상속세'
};
var MAP_TYPE_ASSET = {
  'apt':'아파트','villa':'빌라','officetel':'오피스텔',
  'commercial':'상가','building':'건물','land':'토지','rights':'입주권/분양권',
  'house_gen':'주택(아파트/빌라/단독)','officetel_res':'주거용 오피스텔',
  'officetel_com':'상업용 오피스텔/상가','land_farm':'토지(농지)','land_gen':'토지(일반)',
  'building_gen':'건물/공장'
};

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
function cleanVarNames(text){
  if(!text)return'';
  text=text.replace(/['"]?[a-z][a-z0-9]*(_[a-z0-9]+)+['"]?/gi,'').trim();
  text=text.replace(/에\s*모름/g,'').trim();
  text=text.replace(/\s{2,}/g,' ').replace(/[,.\s]+$/,'').trim();
  return text;
}
function autoFitAmount(el){
  var len=el.val().length;
  if(len>15) el.css('font-size','18px');
  else if(len>12) el.css('font-size','22px');
  else if(len>9) el.css('font-size','28px');
  else el.css('font-size','');
}
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

/* ================================================================
   buildPayload — 백엔드 JSON Payload 명세서 기반
   ================================================================ */
function buildPayload(freeText){
  function safe(v){return(v===undefined||v===null||v==='')? '모름':v;}

  var taxTypeStr   = MAP_TAX_CATEGORY[formData.taxType]||'모름';
  var addressStr   = ($('#inpAddress').val()||'').trim()||'모름';
  var areaMap      = {'under85':'85㎡ 이하','over85':'85㎡ 초과','unknown':'모름'};
  var areaStr      = areaMap[formData.area]||'모름';
  var regulatedMap = {'yes':'여','no':'부','unknown':'모름'};
  var regulatedStr = regulatedMap[formData.regulated]||'모름';
  var housesMap    = {'1':'1주택','2':'2주택','3':'3주택','multi':'4주택 이상','unknown':'모름'};
  var houseStr     = housesMap[formData.houses]||'모름';
  var resideMap    = {'0':'없음','2':'2년+','5':'5년+','10':'10년+','unknown':'모름'};
  var resideStr    = resideMap[formData.reside]||'모름';

  var assetTypeStr;
  if(formData.assetType==='stock') assetTypeStr='주식';
  else assetTypeStr = MAP_TYPE_ASSET[formData.reSubType]||'모름';

  // calculated_data 매핑
  var calcData = {estimated_total_tax: lastCalcResult.total||0};
  (lastCalcResult.items||[]).forEach(function(item){
    switch(item.name){
      case '양도소득세':            calcData.estimated_yangdo_tax=item.amount;break;
      case '지방소득세':            calcData.estimated_local_tax=item.amount;break;
      case '중과가산':              calcData.estimated_surcharge=item.amount;break;
      case '취득세':                calcData.estimated_acq_tax=item.amount;break;
      case '지방교육세':            calcData.estimated_local_edu_tax=item.amount;break;
      case '농어촌특별세':          calcData.estimated_rural_tax=item.amount;break;
      case '재산세':                calcData.estimated_property_tax=item.amount;break;
      case '종합부동산세':          calcData.estimated_comprehensive_tax=item.amount;break;
      case '지방교육세(재산세)':    calcData.estimated_prop_edu_tax=item.amount;break;
      case '농어촌특별세(종부세)':  calcData.estimated_jonbu_rural_tax=item.amount;break;
      case '도시지역분':            calcData.estimated_city_tax=item.amount;break;
      case '증여세':                calcData.estimated_gift_tax=item.amount;break;
      case '상속세':                calcData.estimated_inherit_tax=item.amount;break;
      case '신고세액공제':          calcData.estimated_filing_deduction=item.amount;break;
    }
  });

  // condition_info 구성
  var conditionInfo = {
    is_regulated_area: regulatedStr,
    house_count:       houseStr,
    residence_period:  resideStr
  };
  if(formData.taxType==='cgt' && formData.assetType==='stock'){
    conditionInfo.stock_listed = formData.stockListed==='listed'?'상장':'비상장';
    if(formData.stockListed==='listed'){
      conditionInfo.stock_major = formData.stockMajor==='major'?'대주주':'소액주주';
    } else {
      conditionInfo.stock_corp_size = ({sme:'중소기업',mid:'중견기업',large:'일반법인'})[formData.stockSme]||'중소기업';
    }
  }
  if(formData.taxType==='inherit'){
    conditionInfo.has_spouse        = formData.hasSpouse==='yes'?'여':'부';
    conditionInfo.child_count       = formData.childCount;
    conditionInfo.decedent_houses   = formData.decedentHouses;
    conditionInfo.cohabitation      = formData.cohabitation==='yes'?'여':(formData.cohabitation==='no'?'부':'모름');
    if(formData.cohabitation==='yes'){
      conditionInfo.cohab_years = ({'under5':'5년 미만','5to10':'5년~10년','over10':'10년 이상'})[formData.cohabYears]||'모름';
    }
    conditionInfo.heir_has_house = formData.heirHasHouse==='yes'?'여':(formData.heirHasHouse==='no'?'부':'모름');
    conditionInfo.prior_gift     = formData.priorGift==='yes'?'여':(formData.priorGift==='no'?'부':'모름');
    if(formData.inheritAssets.length>0){
      conditionInfo.inherit_assets = formData.inheritAssets.map(function(a){
        return {type:a.type, amount:a.amount};
      });
    }
    if(formData.inheritDebts.length>0){
      var totalDebt=0;
      conditionInfo.inherit_debts = formData.inheritDebts.map(function(d){
        totalDebt+=d.amount||0;
        return {type:d.type, amount:d.amount};
      });
      conditionInfo.total_debt = totalDebt;
    }
  }
  if(formData.taxType==='acq'){
    var reasonLabel=({'buy':'매매','inherit':'상속 취득','gift':'증여 취득','new_build':'신축·분양','auction':'경매·공매'})[formData.acqReason]||'매매';
    conditionInfo.acq_reason = reasonLabel;
  }
  if(formData.taxType==='gift'){
    var relLabel=({'child_adult':'직계비속(성인 자녀)','child_minor':'직계비속(미성년 자녀)','spouse':'배우자','parent':'직계존속(부모)','other':'기타 친족'})[formData.giftRelation]||'모름';
    conditionInfo.gift_relation       = relLabel;
    conditionInfo.prior_gift_from_same = formData.priorGiftFromSame==='yes'?'여':(formData.priorGiftFromSame==='no'?'부':'모름');
    if(formData.priorGiftFromSame==='yes' && formData.priorGiftAmount>0){
      conditionInfo.prior_gift_amount = formData.priorGiftAmount;
    }
  }
  if(formData.taxType==='prop' && formData.propHouseAmounts.length>0){
    conditionInfo.prop_house_prices = formData.propHouseAmounts.filter(function(a){return a>0;});
  }

  return {
    session_id:   aiState.sessionId,
    tax_category: {type: taxTypeStr},
    structured_data: {
      asset_info:     {asset_type:assetTypeStr, address:addressStr, area_size:areaStr},
      price_info:     {buy_price:formData.acqPrice||0, sell_price:formData.amount||0},
      date_info:      {buy_date:safe($('#inpAcqDate').val()), sell_date:safe($('#inpSaleDate').val())},
      condition_info: conditionInfo
    },
    calculated_data:   calcData,
    unstructured_data: {user_context: freeText||''}
  };
}

/* ================================================================
   callAPI — WordPress AJAX 프록시 경유
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
var AI_PHASES = ['#aiTextPhase','#aiChecklistPhase','#aiConfirmPhase','#aiSupplementPhase','#aiConvPhase','#aiLoading','#aiFinal'];

function goStep(n){
  currentStep=n;
  A.find('.eh-step').removeClass('active');
  A.find('.eh-step[data-step="'+n+'"]').addClass('active');
  hideAI(); updateProgress(n); scrollTop();
}
function hideAI(){$(AI_PHASES.join(',')).removeClass('active');}
function showAI(id){A.find('.eh-step').removeClass('active');hideAI();$(id).addClass('active');scrollTop();}
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
  var labels={cgt:'양도가액',acq:'취득가액',prop:'공시가격',gift:'증여가액',inherit:'상속재산가액'};
  $('#amountLabel').text(labels[t]||'금액');

  $('#inheritMultiAsset').hide();
  $('#propHouseSection').hide();
  $('#singleAmountSection').show();
  $('#reAddressWrap').show();
  $('#reTypeDropWrap').show();

  updatePropertyTypeOptions(t);

  if(t==='cgt'){
    $('#assetTabs').show();$('#tabStock2').removeClass('dis').show();$('#tabCash2').addClass('dis');
    $('#s2Title').text('자산과 금액을 입력하세요');
  } else if(t==='acq'){
    $('#assetTabs').hide();formData.assetType='re';
    $('#s2Title').text('취득 대상과 금액을 입력하세요');
  } else if(t==='gift'){
    $('#assetTabs').show();$('#tabStock2,#tabCash2').removeClass('dis').show();
    $('#s2Title').text('증여 재산과 금액을 입력하세요');
  } else if(t==='inherit'){
    $('#assetTabs').hide();formData.assetType='re';
    $('#s2Title').text('상속 재산 정보를 입력하세요');
    $('#singleAmountSection').hide();
    $('#reAddressWrap').hide();
    $('#reTypeDropWrap').hide();
    $('#inheritMultiAsset').show();
    if(formData.inheritAssets.length===0) addInheritAssetRow();
    updateInheritTotal();
  } else if(t==='prop'){
    $('#assetTabs').hide();formData.assetType='re';
    $('#s2Title').text('보유 부동산의 공시가격을 입력하세요');
    $('#singleAmountSection').hide();
    $('#reAddressWrap').hide();
    $('#reTypeDropWrap').hide();
    $('#propHouseSection').show();
    initPropHouseRows();
  }
  updateReTypes();
}

function updatePropertyTypeOptions(taxType){
  var $sel=$('#reTypeSelect');
  var opts;
  if(taxType==='acq'){
    opts=[
      {v:'house_gen',     t:'주택 (아파트/빌라/단독)'},
      {v:'officetel_res', t:'주거용 오피스텔'},
      {v:'officetel_com', t:'상업용 오피스텔/상가'},
      {v:'land_gen',      t:'토지 (일반)'},
      {v:'land_farm',     t:'토지 (농지)'},
      {v:'building_gen',  t:'건물/공장'}
    ];
  } else {
    opts=[
      {v:'apt',       t:'아파트'},
      {v:'villa',     t:'빌라'},
      {v:'officetel', t:'오피스텔'},
      {v:'commercial',t:'상가'},
      {v:'building',  t:'건물'},
      {v:'land',      t:'토지'},
      {v:'rights',    t:'입주권/분양권'}
    ];
  }
  $sel.empty();
  opts.forEach(function(o){$sel.append('<option value="'+o.v+'">'+o.t+'</option>');});
  formData.reSubType=$sel.val();
}

/* ================================================================
   재산세/종부세 — 보유주택 통합 입력 (Step 2)
   ================================================================ */
function getHouseCount(){
  var h=formData.houses;
  if(h==='1') return 1;
  if(h==='2') return 2;
  if(h==='3') return 3;
  if(h==='multi') return 4;
  return 1;
}

function initPropHouseRows(){
  var count=getHouseCount();
  formData.propHouseAmounts=[];
  var $list=$('#propDynamicHouses').empty();
  for(var i=0;i<count;i++){
    formData.propHouseAmounts.push(0);
    appendPropHouseRow($list, i);
  }
  $('#addPropHouseExtra').toggle(formData.houses==='multi');
  $('#propTotalWrap').toggle(count>=2);
  updatePropTotal();
}

function appendPropHouseRow($list, idx){
  var html='<div class="eh-prop-row" data-idx="'+idx+'">'
    +'<span class="eh-prop-label">주택 '+(idx+1)+'</span>'
    +'<div class="eh-amount-box sm" style="flex:1">'
    +'<div class="eh-amount-display sm"><input type="text" class="eh-amount-input sm eh-prop-price" placeholder="공시가격" inputmode="numeric" data-idx="'+idx+'"><span class="eh-amount-unit">원</span></div>'
    +'<div class="eh-amount-kr eh-prop-price-kr"></div>'
    +'</div>';
  if(formData.houses==='multi' && idx>=4){
    html+='<button class="eh-btn-icon eh-prop-extra-remove" title="삭제">&times;</button>';
  }
  html+='</div>';
  $list.append(html);
}

$('#selHousesProp').on('change',function(){
  formData.houses=$(this).val();
  initPropHouseRows();
});

A.on('input','.eh-prop-price',function(){
  var v=raw($(this).val()),n=parseInt(v)||0;
  $(this).val(n>0?fmt(n):'');
  var idx=parseInt($(this).data('idx'));
  if(!isNaN(idx) && idx<formData.propHouseAmounts.length){
    formData.propHouseAmounts[idx]=n;
  }
  $(this).closest('.eh-prop-row').find('.eh-prop-price-kr').text(numToKorean(n));
  updatePropTotal();
});

$('#addPropHouseExtra').on('click',function(){
  var idx=formData.propHouseAmounts.length;
  formData.propHouseAmounts.push(0);
  appendPropHouseRow($('#propDynamicHouses'), idx);
  $('#propTotalWrap').show();
  updatePropTotal();
});

A.on('click','.eh-prop-extra-remove',function(){
  var $row=$(this).closest('.eh-prop-row');
  var idx=parseInt($row.data('idx'));
  formData.propHouseAmounts.splice(idx,1);
  $row.remove();
  $('#propDynamicHouses .eh-prop-row').each(function(i){
    $(this).attr('data-idx',i);
    $(this).find('.eh-prop-label').text('주택 '+(i+1));
    $(this).find('.eh-prop-price').attr('data-idx',i);
  });
  updatePropTotal();
});

function updatePropTotal(){
  var sum=0;
  formData.propHouseAmounts.forEach(function(a){sum+=a||0;});
  formData.amount=sum;
  $('#propTotalAmt').text('₩'+fmt(sum));
  $('#propTotalKr').text(numToKorean(sum));
}

/* ================================================================
   상속세 복수 자산
   ================================================================ */
function addInheritAssetRow(){
  var idx=formData.inheritAssets.length;
  formData.inheritAssets.push({type:'부동산',amount:0});
  var html='<div class="eh-inherit-row" data-idx="'+idx+'">'
    +'<select class="eh-select-input eh-inherit-type" style="flex:1;min-width:120px">'
    +'<option value="부동산" selected>부동산</option>'
    +'<option value="금융자산">금융자산 (예금/주식)</option>'
    +'<option value="보험금">보험금</option>'
    +'<option value="퇴직금">퇴직금/연금</option>'
    +'<option value="기타">기타 자산</option>'
    +'</select>'
    +'<div class="eh-amount-box sm" style="flex:2">'
    +'<div class="eh-amount-display sm"><input type="text" class="eh-amount-input sm eh-inherit-amt" placeholder="0" inputmode="numeric"><span class="eh-amount-unit">원</span></div>'
    +'<div class="eh-amount-kr eh-inherit-amt-kr"></div>'
    +'</div>'
    +'<button class="eh-btn-icon eh-inherit-remove" title="삭제">&times;</button>'
    +'</div>';
  $('#inheritAssetList').append(html);
}
A.on('click','#addInheritAsset',function(){addInheritAssetRow();});
A.on('click','.eh-inherit-remove',function(){
  var $row=$(this).closest('.eh-inherit-row');
  var idx=$row.index();
  formData.inheritAssets.splice(idx,1);
  $row.remove();
  $('#inheritAssetList .eh-inherit-row').each(function(i){$(this).attr('data-idx',i);});
  updateInheritTotal();
});
A.on('input','.eh-inherit-amt',function(){
  var v=raw($(this).val()),n=parseInt(v)||0;
  $(this).val(n>0?fmt(n):'');
  var $row=$(this).closest('.eh-inherit-row');
  var idx=$row.index();
  if(formData.inheritAssets[idx]) formData.inheritAssets[idx].amount=n;
  $row.find('.eh-inherit-amt-kr').text(numToKorean(n));
  updateInheritTotal();
});
A.on('change','.eh-inherit-type',function(){
  var $row=$(this).closest('.eh-inherit-row');
  var idx=$row.index();
  if(formData.inheritAssets[idx]) formData.inheritAssets[idx].type=$(this).val();
});
function updateInheritTotal(){
  var sum=0;
  formData.inheritAssets.forEach(function(a){sum+=a.amount||0;});
  formData.amount=sum;
  $('#inheritTotalAmt').text('₩'+fmt(sum));
  $('#inheritTotalKr').text(numToKorean(sum));
}

/* ================================================================
   상속세 채무 입력
   ================================================================ */
function addInheritDebtRow(){
  var idx=formData.inheritDebts.length;
  formData.inheritDebts.push({type:'금융채무',amount:0});
  var html='<div class="eh-inherit-row eh-debt-row" data-idx="'+idx+'">'
    +'<select class="eh-select-input eh-debt-type" style="flex:1;min-width:120px">'
    +'<option value="금융채무" selected>금융채무 (대출)</option>'
    +'<option value="임대보증금">임대보증금</option>'
    +'<option value="미납세금">미납세금</option>'
    +'<option value="장례비용">장례비용</option>'
    +'<option value="기타채무">기타 채무</option>'
    +'</select>'
    +'<div class="eh-amount-box sm" style="flex:2">'
    +'<div class="eh-amount-display sm"><input type="text" class="eh-amount-input sm eh-debt-amt" placeholder="0" inputmode="numeric"><span class="eh-amount-unit">원</span></div>'
    +'<div class="eh-amount-kr eh-debt-amt-kr"></div>'
    +'</div>'
    +'<button class="eh-btn-icon eh-debt-remove" title="삭제">&times;</button>'
    +'</div>';
  $('#inheritDebtList').append(html);
  $('#debtTotalWrap').show();
}
A.on('click','#addInheritDebt',function(){addInheritDebtRow();});
A.on('click','.eh-debt-remove',function(){
  var $row=$(this).closest('.eh-debt-row');
  var idx=$row.index();
  formData.inheritDebts.splice(idx,1);
  $row.remove();
  $('#inheritDebtList .eh-debt-row').each(function(i){$(this).attr('data-idx',i);});
  updateDebtTotal();
  if(formData.inheritDebts.length===0) $('#debtTotalWrap').hide();
});
A.on('input','.eh-debt-amt',function(){
  var v=raw($(this).val()),n=parseInt(v)||0;
  $(this).val(n>0?fmt(n):'');
  var $row=$(this).closest('.eh-debt-row');
  var idx=$row.index();
  if(formData.inheritDebts[idx]) formData.inheritDebts[idx].amount=n;
  $row.find('.eh-debt-amt-kr').text(numToKorean(n));
  updateDebtTotal();
});
A.on('change','.eh-debt-type',function(){
  var $row=$(this).closest('.eh-debt-row');
  var idx=$row.index();
  if(formData.inheritDebts[idx]) formData.inheritDebts[idx].type=$(this).val();
});
function updateDebtTotal(){
  var sum=0;
  formData.inheritDebts.forEach(function(d){sum+=d.amount||0;});
  $('#debtTotalAmt').text('-₩'+fmt(sum));
  $('#debtTotalKr').text(sum>0?numToKorean(sum):'');
}

/* ================================================================
   Step 2 공통 UI
   ================================================================ */
function updateReTypes(){
  var isRe=formData.assetType==='re',isSt=formData.assetType==='stock';
  var t=formData.taxType;
  if(t==='inherit'||t==='prop'){
    $('#reTypeDropWrap').hide();$('#reAddressWrap').hide();
  } else {
    $('#reTypeDropWrap').toggle(isRe);$('#reAddressWrap').toggle(isRe);
  }
  $('#stockNameWrap').toggleClass('eh-hd',!isSt);
}
A.on('click','.eh-asset-tab',function(){
  if($(this).hasClass('dis'))return;
  $(this).closest('.eh-asset-tabs').find('.eh-asset-tab').removeClass('active');
  $(this).addClass('active');formData.assetType=$(this).data('v');updateReTypes();
});
$('#reTypeSelect').on('change',function(){formData.reSubType=$(this).val();});

$('#inpAmount').on('input',function(){
  var v=raw($(this).val()),n=parseInt(v)||0;
  $(this).val(n>0?fmt(n):'');formData.amount=n;$('#amountKr').text(numToKorean(n));
  autoFitAmount($(this));
});
A.on('click','.eh-quick',function(){
  var a=+$(this).data('a');
  if(a===0)formData.amount=0;else formData.amount+=a;
  $('#inpAmount').val(formData.amount>0?fmt(formData.amount):'').trigger('input');
});
$('#inpAcqPrice').on('input',function(){
  var v=raw($(this).val()),n=parseInt(v)||0;
  $(this).val(n>0?fmt(n):'');formData.acqPrice=n;$('#acqPriceKr').text(numToKorean(n));
  autoFitAmount($(this));
});
$('#inpAddress').on('input',function(){formData.address=$(this).val();});
$('#inpStockName').on('input',function(){formData.stockName=$(this).val();});

/* ================================================================
   Step 2 → Step 3 (또는 바로 Step 4)
   ================================================================ */
$('#toStep3').on('click',function(){
  var t=formData.taxType;

  if(t==='inherit'){
    updateInheritTotal();
    if(formData.amount<=0){alert('상속 재산 금액을 입력해주세요.');return;}
  } else if(t==='prop'){
    updatePropTotal();
    if(formData.amount<=0){alert('공시가격을 입력해주세요.');return;}
  } else {
    if(formData.amount<=0){alert('금액을 입력해주세요.');return;}
  }
  if(formData.assetType==='re' && t!=='inherit' && t!=='prop'){
    var addr=$('#inpAddress').val().trim();
    if(!addr){alert('주소를 입력해주세요.');$('#inpAddress').focus();return;}
  }

  // 재산세/종부세: Step 3 스킵 → 바로 Step 4
  if(t==='prop'){
    var result=calculateTax(formData);
    currentEstimatedTax=result.total;
    lastCalcResult=result;
    renderResult(result);
    goStep(4);
    return;
  }

  configStep3();goStep(3);
});
$('#backStep1').on('click',function(){goStep(1);});

/* ================================================================
   STEP 3
   ================================================================ */
function configStep3(){
  var t=formData.taxType, asset=formData.assetType;
  A.find('.eh-step[data-step="3"] .eh-title').text('상세 조건을 선택하세요');
  $('#f3StockListed,#f3StockMajor,#f3StockSme').addClass('eh-hd');
  $('#f3GiftRelation').addClass('eh-hd');
  $('#f3AcqReason').addClass('eh-hd');
  $('#f3GiftSection').addClass('eh-hd');
  $('#f3InheritDebt').css('display','none');

  if(t==='cgt'){
    if(asset==='stock'){
      $('#f3Dates,#f3AcqPrice').show();
      $('#f3Reg,#f3Houses,#f3Reside,#f3Area').hide();
      $('#f3StockListed').removeClass('eh-hd');
      updateStockSubFields();
    } else {
      $('#f3Dates,#f3AcqPrice,#f3Reg,#f3Houses,#f3Reside,#f3Area').show();
    }
  } else if(t==='acq'){
    $('#f3Dates,#f3AcqPrice,#f3Reside').hide();
    $('#f3Reg,#f3Houses,#f3Area').show();
    $('#f3AcqReason').removeClass('eh-hd');
    A.find('.eh-step[data-step="3"] .eh-title').text('취득 조건');
  } else if(t==='prop'){
    $('#f3Dates,#f3AcqPrice,#f3Reg,#f3Houses,#f3Reside,#f3Area').hide();
  } else if(t==='gift'){
    $('#f3Dates,#f3AcqPrice,#f3Houses,#f3Reside,#f3Area,#f3Reg').hide();
    $('#f3GiftSection').removeClass('eh-hd');
    A.find('.eh-step[data-step="3"] .eh-title').text('증여 관계 및 조건');
  } else if(t==='inherit'){
    $('#f3Dates,#f3AcqPrice,#f3Reg,#f3Houses,#f3Reside,#f3Area').hide();
    A.find('.eh-step[data-step="3"] .eh-title').text('채무 및 공제 항목');
    $('#f3InheritDebt').css('display','block');
  }
}

function updateStockSubFields(){
  if(formData.stockListed==='listed'){
    $('#f3StockMajor').removeClass('eh-hd');$('#f3StockSme').addClass('eh-hd');
  } else {
    $('#f3StockMajor').addClass('eh-hd');$('#f3StockSme').removeClass('eh-hd');
  }
}

$('#selStockListed').on('change',function(){formData.stockListed=$(this).val();updateStockSubFields();});
$('#selStockMajor').on('change',function(){formData.stockMajor=$(this).val();});
$('#selStockSme').on('change',function(){formData.stockSme=$(this).val();});
$('#selSpouse').on('change',function(){formData.hasSpouse=$(this).val();});
$('#selChildCount').on('change',function(){formData.childCount=$(this).val();});
$('#selDecedentHouses').on('change',function(){formData.decedentHouses=$(this).val();});
$('#selCohabitation').on('change',function(){
  formData.cohabitation=$(this).val();
  $('#f3CohabYears').toggle($(this).val()==='yes');
});
$('#selCohabYears').on('change',function(){formData.cohabYears=$(this).val();});
$('#selHeirHasHouse').on('change',function(){formData.heirHasHouse=$(this).val();});
$('#selPriorGift').on('change',function(){formData.priorGift=$(this).val();});
$('#selGiftRelation').on('change',function(){formData.giftRelation=$(this).val();});

/* 증여세 관계 카드 클릭 */
A.on('click','.eh-gift-rel-card',function(){
  $('.eh-gift-rel-card').removeClass('active');
  $(this).addClass('active');
  var rel=$(this).data('rel');
  formData.giftRelation=rel;
  $('#selGiftRelation').val(rel);
});
$('#selPriorGiftFromSame').on('change',function(){
  formData.priorGiftFromSame=$(this).val();
  if($(this).val()==='yes'){$('#f3PriorGiftDetail').removeClass('eh-hd');}
  else{$('#f3PriorGiftDetail').addClass('eh-hd');formData.priorGiftAmount=0;$('#inpPriorGiftAmt').val('');}
});
$('#inpPriorGiftAmt').on('input',function(){
  var v=parseInt($(this).val().replace(/[^0-9]/g,''))||0;
  $(this).val(v?v.toLocaleString():'');
  formData.priorGiftAmount=v;
  $('#priorGiftAmtKr').text(v?numToKorean(v):'');
});

$('#selAcqReason').on('change',function(){formData.acqReason=$(this).val();});

$('#stockMajorHelpBtn').on('click',function(e){e.preventDefault();$('#stockMajorHelpPopup').toggleClass('eh-hd');});
$('#stockMajorHelpClose').on('click',function(){$('#stockMajorHelpPopup').addClass('eh-hd');});

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

/* ================================================================
   누진세율 헬퍼
   ================================================================ */
function calcProgressiveTax(base){
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
   calculateTax() — 5개 세목
   ================================================================ */
function calculateTax(fd){
  var amt=fd.amount||0, t=fd.taxType, items=[], total=0;

  /* ── 양도소득세 ── */
  if(t==='cgt'){
    if(fd.assetType==='stock'){
      var gain=Math.max(0,amt-(fd.acqPrice||0));
      var holdMonths=0;
      if(fd.acqDate&&fd.saleDate){
        var d1=new Date(fd.acqDate),d2=new Date(fd.saleDate);
        holdMonths=(d2.getFullYear()-d1.getFullYear())*12+(d2.getMonth()-d1.getMonth());
      }
      var yangdoTax=0;
      if(fd.stockListed==='listed'){
        if(fd.stockMajor!=='major'){
          return {items:[{name:'양도소득세',amount:0},{name:'지방소득세',amount:0},{name:'※ 상장주식 소액주주 비과세',amount:0}],total:0};
        }
        var taxBase=Math.max(0,gain-2500000);
        if(holdMonths<12) yangdoTax=Math.round(taxBase*0.30);
        else yangdoTax=taxBase<=300000000?Math.round(taxBase*0.20):Math.round(300000000*0.20+(taxBase-300000000)*0.25);
      } else {
        var taxBase=Math.max(0,gain-2500000);
        var rate=(fd.stockSme==='sme')?0.10:0.20;
        yangdoTax=Math.round(taxBase*rate);
      }
      var localTax=Math.round(yangdoTax*0.10);
      total=yangdoTax+localTax;
      items=[{name:'양도소득세',amount:yangdoTax},{name:'지방소득세',amount:localTax}];

    } else {
      var gain=Math.max(0,amt-(fd.acqPrice||0));
      var holdMonths=0;
      if(fd.acqDate&&fd.saleDate){
        var d1=new Date(fd.acqDate),d2=new Date(fd.saleDate);
        holdMonths=(d2.getFullYear()-d1.getFullYear())*12+(d2.getMonth()-d1.getMonth());
      }
      var holdFullYears=Math.floor(holdMonths/12);
      var isUnder1yr=holdMonths>0&&holdMonths<12;
      var is1to2yr=holdMonths>=12&&holdMonths<24;
      var isHousing=(fd.reSubType==='apt'||fd.reSubType==='villa'||fd.reSubType==='officetel'||fd.reSubType==='rights');
      var houseNum=1;
      if(fd.houses==='2')houseNum=2;else if(fd.houses==='3'||fd.houses==='multi')houseNum=3;
      var isJungKwa=(fd.regulated==='yes')&&(houseNum>=2);
      var jungKwaAddRate=(houseNum===2)?0.20:(houseNum>=3?0.30:0);

      var isOneHouseTaxFree=false;
      if(fd.houses==='1' && isHousing && holdFullYears>=2){
        if(fd.regulated==='yes'){
          var resideYrs=fd.reside==='2'?2:fd.reside==='5'?5:fd.reside==='10'?10:0;
          if(resideYrs>=2) isOneHouseTaxFree=true;
        } else {
          isOneHouseTaxFree=true;
        }
      }

      if(isOneHouseTaxFree){
        if(amt<=1200000000){
          return {items:[
            {name:'양도소득세',amount:0},{name:'지방소득세',amount:0},
            {name:'※ 1세대1주택 비과세 (소득세법 §89)',amount:0}
          ],total:0};
        } else {
          gain=Math.round(gain*(amt-1200000000)/amt);
          items.push({name:'※ 1세대1주택 고가주택 — 12억 초과분 안분 과세',amount:0});
        }
      }

      var ltdRate=0;
      if(!isJungKwa&&!isUnder1yr&&!is1to2yr&&holdFullYears>=3){
        if(fd.houses==='1'){
          var resideYrs=fd.reside==='2'?2:fd.reside==='5'?5:fd.reside==='10'?10:0;
          ltdRate=Math.min(0.80,Math.min(holdFullYears,10)*0.04+Math.min(resideYrs,10)*0.04);
        } else {
          ltdRate=Math.min(0.30,holdFullYears*0.02);
        }
      }
      var ltdAmt=Math.round(gain*ltdRate);
      var taxBase=Math.max(0,gain-ltdAmt-2500000);
      var yangdoTax;
      if(isUnder1yr)      yangdoTax=isHousing?Math.round(taxBase*0.70):Math.round(taxBase*0.50);
      else if(is1to2yr)   yangdoTax=isHousing?Math.round(taxBase*0.60):Math.round(taxBase*0.40);
      else if(isJungKwa)  yangdoTax=Math.round(calcProgressiveTax(taxBase)+taxBase*jungKwaAddRate);
      else                yangdoTax=calcProgressiveTax(taxBase);

      var localTax=Math.round(yangdoTax*0.10);
      total=yangdoTax+localTax;
      items.unshift({name:'양도소득세',amount:yangdoTax});
      items.splice(1,0,{name:'지방소득세',amount:localTax});
    }

  /* ── 취득세 ── */
  } else if(t==='acq'){
    function normalAcqRate(price){
      if(price<=600000000) return 0.01;
      if(price<=900000000) return(price/100000000*2/3-3)/100;
      return 0.03;
    }
    var houseNum=fd.houses==='1'?1:fd.houses==='2'?2:fd.houses==='3'?3:fd.houses==='multi'?4:1;
    var isReg=(fd.regulated==='yes');
    var isNonHousing=(fd.reSubType==='officetel_com'||fd.reSubType==='land_gen'||fd.reSubType==='land_farm'||fd.reSubType==='building_gen');
    var rate;
    if(isNonHousing){
      rate=(fd.reSubType==='land_farm')?0.03:0.04;
    } else if(houseNum===1){
      rate=normalAcqRate(amt);
    } else if(houseNum===2){
      rate=isReg?0.08:normalAcqRate(amt);
    } else {
      rate=isReg?0.12:0.08;
    }
    var acqTax=Math.round(amt*rate);
    var eduTax=Math.round(acqTax*0.1);
    var ruralTax=0;
    if(fd.area==='over85') ruralTax=Math.round(amt*0.002);
    items=[{name:'취득세',amount:acqTax},{name:'지방교육세',amount:eduTax}];
    if(ruralTax>0) items.push({name:'농어촌특별세',amount:ruralTax});
    if(isNonHousing) items.push({name:'※ 비주택 일반세율 적용',amount:0});
    total=acqTax+eduTax+ruralTax;

  /* ── 재산세/종부세 ── */
  } else if(t==='prop'){
    var fairRatio=0.60;
    function calcPropertyTax(base){
      if(base<=0)return 0;
      if(base<=60000000) return Math.round(base*0.001);
      if(base<=150000000)return Math.round(base*0.0015-30000);
      if(base<=300000000)return Math.round(base*0.0025-180000);
      return Math.round(base*0.004-630000);
    }
    function calcJonbuTax(base){
      if(base<=0)return 0;
      if(base<=300000000)  return Math.round(base*0.005);
      if(base<=600000000)  return Math.round(base*0.007-600000);
      if(base<=1200000000) return Math.round(base*0.010-2400000);
      if(base<=2500000000) return Math.round(base*0.013-6000000);
      if(base<=5000000000) return Math.round(base*0.015-11000000);
      if(base<=9400000000) return Math.round(base*0.020-36000000);
      return Math.round(base*0.027-101800000);
    }

    var allAmounts=(fd.propHouseAmounts&&fd.propHouseAmounts.length>0)
      ? fd.propHouseAmounts.filter(function(a){return a>0;})
      : [amt];

    var totalPropTax=0,totalPropEdu=0,totalCity=0;
    allAmounts.forEach(function(propAmt){
      var propBase=Math.round(propAmt*fairRatio);
      totalPropTax+=calcPropertyTax(propBase);
      totalPropEdu+=Math.round(calcPropertyTax(propBase)*0.20);
      totalCity+=Math.round(propBase*0.0014);
    });

    var totalAmt=0; allAmounts.forEach(function(a){totalAmt+=a;});
    var houseNum=fd.houses==='1'?1:fd.houses==='2'?2:fd.houses==='3'?3:fd.houses==='multi'?4:1;
    var jonbuExemption=(houseNum===1)?1200000000:900000000;
    var jonbuTaxBase=Math.round(Math.max(0,totalAmt-jonbuExemption)*fairRatio);
    var jonbuTax=calcJonbuTax(jonbuTaxBase);
    var jonbuEduTax=Math.round(jonbuTax*0.20);

    items=[
      {name:'재산세',amount:totalPropTax},
      {name:'지방교육세(재산세)',amount:totalPropEdu},
      {name:'도시지역분',amount:totalCity},
      {name:'종합부동산세',amount:jonbuTax},
      {name:'농어촌특별세(종부세)',amount:jonbuEduTax}
    ];
    if(allAmounts.length>1) items.push({name:'※ '+allAmounts.length+'주택 합산 기준',amount:0});
    total=totalPropTax+totalPropEdu+totalCity+jonbuTax+jonbuEduTax;

  /* ── 증여세 ── */
  } else if(t==='gift'){
    function calcGiftTax(base){
      if(base<=0)return 0;
      if(base<=100000000) return Math.round(base*0.10);
      if(base<=500000000) return Math.round(base*0.20-10000000);
      if(base<=1000000000)return Math.round(base*0.30-60000000);
      if(base<=3000000000)return Math.round(base*0.40-160000000);
      return Math.round(base*0.50-460000000);
    }
    var GIFT_DEDUCTION={
      'spouse':600000000,'child_adult':50000000,'child_minor':20000000,
      'parent':50000000,'other':10000000
    };
    var deduction=GIFT_DEDUCTION[fd.giftRelation]||50000000;
    var deductionLabel=({
      'spouse':'배우자 공제 6억','child_adult':'직계비속(성인) 공제 5천만',
      'child_minor':'직계비속(미성년) 공제 2천만','parent':'직계존속 공제 5천만',
      'other':'기타친족 공제 1천만'
    })[fd.giftRelation]||'증여공제 5천만';
    var taxBase=Math.max(0,amt-deduction);
    var giftTax=calcGiftTax(taxBase);
    items=[{name:'증여세',amount:giftTax},{name:'※ '+deductionLabel+' 적용',amount:0}];
    total=giftTax;

  /* ── 상속세 (채무 공제 + 금융자산 공제 반영) ── */
  } else if(t==='inherit'){
    function calcInheritTax(base){
      if(base<=0)return 0;
      if(base<=100000000) return Math.round(base*0.10);
      if(base<=500000000) return Math.round(base*0.20-10000000);
      if(base<=1000000000)return Math.round(base*0.30-60000000);
      if(base<=3000000000)return Math.round(base*0.40-160000000);
      return Math.round(base*0.50-460000000);
    }

    // ① 채무 합계
    var totalDebt=0;
    (fd.inheritDebts||[]).forEach(function(d){totalDebt+=d.amount||0;});
    var netAsset=Math.max(0, amt-totalDebt);

    // ② 금융자산 상속공제 (상속세 및 증여세법 제22조)
    var financialAssets=0;
    (fd.inheritAssets||[]).forEach(function(a){
      if(a.type==='금융자산') financialAssets+=a.amount||0;
    });
    var financialDebts=0;
    (fd.inheritDebts||[]).forEach(function(d){
      if(d.type==='금융채무') financialDebts+=d.amount||0;
    });
    var netFinancial=Math.max(0, financialAssets-financialDebts);
    var financialDeduction=0;
    if(netFinancial>=20000000){
      if(netFinancial<=100000000) financialDeduction=20000000;
      else financialDeduction=Math.min(Math.round(netFinancial*0.20), 200000000);
    }

    // ③ 공제 합산
    var bulkDeduction=500000000;
    var spouseDeduction=(fd.hasSpouse==='yes')?500000000:0;
    var totalDeduction=bulkDeduction+spouseDeduction+financialDeduction;
    var taxBase=Math.max(0,netAsset-totalDeduction);
    var inheritTax=calcInheritTax(taxBase);

    items=[{name:'상속세',amount:inheritTax}];
    if(totalDebt>0)
      items.push({name:'※ 채무공제 '+fmt(totalDebt)+'원 적용',amount:0});
    if(spouseDeduction>0)
      items.push({name:'※ 배우자 상속공제 5억 적용',amount:0});
    if(financialDeduction>0)
      items.push({name:'※ 금융자산 상속공제 '+fmt(financialDeduction)+'원 적용',amount:0});
    total=inheritTax;
  }

  if(total<0)total=0;
  return{items:items,total:total};
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

$('#backStep3').on('click',function(){
  if(formData.taxType==='prop'){goStep(2);return;}
  goStep(3);
});
$('#resetAll').on('click',function(){
  formData={taxType:'cgt',assetType:'re',reSubType:'apt',amount:0,address:'',stockName:'',regulated:'no',houses:'1',saleDate:'',acqDate:'',reside:'2',area:'under85',acqPrice:0,stockListed:'listed',stockMajor:'minor',stockSme:'sme',hasSpouse:'yes',childCount:'1',decedentHouses:'1',cohabitation:'no',cohabYears:'over10',heirHasHouse:'no',priorGift:'no',giftRelation:'child_adult',priorGiftFromSame:'no',priorGiftAmount:0,acqReason:'buy',inheritAssets:[],inheritDebts:[],propHouseAmounts:[]};
  aiState={payload:{},userText:'',callCount:0,sessionId:'',applicableLaw:'',lawSummary:'',checklistAnswers:[],factSummary:'',supplementText:'',isSecondRound:false,gapAnalysis:null,confirmData:null,stage0Analysis:null,guideSections:null};
  currentEstimatedTax=0;lastCalcResult={items:[],total:0};
  $('#inpAmount,#inpAcqPrice,#inpAddress,#inpStockName').val('');
  $('#inpAcqDate,#inpSaleDate').val('');
  $('#aiTextInput').val('');$('#aiTxtCnt').text('0');
  $('#supplementInput').val('');$('#supplementCnt').text('0');
  A.find('.eh-type-card').removeClass('active').first().addClass('active');
  A.find('.eh-asset-tab').removeClass('active').first().addClass('active');
  $('#reTypeSelect').val('apt');$('#selRegulated').val('no');$('#selHouses').val('1');
  $('#selReside').val('2');$('#selArea').val('under85');
  $('#selStockListed').val('listed');$('#selStockMajor').val('minor');$('#selStockSme').val('sme');
  $('#selSpouse').val('yes');$('#selChildCount').val('1');$('#selDecedentHouses').val('1');
  $('#selCohabitation').val('no');$('#selCohabYears').val('over10');$('#f3CohabYears').hide();
  $('#selHeirHasHouse').val('no');$('#selPriorGift').val('no');
  $('#selGiftRelation').val('child_adult');$('#selPriorGiftFromSame').val('no');
  $('#f3PriorGiftDetail').addClass('eh-hd');$('#inpPriorGiftAmt').val('');$('#priorGiftAmtKr').text('');
  $('#selAcqReason').val('buy');$('#f3AcqReason').addClass('eh-hd');
  $('.eh-gift-rel-card').removeClass('active').first().addClass('active');
  $('#f3GiftSection').addClass('eh-hd');
  $('#selHousesProp').val('1');
  $('#amountKr,#acqPriceKr').text('');
  $('#inheritAssetList').empty();$('#propDynamicHouses').empty();$('#inheritDebtList').empty();
  $('#inheritMultiAsset,#propHouseSection').hide();$('#debtTotalWrap').hide();$('#f3InheritDebt').css('display','none');
  $('#regHelpPopup,#stockMajorHelpPopup').addClass('eh-hd');
  goStep(1);
});

/* ================================================================
   ===  AI FLOW  ===
   ================================================================ */

/* ★ 세목별 AI 입력 예시 */
function updateAIExamples(){
  var t=formData.taxType;
  var examples={
    'cgt':[
      '"부모님이 연로하셔서 같이 살려고 우리 집으로 모셨는데, 제 집을 팔면 세금이 어떻게 되나요?"',
      '"결혼하면서 남편 집이랑 제 집이랑 2채가 됐어요. 언제 팔아야 세금을 안 내나요?"',
      '"아버지가 돌아가시면서 집을 물려받았는데, 저도 집이 있거든요. 어떻게 해야 하나요?"'
    ],
    'inherit':[
      '"돌아가신 아버지랑 10년 넘게 같은 집에서 살았고, 저는 따로 집이 없어요."',
      '"아버지가 30년 넘게 운영하시던 가게를 제가 이어받으려고 합니다."',
      '"상속재산 대부분이 예금이랑 주식 같은 금융자산이에요."'
    ],
    'gift':[
      '"아이가 이제 성인이 됐는데, 일찍부터 조금씩 나눠서 증여해두는 게 낫다고 들었어요."',
      '"부모님 집에 대출이 많이 끼어있는데, 그냥 증여받으면 세금이 얼마나 나오나요?"',
      '"자녀가 창업을 준비 중인데, 사업 자금을 좀 줄 때 세금을 줄이는 방법이 있나요?"'
    ],
    'acq':[
      '"결혼한 지 얼마 안 된 신혼부부인데, 처음으로 집을 사려고 해요."',
      '"평생 집 한 번도 없었는데 드디어 처음으로 내 집 마련을 하게 됐어요."',
      '"부모님 집을 제가 상속받게 됐는데, 일반 매매랑 세금이 다르게 적용된다고 하던데요."'
    ],
    'prop':[
      '"이 집에서 산 지 20년이 넘었고, 이제 나이도 70대인데 세금 부담이 너무 크네요."',
      '"서울 집 말고 고향에 오래된 집이 하나 더 있는데, 종부세가 합산돼서 부담이에요."',
      '"임대사업자 등록을 해뒀는데, 종부세 계산할 때 빠지는 게 있다고 들었어요."'
    ]
  };
  var ex=examples[t]||examples['cgt'];
  $('#aiEx1').text(ex[0]);$('#aiEx2').text(ex[1]);$('#aiEx3').text(ex[2]);
}

/* ★ startAI 클릭 — 로그인 체크 후 AI 플로우 진입 */
$('#startAI').on('click',function(){
  // 비로그인 사용자 → 팝업 표시
  if(typeof eehoTax!=='undefined' && eehoTax.isLoggedIn!=='yes'){
    $('#ehLoginOverlay').fadeIn(200);
    return;
  }
  resetAIState();updateAIExamples();showAI('#aiTextPhase');
});

/* ★ 로그인 팝업 닫기 */
$('#ehLoginClose').on('click',function(){$('#ehLoginOverlay').fadeOut(200);});
$('#ehLoginOverlay').on('click',function(e){
  if($(e.target).is('#ehLoginOverlay')) $(this).fadeOut(200);
});

$('#aiBackToResult').on('click',function(){resetAIState();goStep(4);});
$('#aiTextInput').on('input',function(){$('#aiTxtCnt').text($(this).val().length);});

/* Phase 1: /generate-questions */
$('#aiSendText').on('click',function(){
  var text=$('#aiTextInput').val().trim();
  if(!text){alert('상황을 입력해주세요.');return;}
  aiState.userText  = text;
  aiState.callCount = 0;
  aiState.sessionId = generateSessionId();
  aiState.payload   = buildPayload(text);

  console.log('[EEHO] ★ /generate-questions payload:', JSON.stringify(aiState.payload,null,2));
  showLoading();

  callAPI(aiState.payload, '/generate-questions')
    .then(function(data){
      console.log('[EEHO] ← /generate-questions:', JSON.stringify(data).substring(0,800));
      if(data._error) throw new Error(data._error);
      if(data.result && !data.status && !data.questions) throw new Error(data.result);
      handleGenerateQuestionsResponse(data);
    })
    .catch(function(err){
      console.error('[EEHO] /generate-questions 오류:', err);
      var taxLabel=MAP_TAX_CATEGORY[formData.taxType]||'세금';
      alert('AI 분석 중 오류가 발생했습니다.\n\n'+String(err)+'\n\n'
        +'입력하신 상황을 좀 더 구체적으로 작성해 주세요.\n'
        +'예: '+taxLabel+'와 관련된 구체적인 상황(자산 종류, 금액, 관계 등)을 포함해 주시면 정확한 분석이 가능합니다.');
      showAI('#aiTextPhase');
    });
});

function handleGenerateQuestionsResponse(data){
  if(!data) throw new Error('응답이 비어있습니다');
  aiState.applicableLaw  = data.applicable_law  || '';
  aiState.lawSummary     = data.law_summary      || '';
  aiState.gapAnalysis    = data.gap_analysis     || null;
  aiState.stage0Analysis = data.stage0_analysis  || null;
  aiState.guideSections  = data.guide_sections   || null;

  var questions = data.questions || [];
  if(questions.length > 0){
    questions = questions.slice(0, 4);
    var checklist = questions.map(function(q, i){
      return {
        id:          q.variable    || ('q_'+i),
        category:    q.category    || '확인사항',
        question:    q.question    || '',
        desc:        q.description || '',
        priority:    q.priority    || 'important',
        legalBasis:  q.legal_basis || ''
      };
    });
    renderChecklist({questions:checklist, applicable_law:aiState.applicableLaw, law_summary:aiState.lawSummary});
    return;
  }
  console.warn('[EEHO] questions 비어있음, 리포트 단계로 진행');
  proceedToReport();
}

/* 체크리스트 렌더링 */
function renderChecklist(data){
  aiState.applicableLaw = data.applicable_law || aiState.applicableLaw || '';
  aiState.lawSummary    = data.law_summary    || aiState.lawSummary    || '';
  var questions = data.questions || [];
  var $wrap = $('#checklistQuestions').empty();
  questions.forEach(function(q){
    var descHtml = q.desc ? '<div class="eh-cl-desc">'+esc(q.desc)+'</div>' : '';
    var html='<div class="eh-cl-item" data-id="'+esc(q.id)+'">'
      +'<div class="eh-cl-category">'+esc(q.category)+'</div>'
      +'<div class="eh-cl-question">'+esc(q.question)+'</div>'
      +descHtml
      +'<div class="eh-cl-btns">'
      +'<button class="eh-cl-btn" data-val="예">✓ 예</button>'
      +'<button class="eh-cl-btn" data-val="아니오">✗ 아니오</button>'
      +'<button class="eh-cl-btn" data-val="모름">? 모름</button>'
      +'</div>'
      +'<input type="hidden" class="eh-cl-answer" data-id="'+esc(q.id)+'" data-question="'+esc(q.question)+'" value="">'
      +'</div>';
    $wrap.append(html);
  });
  showAI('#aiChecklistPhase');
}

A.on('click','.eh-cl-btn',function(){
  var $item=$(this).closest('.eh-cl-item');
  $item.find('.eh-cl-btn').removeClass('selected selected-no selected-unknown');
  var val=$(this).data('val');
  if(val==='아니오') $(this).addClass('selected-no');
  else if(val==='모름') $(this).addClass('selected-unknown');
  else $(this).addClass('selected');
  $item.find('.eh-cl-answer').val(val);
  $item.removeClass('eh-cl-error');
});

/* Phase 2: /confirm */
$('#checklistSubmit').on('click',function(){
  var answers=[],allAnswered=true;
  $('.eh-cl-item').each(function(){
    var variable=$(this).data('id');
    var answer=$(this).find('.eh-cl-answer').val();
    if(!answer){allAnswered=false;$(this).addClass('eh-cl-error');}
    else{
      $(this).removeClass('eh-cl-error');
      answers.push({variable:variable, answer:answer});
    }
  });
  if(!allAnswered){alert('모든 항목에 답변해주세요.');return;}

  aiState.checklistAnswers = answers;

  var origWithStage0 = JSON.parse(JSON.stringify(aiState.payload));
  if(aiState.stage0Analysis) origWithStage0.stage0_analysis = aiState.stage0Analysis;
  if(aiState.guideSections)  origWithStage0.guide_sections  = aiState.guideSections;

  var confirmPayload = {
    session_id:        aiState.sessionId,
    original_request:  origWithStage0,
    checklist_answers: answers,
    user_corrections:  null
  };

  console.log('[EEHO] ★ /confirm payload:', JSON.stringify(confirmPayload).substring(0,800));
  showLoading();

  callAPI(confirmPayload, '/confirm')
    .then(function(data){
      console.log('[EEHO] ← /confirm:', JSON.stringify(data).substring(0,800));
      if(data._error) throw new Error(data._error);
      if(data.result && !data.사실관계 && !data.status){throw new Error(data.result);}
      handleConfirmResponse(data);
    })
    .catch(handleError);
});

function handleConfirmResponse(data){
  if(!data) throw new Error('응답이 비어있습니다');
  aiState.confirmData = data.사실관계 || data;
  if(data.사실관계){renderConfirmFromBackend(data);return;}
  if(data.리포트){renderFinalReport(data);return;}
  if(data.status==='success'){renderFinalReport(data);return;}
  console.warn('[EEHO] /confirm 형식 불명, 리포트 진행');
  proceedToReport();
}

function renderConfirmFromBackend(data){
  var facts   = data.사실관계 || {};
  var summary = facts.사실관계_요약 || {};
  var factHtml = '';
  Object.keys(summary).forEach(function(key){
    var val = summary[key];
    if(val && val!=='해당 사항 정리' && val!=='해당 없음'){
      factHtml += '<div style="margin-bottom:10px"><span style="font-size:12px;font-weight:700;color:var(--teal);letter-spacing:.04em;display:block;margin-bottom:3px">'+esc(key.replace(/_/g,' '))+'</span>'
        +'<span style="font-size:14px;line-height:1.6;color:var(--text)">'+esc(val)+'</span></div>';
    }
  });
  aiState.factSummary = JSON.stringify(summary);
  $('#confirmFactSummary').html(factHtml || '<span style="color:var(--text-m)">사실관계를 분석했습니다.</span>');

  var reqs = facts.요건_충족_판단 || facts.적용_검토_조문 || [];
  var $reqWrap=$('#confirmRequirements').empty();
  reqs.forEach(function(r){
    var status = r.충족여부 || '확인필요';
    var cls,icon;
    if(status==='충족'||status==='예'){cls='pass';icon='✓';}
    else if(status==='미충족'){cls='fail';icon='✗';}
    else{cls='review';icon='△';}
    if(r.요건) aiState.applicableLaw = r.요건;
    var reasonText = cleanVarNames(r.근거||r.판단근거||'');
    $reqWrap.append(
      '<div class="eh-req-row eh-req-'+cls+'">'
      +'<span class="eh-req-icon">'+icon+'</span>'
      +'<div class="eh-req-info"><strong>'+esc(r.요건||r.조문||r.내용||'')+'</strong><span>'+esc(reasonText)+'</span></div>'
      +'<span class="eh-req-status">'+esc(status)+'</span>'
      +'</div>'
    );
  });

  var dq = data.data_quality || {};
  var comp = dq.completeness_after || 0;
  var confLabel,confCls;
  if(comp>=0.7){confLabel='비과세 가능성 높음';confCls='high';}
  else if(comp>=0.4){confLabel='추가 검토 필요';confCls='mid';}
  else{confLabel='비과세 가능성 낮음';confCls='low';}
  var directConf = facts.비과세_가능성 || '';
  if(directConf==='높음'){confLabel='비과세 가능성 높음';confCls='high';}
  else if(directConf==='낮음'){confLabel='비과세 가능성 낮음';confCls='low';}
  else if(directConf==='보통'){confLabel='추가 검토 필요';confCls='mid';}
  $('#confirmConfidence').text(confLabel).attr('class','eh-conf-badge eh-conf-'+confCls);

  if(aiState.isSecondRound){$('#supplementBtn').hide();$('#confirmGuideText').hide();}
  else{$('#supplementBtn').show();$('#confirmGuideText').show();}
  showAI('#aiConfirmPhase');
}

/* Phase 3a: /report */
$('#submitFinal').on('click',function(){proceedToReport();});

function proceedToReport(){
  var reportPayload = JSON.parse(JSON.stringify(aiState.payload));
  reportPayload.additional_data = reportPayload.additional_data || {};
  reportPayload.additional_data.fact_summary        = aiState.factSummary       || '';
  reportPayload.additional_data.checklist_answers   = aiState.checklistAnswers  || [];
  if(aiState.stage0Analysis) reportPayload.additional_data.stage0_analysis = aiState.stage0Analysis;
  if(aiState.guideSections)  reportPayload.additional_data.guide_sections  = aiState.guideSections;

  console.log('[EEHO] ★ /report payload:', JSON.stringify(reportPayload).substring(0,800));
  showLoading();

  callAPI(reportPayload, '/report')
    .then(function(data){
      console.log('[EEHO] ← /report:', JSON.stringify(data).substring(0,800));
      if(data._error || (data.result && !data.status)){throw new Error(data.result || 'API 서버 오류');}
      renderFinalReport(data);
    })
    .catch(handleError);
}

/* Phase 3b: 보완하기 */
$('#supplementBtn').on('click',function(){showAI('#aiSupplementPhase');});
$('#backToConfirm').on('click',function(){showAI('#aiConfirmPhase');});
$('#supplementInput').on('input',function(){$('#supplementCnt').text($(this).val().length);});

$('#supplementSubmit').on('click',function(){
  var text=$('#supplementInput').val().trim();
  if(!text){alert('추가 상황을 입력해주세요.');return;}
  aiState.supplementText  = text;
  aiState.isSecondRound   = true;
  saveRlhfData(text);

  var feedbackPayload = {
    session_id:      aiState.sessionId,
    original_report: aiState.confirmData || {},
    feedback_text:   text,
    rating:          3
  };
  callAPI(feedbackPayload, '/feedback')
    .then(function(res){console.log('[EEHO] ★ /feedback 저장 완료:', res.triage_result);})
    .catch(function(err){console.warn('[EEHO] /feedback 저장 실패 (무시):', err);});

  var origWithStage0b = JSON.parse(JSON.stringify(aiState.payload));
  if(aiState.stage0Analysis) origWithStage0b.stage0_analysis = aiState.stage0Analysis;
  if(aiState.guideSections)  origWithStage0b.guide_sections  = aiState.guideSections;

  var confirmPayload = {
    session_id:        aiState.sessionId,
    original_request:  origWithStage0b,
    checklist_answers: aiState.checklistAnswers || [],
    user_corrections:  {보완내용: text}
  };

  showLoading();
  callAPI(confirmPayload, '/confirm')
    .then(function(data){
      console.log('[EEHO] ← /confirm(보완):', JSON.stringify(data).substring(0,800));
      if(data._error) throw new Error(data._error);
      if(data.result && !data.사실관계 && !data.status){throw new Error(data.result);}
      handleConfirmResponse(data);
    })
    .catch(handleError);
});

function saveRlhfData(supplementText){
  var ajaxUrl=(typeof eehoTax!=='undefined'&&eehoTax.ajax)?eehoTax.ajax:'/wp-admin/admin-ajax.php';
  var nonce=(typeof eehoTax!=='undefined'&&eehoTax.nonce)?eehoTax.nonce:'';
  $.ajax({
    url:ajaxUrl,method:'POST',
    data:{
      action:'eeho_save_rlhf',nonce:nonce,
      session_id:aiState.sessionId,
      original_context:aiState.userText,
      supplement_text:supplementText,
      fact_summary:aiState.factSummary,
      checklist_answers:JSON.stringify(aiState.checklistAnswers)
    }
  }).done(function(res){console.log('[EEHO] RLHF 저장 완료:',res);})
    .fail(function(err){console.warn('[EEHO] RLHF 저장 실패 (무시):',err);});
}

/* ================================================================
   최종 리포트 렌더링
   ================================================================ */
function renderFinalReport(data){
  var isPASS   = data.result_type==='PASS';
  var isREVIEW = data.result_type==='REVIEW';
  var baseTax  = (data.base_tax!=null)?data.base_tax:(currentEstimatedTax||0);
  var afterTax = baseTax;
  var confPct  = (data.confidence_pct!=null)?Number(data.confidence_pct):null;
  var detailRaw='',riskRaw='',lawText='',lawSummary='';

  if(data.리포트){
    var report=data.리포트;
    var compare=report.세액비교||{};
    var savedTax=compare.절감액||0;
    if(compare.절세_적용후_세액!==undefined) afterTax=Number(compare.절세_적용후_세액);

    if(data.result_type==='PASS') isPASS=true;
    else if(data.result_type==='FAIL'){isPASS=false;isREVIEW=false;afterTax=baseTax;}
    else if(data.result_type==='REVIEW'){
      isPASS=false;isREVIEW=true;
      if(afterTax===0 && baseTax>0) afterTax=baseTax;
    }
    else{isPASS=(savedTax>0||(afterTax!==undefined&&afterTax===0));}

    if(!isPASS && !isREVIEW && confPct!==null && confPct>=70) confPct=Math.min(confPct,30);

    var details=[];
    if(report.종합의견) details.push(report.종합의견);
    if(report.판단근거&&report.판단근거.length){
      report.판단근거.forEach(function(item){
        if(typeof item==='string'){if(item.trim()&&item!=='[]')details.push(item);}
        else if(typeof item==='object'){
          var line=(item.조문?'【'+item.조문+'】 ':'')+(item.판단||item.내용||'');
          if(line.trim())details.push(line);
        }
      });
    }
    detailRaw=details.join('\n\n');

    var risks=[];
    if(report.리스크&&report.리스크.length){
      report.리스크.forEach(function(item){
        if(typeof item==='string'){if(item.trim()&&item!=='[]')risks.push(item);}
        else if(typeof item==='object'){
          var line=(item.유형?'['+item.유형+'] ':'')+(item.내용||'')+(item.대응방안?'\n→ '+item.대응방안:'');
          if(line.trim())risks.push(line);
        }
      });
    }
    riskRaw=risks.join('\n\n');
    lawText=data.applicable_law||'';
    lawSummary=data.law_summary||'';
  } else {
    if(data.tax_after_applied!=null) afterTax=Number(data.tax_after_applied);
    detailRaw=data.details||'';
    riskRaw=data.risk_warning||'';
    lawText=data.applicable_law||'';
    lawSummary=data.law_summary||'';
  }

  if(!lawText)    lawText    = data.applicable_law||aiState.applicableLaw||'';
  if(!lawSummary) lawSummary = data.law_summary||aiState.lawSummary||'';
  if(!detailRaw && data.details)       detailRaw = data.details;
  if(!riskRaw   && data.risk_warning)  riskRaw   = data.risk_warning;

  var $badge=$('#finalResultBadge');
  $badge.removeClass('eh-badge-pass eh-badge-fail eh-badge-review');
  if(isPASS){
    $badge.addClass('eh-badge-pass');$('#finalBadgeIcon').text('✓');
    $('#finalBadgeLabel').text('비과세 특례 적용 가능');$('#finalBadgeType').text('PASS');
  } else if(isREVIEW){
    $badge.addClass('eh-badge-review');$('#finalBadgeIcon').text('△');
    $('#finalBadgeLabel').text('전문가 추가 검토 필요');$('#finalBadgeType').text('REVIEW');
  } else {
    $badge.addClass('eh-badge-fail');$('#finalBadgeIcon').text('✗');
    $('#finalBadgeLabel').text('비과세 요건 미충족');$('#finalBadgeType').text('FAIL');
  }

  $('#finalBefore').text('₩'+fmt(baseTax));

  var pctColor='#888',pctBg='rgba(128,128,128,0.12)';
  if(confPct!==null){
    if(confPct>=70){pctColor='var(--teal)';pctBg='rgba(0,68,71,0.10)';}
    else if(confPct>=40){pctColor='#d97706';pctBg='rgba(217,119,6,0.10)';}
    else{pctColor='var(--ember)';pctBg='rgba(249,92,50,0.10)';}
  }
  var afterAmtStr=afterTax===0?'₩0':'₩'+fmt(afterTax);
  if(isREVIEW && afterTax===baseTax) afterAmtStr='세무사 확인 필요';
  var pctBadgeHtml='';
  if(confPct!==null){
    pctBadgeHtml='<span style="display:inline-flex;align-items:center;padding:3px 11px;border-radius:20px;font-size:12px;font-weight:700;background:'+pctBg+';color:'+pctColor+';border:1px solid '+pctColor+';white-space:nowrap;vertical-align:middle;margin-left:8px">적용 가능성 '+confPct+'%</span>';
  }
  $('#finalAfter').html('<span style="font-weight:800;color:var(--teal)">'+afterAmtStr+'</span>'+pctBadgeHtml);

  var saving=baseTax-afterTax;
  var $savingEl=$('#finalTaxSaving');
  if(saving>0&&confPct!==null){
    var savingTxt='특례 적용 시 최대 ₩'+fmt(saving)+' 절세 가능';
    if(confPct<70) savingTxt+=' (적용 가능성 '+confPct+'% — 세무사 상담으로 확인 권장)';
    $savingEl.text(savingTxt).show();
  } else if(saving>0){
    $savingEl.text('특례 적용 시 최대 ₩'+fmt(saving)+' 절세 가능').show();
  } else {
    $savingEl.hide();
  }

  function highlight(txt){
    return esc(txt)
      .replace(/(비과세|절세|감면|공제|특례|요건 충족|적용 가능)/g,'<strong style="color:var(--teal);text-decoration:underline">$1</strong>')
      .replace(/(미충족|적용 불가|주의|위험|추징)/g,'<strong style="color:#e53935;text-decoration:underline">$1</strong>')
      .replace(/([0-9,]+원)/g,'<strong>$1</strong>')
      .replace(/(3년|2년|1년|[0-9]+개월)/g,'<u><strong>$1</strong></u>');
  }
  function toBullets(raw,max){
    if(!raw)return[];
    var clean=raw.replace(/```[\s\S]*?```/g,'').replace(/【[^】]+】/g,'').replace(/\\n/g,' ').replace(/\[\]/g,'').trim();
    var sents=clean.split(/(?<=[.!?。])\s+|(?<=합니다)\s+|(?<=습니다)\s+|(?<=됩니다)\s+/)
      .map(function(s){return s.trim().replace(/^[-•·✓·⚠△]\s*/,'');})
      .filter(function(s){
        if(s.length<=8)return false;
        if(s==='[]'||/^\[.*\]$/.test(s))return false;
        if(/^(소득세법|상속세|증여세|지방세법|종합부동산세법|조세특례제한법)/.test(s)&&s.length<60)return false;
        if(/고객\s*(제공|입력|기재)\s*(정보|데이터|내용)/.test(s))return false;
        if(/^\(.*[,，].*\)$/.test(s.trim()))return false;
        return true;
      });
    var seen={},result=[];
    sents.forEach(function(s){var key=s.slice(0,15);if(!seen[key]){seen[key]=1;result.push(s);}});
    return result.slice(0,max||3);
  }

  var detailBullets=toBullets(detailRaw,4);
  var detailHtml='';
  if(detailBullets.length){
    detailHtml='<ul style="list-style:none;padding:0;margin:0">';
    detailBullets.forEach(function(b){
      detailHtml+='<li style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--gray-l)">'
        +'<span style="color:var(--teal);font-weight:700;flex-shrink:0;margin-top:2px">✓</span>'
        +'<span style="font-size:14px;line-height:1.7;color:var(--text)">'+highlight(b)+'</span></li>';
    });
    detailHtml+='</ul>';
  }
  $('#finalDetails').html(detailHtml||'<p style="font-size:14px;color:var(--text-m);padding:8px 0">세무 전문가 상담 시 안내드립니다.</p>');

  if(lawText||lawSummary){
    $('#finalAppliedLaw').text(lawText||'');
    $('#finalLawSummary').text(lawSummary||'');
    $('#finalLawWrap').show();
  } else {
    $('#finalLawWrap').hide();
  }

  var riskBullets=toBullets(riskRaw,3);
  var riskHtml='';
  if(riskBullets.length){
    riskHtml='<ul style="list-style:none;padding:0;margin:0">';
    riskBullets.forEach(function(b){
      riskHtml+='<li style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid rgba(249,92,50,.15)">'
        +'<span style="color:var(--ember);font-weight:700;flex-shrink:0;margin-top:2px">△</span>'
        +'<span style="font-size:14px;line-height:1.7;color:var(--text)">'+highlight(b)+'</span></li>';
    });
    riskHtml+='</ul>';
  }
  if(!isPASS&&confPct!==null){
    riskHtml+='<div style="margin:14px 0 0;padding:12px 16px;border-radius:10px;background:'+pctBg+';border:1px solid '+pctColor+'">'
      +'<p style="margin:0;font-size:13px;color:'+pctColor+';font-weight:700;line-height:1.6">'
      +'⚠ 현재 확인된 정보 기준 적용 가능성은 <strong>'+confPct+'%</strong>입니다.<br>'
      +'<span style="font-weight:400">세무사 상담을 통해 나머지 요건을 확인하면 실제 적용 가능성이 높아질 수 있습니다.</span></p></div>';
  }
  $('#finalRisks').html(riskHtml||'<p style="font-size:14px;color:var(--text-m);padding:8px 0">현재 확인된 리스크가 없습니다.</p>');

  showAI('#aiFinal');
}

/* ================================================================
   공통 에러 핸들러
   ================================================================ */
function handleError(err){
  console.error('[EEHO] 오류:',err);
  alert('AI 분석 중 오류가 발생했습니다.\n\n'+String(err)+'\n\n잠시 후 다시 시도해주세요.');
  showAI('#aiTextPhase');
}
function resetAIState(){
  aiState={payload:{},userText:'',callCount:0,sessionId:'',applicableLaw:'',lawSummary:'',checklistAnswers:[],factSummary:'',supplementText:'',isSecondRound:false,gapAnalysis:null,confirmData:null,stage0Analysis:null,guideSections:null};
  $('#aiTextInput').val('');$('#aiTxtCnt').text('0');
  $('#supplementInput').val('');$('#supplementCnt').text('0');
}
$('#backToResult').on('click',function(){resetAIState();goStep(4);});
$('#backToResultFromConfirm').on('click',function(){resetAIState();goStep(4);});

/* ================================================================
   ★ 로그인 상태 표시
   ================================================================ */
(function(){
  var isLoggedIn = (typeof eehoTax !== 'undefined' && eehoTax.isLoggedIn === 'yes');
  var $indicator = $('<div id="ehLoginStatus"></div>').css({
    textAlign: 'right', fontSize: '13px', color: 'var(--text-m)',
    padding: '6px 0 0', marginBottom: '-6px'
  });
  if (isLoggedIn) {
    $indicator.html('<span style="color:var(--teal);font-weight:600">● 로그인됨</span>');
  } else {
    $indicator.html('<span style="color:var(--text-m)">○ 비로그인 상태</span>');
  }
  A.find('.eh-hero').after($indicator);
})();

/* ================================================================
   ★ sessionStorage — 로그인 전 상태 저장 / 복원
   ================================================================ */
function saveStateBeforeLogin() {
  try {
    var state = {
      formData:        formData,
      lastCalcResult:  lastCalcResult,
      currentStep:     currentStep,
      timestamp:       Date.now()
    };
    sessionStorage.setItem('eeho_saved_state', JSON.stringify(state));
  } catch(e) { console.warn('[EEHO] 상태 저장 실패:', e); }
}

function restoreStateAfterLogin() {
  try {
    var saved = sessionStorage.getItem('eeho_saved_state');
    if (!saved) return;
    var state = JSON.parse(saved);
    // 30분 이상 지난 데이터는 무시
    if (Date.now() - state.timestamp > 30 * 60 * 1000) {
      sessionStorage.removeItem('eeho_saved_state');
      return;
    }
    // 로그인 상태일 때만 복원
    if (typeof eehoTax === 'undefined' || eehoTax.isLoggedIn !== 'yes') return;

    sessionStorage.removeItem('eeho_saved_state');
    formData             = state.formData        || formData;
    lastCalcResult       = state.lastCalcResult  || lastCalcResult;
    currentEstimatedTax  = lastCalcResult.total  || 0;

    // Step 4 (결과 화면) 복원
    if (lastCalcResult && lastCalcResult.total > 0) {
      renderResult(lastCalcResult);
      goStep(4);
      // 잠시 후 AI 플로우 자동 시작
      setTimeout(function(){
        resetAIState();
        updateAIExamples();
        showAI('#aiTextPhase');
      }, 400);
      console.log('[EEHO] ★ 로그인 후 상태 복원 완료 → AI 플로우 시작');
    }
  } catch(e) {
    sessionStorage.removeItem('eeho_saved_state');
    console.warn('[EEHO] 상태 복원 실패:', e);
  }
}

// ★ 구글 로그인 버튼 클릭 시 상태 저장
A.on('click', '#ehGoogleLoginBtn', function(){
  saveStateBeforeLogin();
  // href로 이동 — 저장 후 자연스럽게 리디렉션
});

/* ================================================================
   INIT
   ================================================================ */
updateProgress(1);
$('#ehLdYear').text(new Date().getFullYear());
restoreStateAfterLogin(); // ★ 로그인 후 돌아왔을 때 복원
})(jQuery);
