<?php
// templates/calculator.php — HTML 출력 전용 (훅/함수 정의 없음)
// 모든 wp_enqueue_scripts / add_action / add_shortcode 는 eeho-tax-calculator.php 에서 처리

// Nextend Social Login — Google 로그인 URL
$redirect         = urlencode('https://eehotax.com/ai-calculator/');
$google_login_url = esc_url(site_url('/wp-login.php?loginSocial=google&redirect_to=' . $redirect));
?>
<style>
#eeho-app .eh-hd{display:none!important}
#eeho-app .eh-step{display:none!important}
#eeho-app .eh-step.active{display:block!important}
#eeho-app .eh-ai{display:none!important}
#eeho-app .eh-ai.active{display:block!important}
#eeho-app *{box-sizing:border-box!important}

/* ===== Bot Character ===== */
@keyframes ehBotBlink{0%,90%,100%{transform:scaleY(1)}95%{transform:scaleY(.08)}}
@keyframes ehBotLegL{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}
@keyframes ehBotLegR{0%,100%{transform:rotate(8deg)}50%{transform:rotate(-8deg)}}
@keyframes ehBotFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes ehBotAntenna{0%,100%{opacity:1;box-shadow:0 0 6px #F95C32}50%{opacity:.5;box-shadow:0 0 12px #F95C32,0 0 24px rgba(249,92,50,.3)}}
#eeho-app .eh-bot{display:flex;flex-direction:column;align-items:center;margin:0 auto 32px;width:120px}
#eeho-app .eh-bot-body{display:flex;flex-direction:column;align-items:center;animation:ehBotFloat 2.5s ease-in-out infinite}
#eeho-app .eh-bot-antenna{width:2px;height:18px;background:#004447;margin-bottom:-2px;position:relative}
#eeho-app .eh-bot-antenna-ball{position:absolute;top:-6px;left:50%;transform:translateX(-50%);width:10px;height:10px;border-radius:50%;background:#F95C32;animation:ehBotAntenna 1.5s ease-in-out infinite}
#eeho-app .eh-bot-head{width:72px;height:52px;background:#fff;border:2.5px solid #004447;border-radius:16px;display:flex;align-items:center;justify-content:center;gap:16px;position:relative;z-index:1}
#eeho-app .eh-bot-eye{width:10px;height:10px;border-radius:50%;background:#004447;animation:ehBotBlink 3.5s ease-in-out infinite;transform-origin:center}
#eeho-app .eh-bot-eye-r{animation-delay:.15s}
#eeho-app .eh-bot-torso{width:48px;height:28px;background:#fff;border:2.5px solid #004447;border-top:none;border-radius:0 0 12px 12px;margin-top:-2px}
#eeho-app .eh-bot-legs{display:flex;gap:12px;margin-top:-2px}
#eeho-app .eh-bot-leg{width:3px;height:22px;background:#004447;border-radius:0 0 2px 2px;transform-origin:top center}
#eeho-app .eh-bot-leg-l{animation:ehBotLegL .8s ease-in-out infinite}
#eeho-app .eh-bot-leg-r{animation:ehBotLegR .8s ease-in-out infinite}

/* ===== Checklist ===== */
#eeho-app .eh-cl-law-wrap{padding:16px 20px;background:rgba(0,68,71,.06);border-radius:10px;border-left:4px solid #004447}
#eeho-app .eh-cl-law-badge{display:inline-block;font-size:15px;font-weight:800;color:#004447}
#eeho-app .eh-cl-law-summary{font-size:13px;color:#4A4A48;line-height:1.6;margin-top:6px}
#eeho-app .eh-cl-item{padding:20px 0;border-bottom:1px solid #F0EDEB}
#eeho-app .eh-cl-item:last-child{border-bottom:none}
#eeho-app .eh-cl-category{font-size:12px;font-weight:700;color:#F95C32;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}
#eeho-app .eh-cl-question{font-size:15px;font-weight:600;color:#1A1A18;line-height:1.5;margin-bottom:8px}
#eeho-app .eh-cl-desc{font-size:13px;color:#8A8A88;line-height:1.5;margin-bottom:12px}
#eeho-app .eh-cl-btns{display:flex;gap:10px}
#eeho-app .eh-cl-btn{flex:1;padding:12px 16px;border:1.5px solid #D5D5D2;border-radius:10px;background:#fff;font-size:14px;font-weight:600;color:#4A4A48;cursor:pointer;transition:all .25s;text-align:center}
#eeho-app .eh-cl-btn:hover{border-color:#004447;color:#004447;background:rgba(0,68,71,.06)}
#eeho-app .eh-cl-btn.selected{border-color:#004447;background:#004447;color:#fff}
#eeho-app .eh-cl-btn.selected-no{border-color:#D32F2F;background:#D32F2F;color:#fff}
#eeho-app .eh-cl-btn.selected-unknown{border-color:#8A8A88;background:#8A8A88;color:#fff}
#eeho-app .eh-cl-item.eh-cl-error{background:rgba(211,47,47,.04);border-radius:10px;padding:20px 16px;margin:0 -16px}

/* ===== Confirm ===== */
#eeho-app .eh-conf-badge{display:inline-block;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:700}
#eeho-app .eh-conf-high{background:rgba(46,125,50,.1);color:#2E7D32;border:1px solid #2E7D32}
#eeho-app .eh-conf-mid{background:rgba(217,119,6,.1);color:#d97706;border:1px solid #d97706}
#eeho-app .eh-conf-low{background:rgba(211,47,47,.1);color:#D32F2F;border:1px solid #D32F2F}
#eeho-app .eh-req-row{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:10px;margin-bottom:8px}
#eeho-app .eh-req-pass{background:rgba(46,125,50,.06)}
#eeho-app .eh-req-fail{background:rgba(211,47,47,.06)}
#eeho-app .eh-req-review{background:rgba(217,119,6,.06)}
#eeho-app .eh-req-icon{font-size:18px;font-weight:700;flex-shrink:0;width:28px;text-align:center}
#eeho-app .eh-req-pass .eh-req-icon{color:#2E7D32}
#eeho-app .eh-req-fail .eh-req-icon{color:#D32F2F}
#eeho-app .eh-req-review .eh-req-icon{color:#d97706}
#eeho-app .eh-req-info{flex:1;min-width:0}
#eeho-app .eh-req-info strong{display:block;font-size:14px;font-weight:700;color:#1A1A18}
#eeho-app .eh-req-info span{font-size:12px;color:#8A8A88}
#eeho-app .eh-req-status{font-size:13px;font-weight:700;flex-shrink:0}
#eeho-app .eh-req-pass .eh-req-status{color:#2E7D32}
#eeho-app .eh-req-fail .eh-req-status{color:#D32F2F}
#eeho-app .eh-req-review .eh-req-status{color:#d97706}
#eeho-app .eh-confirm-tax{background:#F7F2F0;border-radius:16px;padding:20px}
#eeho-app .eh-confirm-tax-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #EDE6E2;font-size:14px}
#eeho-app .eh-confirm-tax-row:last-child{border-bottom:none}
#eeho-app .eh-confirm-tax-save{padding-top:12px;border-top:2px solid #004447;margin-top:4px}
#eeho-app .eh-confirm-fact{padding:16px 20px;background:#F7F2F0;border-radius:10px;border-left:3px solid #004447}

/* ===== REVIEW Badge ===== */
#eeho-app .eh-badge-review{background:linear-gradient(135deg,#FFF8E1 0%,#FFE082 100%);border:1.5px solid #FFB300}
#eeho-app .eh-badge-review .eh-badge-icon{background:#F57F17;color:#fff}
#eeho-app .eh-badge-review .eh-badge-label{color:#E65100}
#eeho-app .eh-badge-review .eh-badge-type{color:#F57F17}

/* ===== Result Note ===== */
#eeho-app .eh-ri-note{padding:10px 0;border-top:1px solid #F0EDEB}
#eeho-app .eh-ri-note span{font-size:13px;color:#8A8A88;font-style:italic}

/* ===== Inherit Multi-Asset ===== */
#eeho-app .eh-inherit-guide{font-size:13px;color:#8A8A88;margin-bottom:16px;line-height:1.5}
#eeho-app .eh-inherit-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #F0EDEB}
#eeho-app .eh-inherit-total{display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding:16px 20px;background:rgba(0,68,71,.06);border-radius:10px;border:1.5px solid rgba(0,68,71,.15)}
#eeho-app .eh-inherit-total-amt{font-size:24px;font-weight:800;color:#004447}

/* ===== Prop Multi-House ===== */
#eeho-app .eh-prop-guide{font-size:13px;color:#8A8A88;margin-bottom:12px;line-height:1.5}
#eeho-app .eh-prop-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #F0EDEB}
#eeho-app .eh-prop-label{font-size:14px;font-weight:700;color:#4A4A48;white-space:nowrap;min-width:60px}

/* ===== Shared Buttons ===== */
#eeho-app .eh-btn-icon{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:1.5px solid #D5D5D2;background:#fff;color:#8A8A88;font-size:18px;cursor:pointer;flex-shrink:0;line-height:1}
#eeho-app .eh-btn-icon:hover{border-color:#D32F2F;color:#D32F2F;background:rgba(211,47,47,.06)}
#eeho-app .eh-amount-box.sm{padding:8px 12px;margin-bottom:0;background:#F7F2F0;border-radius:10px}
#eeho-app .eh-amount-display.sm{justify-content:flex-start}
#eeho-app .eh-amount-input.sm{font-size:16px;font-weight:600;text-align:right;max-width:none}
#eeho-app .eh-amount-box.sm .eh-amount-kr{text-align:right;font-size:11px;padding:2px 8px;margin-top:2px}

/* ===== Gift Relation Cards ===== */
#eeho-app .eh-gift-rel-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px}
#eeho-app .eh-gift-rel-card{position:relative;background:#fff;border:2px solid #F0EDEB;border-radius:14px;padding:20px 16px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;transition:all .25s}
#eeho-app .eh-gift-rel-card:hover{border-color:#D6C0B6;box-shadow:0 4px 12px rgba(0,68,71,.06)}
#eeho-app .eh-gift-rel-card.active{border-color:#F95C32;border-width:2.5px;background:rgba(249,92,50,.04);box-shadow:0 4px 16px rgba(249,92,50,.1)}
#eeho-app .eh-gift-rel-icon{display:flex;align-items:center;gap:8px;margin-bottom:2px}
#eeho-app .eh-gift-label{font-size:15px;font-weight:700;color:#004447;padding:4px 12px;background:rgba(0,68,71,.06);border-radius:8px}
#eeho-app .eh-gift-rel-card.active .eh-gift-label{background:rgba(249,92,50,.08);color:#F95C32}
#eeho-app .eh-gift-arrow{font-size:16px;color:#8A8A88;font-weight:700}
#eeho-app .eh-gift-rel-card.active .eh-gift-arrow{color:#F95C32}
#eeho-app .eh-gift-rel-deduct{font-size:12px;font-weight:600;color:#004447;background:rgba(0,68,71,.06);padding:3px 10px;border-radius:12px}
@media(max-width:420px){#eeho-app .eh-gift-rel-grid{grid-template-columns:1fr}}
</style>
<div id="eeho-app">

<!-- HERO -->
<div class="eh-hero">
  <div class="eh-hero-badge"><span class="eh-hero-dot"></span> AI 세금 분석</div>
  <h1 class="eh-hero-title">AI 세금 계산기</h1>
  <p class="eh-hero-sub">EEHO AI의 정밀 분석으로 단순 계산부터 복잡한 시나리오까지,<br>모든 절세 포인트를 찾아드립니다.</p>
</div>

<!-- OLD HEADER (JS 호환용 숨김) -->
<header class="eh-header" style="display:none!important">
  <nav class="eh-progress" id="ehProgress">
    <div class="eh-pg-item active" data-s="1"><span class="eh-pg-num">01</span><span class="eh-pg-txt">.</span></div>
    <div class="eh-pg-line" data-a="1"></div>
    <div class="eh-pg-item" data-s="2"><span class="eh-pg-num">02</span><span class="eh-pg-txt">.</span></div>
    <div class="eh-pg-line" data-a="2"></div>
    <div class="eh-pg-item" data-s="3"><span class="eh-pg-num">03</span><span class="eh-pg-txt">.</span></div>
    <div class="eh-pg-line" data-a="3"></div>
    <div class="eh-pg-item" data-s="4"><span class="eh-pg-num">04</span><span class="eh-pg-txt">.</span></div>
  </nav>
</header>

<!-- ================================================================
     STEP 1: 세목 선택
     ================================================================ -->
<div class="eh-step active" data-step="1">
  <div class="eh-card eh-card-main">
    <div class="eh-progress-bar">
      <span class="eh-pg-step-label">Step 1 of 4</span>
      <span class="eh-pg-step-name">세금 유형</span>
    </div>
    <div class="eh-pg-track"><div class="eh-pg-fill" style="width:25%"></div></div>
    <div style="padding: 32px 36px 36px;">
      <h1 class="eh-title">어떤 세금을 계산할까요?</h1>
      <p class="eh-subtitle"><span class="eh-highlight">EEHO AI</span>가 최적의 절세 포인트를 찾아드립니다</p>
      <div class="eh-type-grid">
        <button class="eh-type-card active" data-type="cgt">
          <span class="eh-type-check">✓</span>
          <div class="eh-type-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 40V20L20 10l12 10v20"/><path d="M28 40V28h-8v12"/><path d="M32 16l8 0m-4-4v8"/></svg></div>
          <span class="eh-type-name">양도소득세</span>
          <span class="eh-type-desc">부동산 등 매매 시 발생하는 소득에 대한 세금</span>
        </button>
        <button class="eh-type-card" data-type="inherit">
          <span class="eh-type-check">✓</span>
          <div class="eh-type-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6v10"/><path d="M18 16h12"/><path d="M14 16c0 0-4 8-4 16h28c0-8-4-16-4-16"/><path d="M20 26h8m-6 5h4"/></svg></div>
          <span class="eh-type-name">상속세</span>
          <span class="eh-type-desc">사망으로 인해 재산을 이전받을 때 부과되는 세금</span>
        </button>
        <button class="eh-type-card" data-type="gift">
          <span class="eh-type-check">✓</span>
          <div class="eh-type-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 24c-4 0-6-4-2-6s6 2 12 6c6-4 10-8 12-6s2 6-2 6"/><rect x="10" y="24" width="28" height="16" rx="2"/><path d="M24 24v16"/></svg></div>
          <span class="eh-type-name">증여세</span>
          <span class="eh-type-desc">생전에 재산을 무상으로 이전받을 때 발생하는 세금</span>
        </button>
        <button class="eh-type-card" data-type="acq">
          <span class="eh-type-check">✓</span>
          <div class="eh-type-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="12" width="32" height="28" rx="2"/><path d="M8 20h32"/><path d="M16 8v8m16-8v8"/><path d="M18 28h12m-12 6h8"/></svg></div>
          <span class="eh-type-name">취득세</span>
          <span class="eh-type-desc">부동산 등 자산 취득 시 납부하는 세금</span>
        </button>
        <button class="eh-type-card" data-type="prop">
          <span class="eh-type-check">✓</span>
          <div class="eh-type-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="18" width="28" height="22" rx="2"/><path d="M10 24h28"/><path d="M18 18V10h12v8"/><path d="M18 30h4v10h-4zm8 0h4v10h-4z"/></svg></div>
          <span class="eh-type-name">재산세/종합부동산세</span>
          <span class="eh-type-desc">매년 보유한 부동산에 대해 부과되는 세금</span>
        </button>
      </div>
    </div>
  </div>
  <div class="eh-footer"><span class="eh-footer-info">예상 소요 시간: 3분 내외</span><button class="eh-btn-primary" id="toStep2">다음 →</button></div>
</div>

<!-- ================================================================
     STEP 2: 자산 정보
     ================================================================ -->
<div class="eh-step" data-step="2">
  <div class="eh-card eh-card-main">
    <div class="eh-progress-bar">
      <span class="eh-pg-step-label">Step 2 of 4</span>
      <span class="eh-pg-step-name">자산 정보</span>
    </div>
    <div class="eh-pg-track"><div class="eh-pg-fill" style="width:50%"></div></div>
    <div style="padding: 32px 36px 36px;">
      <h1 class="eh-title" id="s2Title">자산 정보를 입력하세요</h1>
      <div class="eh-asset-tabs" id="assetTabs" data-g="asset">
        <button class="eh-asset-tab active" data-v="re">부동산</button>
        <button class="eh-asset-tab" data-v="stock" id="tabStock2">주식</button>
        <button class="eh-asset-tab" data-v="cash" id="tabCash2">현금</button>
      </div>
      <div class="eh-extra-input" id="reAddressWrap">
        <label class="eh-input-label">주소 <span class="eh-required">*</span></label>
        <input type="text" class="eh-text-input" id="inpAddress" placeholder="예: 서울시 강남구 역삼동 123-45">
      </div>
      <div class="eh-extra-input" id="reTypeDropWrap">
        <label class="eh-input-label">부동산 유형</label>
        <select class="eh-select-input" id="reTypeSelect">
          <option value="apt" selected>아파트</option>
          <option value="villa">빌라</option>
          <option value="officetel">오피스텔</option>
          <option value="commercial">상가</option>
          <option value="building">건물</option>
          <option value="land">토지</option>
          <option value="rights">입주권/분양권</option>
        </select>
      </div>
      <div class="eh-re-types" id="reTypes" style="display:none!important"></div>
      <div class="eh-extra-input eh-hd" id="stockNameWrap">
        <label class="eh-input-label">법인명</label>
        <input type="text" class="eh-text-input" id="inpStockName" placeholder="예: 삼성전자">
      </div>

      <!-- 일반 금액 입력 (양도세/취득세/증여세) -->
      <div class="eh-amount-section" id="singleAmountSection">
        <span class="eh-field-label" id="amountLabel">양도가액</span>
        <div class="eh-amount-box">
          <div class="eh-amount-display"><input type="text" class="eh-amount-input" id="inpAmount" placeholder="0" inputmode="numeric" autocomplete="off"><span class="eh-amount-unit">원</span></div>
          <div class="eh-amount-kr" id="amountKr"></div>
        </div>
      </div>

      <!-- ★ 상속세: 복수 자산 입력 -->
      <div id="inheritMultiAsset" style="display:none">
        <div class="eh-field" style="margin-bottom:20px">
          <span class="eh-field-label">피상속인의 배우자 유무</span>
          <select class="eh-select-input" id="selSpouse">
            <option value="yes" selected>있음 (배우자 상속공제 적용)</option>
            <option value="no">없음 (사별 등)</option>
          </select>
        </div>
        <div class="eh-field" style="margin-bottom:20px">
          <span class="eh-field-label">자녀 수</span>
          <select class="eh-select-input" id="selChildCount">
            <option value="0">없음</option>
            <option value="1" selected>1명</option>
            <option value="2">2명</option>
            <option value="3">3명</option>
            <option value="4+">4명 이상</option>
          </select>
        </div>
        <div class="eh-field" style="margin-bottom:20px">
          <span class="eh-field-label">피상속인(돌아가신 분)의 주택 보유 수</span>
          <select class="eh-select-input" id="selDecedentHouses">
            <option value="0">없음 (무주택)</option>
            <option value="1" selected>1주택</option>
            <option value="2">2주택</option>
            <option value="3+">3주택 이상</option>
          </select>
        </div>
        <div class="eh-field-label" style="margin-bottom:16px">상속 재산 목록</div>
        <p class="eh-inherit-guide">상속 재산의 종류별로 가액을 입력해주세요. 여러 자산이 있으면 '+ 자산 추가'를 눌러주세요.</p>
        <div id="inheritAssetList"></div>
        <button type="button" class="eh-btn-ghost eh-btn-sm" id="addInheritAsset" style="margin-top:12px">+ 자산 추가</button>
        <div class="eh-inherit-total">
          <span>총 상속재산가액</span>
          <div><span class="eh-inherit-total-amt" id="inheritTotalAmt">₩0</span><div class="eh-amount-kr" id="inheritTotalKr" style="text-align:right;margin-top:4px"></div></div>
        </div>
      </div>

      <!-- ★ 재산세/종부세: 보유 주택 통합 입력 -->
      <div id="propHouseSection" style="display:none">
        <div class="eh-field" style="margin-bottom:20px">
          <span class="eh-field-label">보유 주택 수</span>
          <select class="eh-select-input" id="selHousesProp">
            <option value="1" selected>1주택</option>
            <option value="2">2주택</option>
            <option value="3">3주택</option>
            <option value="multi">4주택 이상</option>
            <option value="unknown">모름</option>
          </select>
        </div>
        <div id="propDynamicHouses"></div>
        <button type="button" class="eh-btn-ghost eh-btn-sm" id="addPropHouseExtra" style="display:none;margin-top:8px">+ 주택 추가</button>
        <div class="eh-inherit-total" id="propTotalWrap" style="display:none">
          <span>총 공시가격 합계</span>
          <div><span class="eh-inherit-total-amt" id="propTotalAmt">₩0</span><div class="eh-amount-kr" id="propTotalKr" style="text-align:right;margin-top:4px"></div></div>
        </div>
      </div>
    </div>
  </div>
  <div class="eh-footer"><button class="eh-btn-ghost" id="backStep1">← 이전</button><button class="eh-btn-primary" id="toStep3">다음 →</button></div>
</div>

<!-- ================================================================
     STEP 3: 상세 조건
     ================================================================ -->
<div class="eh-step" data-step="3">
  <div class="eh-card eh-card-main">
    <div class="eh-progress-bar">
      <span class="eh-pg-step-label">Step 3 of 4</span>
      <span class="eh-pg-step-name">상세 조건</span>
    </div>
    <div class="eh-pg-track"><div class="eh-pg-fill" style="width:75%"></div></div>
    <div style="padding: 32px 36px 36px;">
      <h1 class="eh-title">상세 조건을 선택하세요</h1>

      <div class="eh-field" id="f3Dates">
        <div class="eh-date-row">
          <div class="eh-date-field"><label>취득일</label><input type="date" class="eh-date-input" id="inpAcqDate"></div>
          <div class="eh-date-field"><label>양도일</label><input type="date" class="eh-date-input" id="inpSaleDate"></div>
        </div>
      </div>

      <div class="eh-field" id="f3AcqPrice">
        <span class="eh-field-label">취득가액</span>
        <div class="eh-amount-box">
          <div class="eh-amount-display"><input type="text" class="eh-amount-input eh-money" id="inpAcqPrice" placeholder="0" inputmode="numeric"><span class="eh-amount-unit">원</span></div>
          <div class="eh-amount-kr" id="acqPriceKr"></div>
        </div>
      </div>

      <div class="eh-field" id="f3Reg">
        <span class="eh-field-label">조정대상지역 여부 <button type="button" class="eh-help-btn" id="regHelpBtn" title="조정대상지역 정보 보기"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.8"/><text x="10" y="14.5" text-anchor="middle" fill="currentColor" font-size="13" font-weight="700" font-family="sans-serif">?</text></svg></button></span>
        <select class="eh-select-input" id="selRegulated" data-g="regulated">
          <option value="no" selected>부 (비조정지역)</option>
          <option value="yes">여 (조정대상지역)</option>
          <option value="unknown">모름</option>
        </select>
        <div class="eh-help-popup eh-hd" id="regHelpPopup"><button type="button" class="eh-help-close" id="regHelpClose">&times;</button><h4>조정대상지역 지정·해제현황 (2025.10.16 현재)</h4><div class="eh-help-scroll"><table class="eh-help-table"><thead><tr><th>구분</th><th>지정지역</th><th>지정일자</th></tr></thead><tbody><tr><td rowspan="2">서울특별시(25)</td><td>서초구, 강남구, 송파구, 용산구 (4개구)</td><td>2017.9.6</td></tr><tr><td>종로구, 중구, 성동구, 광진구, 동대문구, 성북구, 강북구, 도봉구, 노원구, 은평구, 서대문구, 마포구, 양천구, 강서구, 구로구, 금천구, 영등포구, 동작구, 관악구, 강동구 (21개구)</td><td>2025.10.16 (재지정)</td></tr><tr><td rowspan="5">경기도(12)</td><td>과천시, 광명시, 하남시, 의왕시</td><td rowspan="5">2025.10.16 (재지정)</td></tr><tr><td>성남시 분당구·수정구·중원구</td></tr><tr><td>수원시 영통구·장안구·팔달구</td></tr><tr><td>용인시 수지구</td></tr><tr><td>안양시 동안구</td></tr></tbody></table></div></div>
      </div>

      <!-- ★ 취득세 전용: 취득 사유 -->
      <div id="f3AcqReason" class="eh-field eh-hd">
        <span class="eh-field-label">취득 사유</span>
        <select class="eh-select-input" id="selAcqReason">
          <option value="buy" selected>매매 (일반 거래)</option>
          <option value="inherit">상속으로 취득</option>
          <option value="gift">증여로 취득</option>
          <option value="new_build">신축 · 분양</option>
          <option value="auction">경매 · 공매</option>
        </select>
      </div>

      <!-- ★ 증여세 전용: 관계 선택 -->
      <div id="f3GiftSection" class="eh-hd">
        <div class="eh-field-label" style="margin-bottom:16px">증여자(주는 분)와 수증자(받는 분)의 관계</div>
        <p class="eh-inherit-guide" style="margin-bottom:16px">해당하는 관계를 선택해주세요. 관계에 따라 공제 금액이 달라집니다.</p>
        <div class="eh-gift-rel-grid" id="giftRelGrid">
          <button type="button" class="eh-gift-rel-card active" data-rel="child_adult">
            <div class="eh-gift-rel-icon"><span class="eh-gift-label">부모</span><span class="eh-gift-arrow">&rarr;</span><span class="eh-gift-label">성인 자녀</span></div>
            <span class="eh-gift-rel-deduct">공제 5,000만원</span>
          </button>
          <button type="button" class="eh-gift-rel-card" data-rel="child_minor">
            <div class="eh-gift-rel-icon"><span class="eh-gift-label">부모</span><span class="eh-gift-arrow">&rarr;</span><span class="eh-gift-label">미성년 자녀</span></div>
            <span class="eh-gift-rel-deduct">공제 2,000만원</span>
          </button>
          <button type="button" class="eh-gift-rel-card" data-rel="spouse">
            <div class="eh-gift-rel-icon"><span class="eh-gift-label">배우자</span><span class="eh-gift-arrow">&harr;</span><span class="eh-gift-label">배우자</span></div>
            <span class="eh-gift-rel-deduct">공제 6억원</span>
          </button>
          <button type="button" class="eh-gift-rel-card" data-rel="parent">
            <div class="eh-gift-rel-icon"><span class="eh-gift-label">자녀</span><span class="eh-gift-arrow">&rarr;</span><span class="eh-gift-label">부모</span></div>
            <span class="eh-gift-rel-deduct">공제 5,000만원</span>
          </button>
          <button type="button" class="eh-gift-rel-card" data-rel="other">
            <div class="eh-gift-rel-icon"><span class="eh-gift-label">기타 친족</span></div>
            <span class="eh-gift-rel-deduct">공제 1,000만원</span>
          </button>
        </div>
        <select id="selGiftRelation" class="eh-select-input" style="display:none">
          <option value="child_adult" selected>직계비속 (성인 자녀)</option>
          <option value="child_minor">직계비속 (미성년 자녀)</option>
          <option value="spouse">배우자</option>
          <option value="parent">직계존속 (부모)</option>
          <option value="other">기타 친족</option>
        </select>
        <div class="eh-field" style="margin-top:24px">
          <span class="eh-field-label">최근 10년 내 같은 증여자로부터 증여받은 적이 있나요?</span>
          <select class="eh-select-input" id="selPriorGiftFromSame">
            <option value="no" selected>없음</option>
            <option value="yes">있음 (기증여 합산 대상)</option>
            <option value="unknown">모름</option>
          </select>
        </div>
        <div class="eh-field eh-hd" id="f3PriorGiftDetail" style="margin-top:16px">
          <span class="eh-field-label">기증여 금액 (10년 내 동일인으로부터 받은 총액)</span>
          <div class="eh-amount-box sm"><input type="text" class="eh-amount-input" id="inpPriorGiftAmt" inputmode="numeric" placeholder="0"><span class="eh-won-label">원</span></div>
          <div class="eh-amount-kr" id="priorGiftAmtKr"></div>
        </div>
      </div>

      <div class="eh-field" id="f3Houses">
        <span class="eh-field-label">보유 주택 수</span>
        <select class="eh-select-input" id="selHouses" data-g="houses">
          <option value="1" selected>1주택</option>
          <option value="2">2주택</option>
          <option value="3">3주택</option>
          <option value="multi">4주택 이상</option>
          <option value="unknown">모름</option>
        </select>
      </div>

      <div class="eh-field" id="f3Reside">
        <span class="eh-field-label">실거주 기간</span>
        <select class="eh-select-input" id="selReside" data-g="reside">
          <option value="0">없음</option>
          <option value="2" selected>2년 이상</option>
          <option value="5">5년 이상</option>
          <option value="10">10년 이상</option>
          <option value="unknown">모름</option>
        </select>
      </div>

      <div class="eh-field" id="f3Area">
        <span class="eh-field-label">전용면적</span>
        <select class="eh-select-input" id="selArea" data-g="area">
          <option value="under85" selected>85㎡ 이하</option>
          <option value="over85">85㎡ 초과</option>
          <option value="unknown">모름</option>
        </select>
      </div>

      <!-- 주식 전용 -->
      <div class="eh-field eh-hd" id="f3StockListed">
        <span class="eh-field-label">상장 여부</span>
        <select class="eh-select-input" id="selStockListed">
          <option value="listed" selected>상장주식 (코스피/코스닥)</option>
          <option value="unlisted">비상장주식</option>
        </select>
      </div>
      <div class="eh-field eh-hd" id="f3StockMajor">
        <span class="eh-field-label">대주주 여부
          <button type="button" class="eh-help-btn" id="stockMajorHelpBtn" title="대주주 기준 보기"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.8"/><text x="10" y="14.5" text-anchor="middle" fill="currentColor" font-size="13" font-weight="700" font-family="sans-serif">?</text></svg></button>
        </span>
        <select class="eh-select-input" id="selStockMajor">
          <option value="minor" selected>소액주주 (비과세)</option>
          <option value="major">대주주 (지분율 1% 이상 또는 시가총액 10억 이상)</option>
        </select>
        <div class="eh-help-popup eh-hd" id="stockMajorHelpPopup">
          <button type="button" class="eh-help-close" id="stockMajorHelpClose">&times;</button>
          <h4>대주주 기준 (2026년 현재)</h4>
          <table class="eh-help-table"><thead><tr><th>시장</th><th>지분율</th><th>시가총액</th></tr></thead><tbody><tr><td>코스피</td><td>1% 이상</td><td>10억 이상</td></tr><tr><td>코스닥</td><td>2% 이상</td><td>10억 이상</td></tr></tbody></table>
          <p style="font-size:12px;margin-top:8px;color:#6b7280">직전 사업연도 종료일(12/31) 기준 판정</p>
        </div>
      </div>
      <div class="eh-field eh-hd" id="f3StockSme">
        <span class="eh-field-label">법인 규모</span>
        <select class="eh-select-input" id="selStockSme">
          <option value="sme" selected>중소기업</option>
          <option value="mid">중견기업</option>
          <option value="large">일반법인 (대기업)</option>
        </select>
      </div>

      <!-- 상속세 전용: 공제 조건 + 채무 입력 -->
      <div id="f3InheritDebt" style="display:none">
        <p class="eh-subtitle" style="margin-bottom:24px">상속공제 판단에 필요한 조건과 채무를 입력해주세요</p>
        <div class="eh-field">
          <span class="eh-field-label">상속인이 피상속인과 같은 주택에서 동거하셨나요?</span>
          <select class="eh-select-input" id="selCohabitation">
            <option value="no" selected>아니오</option>
            <option value="yes">예, 동거했습니다</option>
            <option value="unknown">모름</option>
          </select>
        </div>
        <div class="eh-field" id="f3CohabYears" style="display:none">
          <span class="eh-field-label">동거 기간</span>
          <select class="eh-select-input" id="selCohabYears">
            <option value="under5">5년 미만</option>
            <option value="5to10">5년 이상 ~ 10년 미만</option>
            <option value="over10" selected>10년 이상</option>
          </select>
        </div>
        <div class="eh-field">
          <span class="eh-field-label">상속인 본인 명의의 주택을 보유하고 계신가요?</span>
          <select class="eh-select-input" id="selHeirHasHouse">
            <option value="no" selected>아니오 (무주택)</option>
            <option value="yes">예, 본인 명의 주택 있음</option>
            <option value="unknown">모름</option>
          </select>
        </div>
        <div class="eh-field">
          <span class="eh-field-label">피상속인이 사망 전 10년 이내에 상속인에게 증여한 재산이 있나요?</span>
          <select class="eh-select-input" id="selPriorGift">
            <option value="no" selected>없음</option>
            <option value="yes">있음</option>
            <option value="unknown">모름</option>
          </select>
        </div>
        <div class="eh-field-label" style="margin-bottom:8px;margin-top:32px;padding-top:24px;border-top:1px solid #F0EDEB">채무 및 비용</div>
        <p class="eh-inherit-guide">예: 은행 대출금, 전세보증금(임대보증금), 미납 세금, 장례비용(최대 1,500만원), 병원비, 카드대금 등</p>
        <div id="inheritDebtList"></div>
        <button type="button" class="eh-btn-ghost eh-btn-sm" id="addInheritDebt" style="margin-top:12px">+ 채무 추가</button>
        <div class="eh-inherit-total" id="debtTotalWrap" style="display:none;margin-top:20px">
          <span>총 채무·비용</span>
          <div><span class="eh-inherit-total-amt" id="debtTotalAmt" style="color:#D32F2F">-₩0</span><div class="eh-amount-kr" id="debtTotalKr" style="text-align:right;margin-top:4px"></div></div>
        </div>
      </div>

      <!-- 숨김 chip 컨테이너 (JS 호환) -->
      <div style="display:none!important">
        <div class="eh-chips" data-g="regulated"></div>
        <div class="eh-chips" data-g="houses"></div>
        <div class="eh-chips" data-g="reside"></div>
        <div class="eh-chips" data-g="area"></div>
      </div>
    </div>
  </div>
  <div class="eh-footer"><button class="eh-btn-ghost" id="backStep2">← 이전</button><button class="eh-btn-primary eh-btn-calc" id="doCalc">계산하기</button></div>
</div>

<!-- STEP 4: 결과 -->
<div class="eh-step" data-step="4">
  <div class="eh-layout-2col eh-result-layout">
    <div class="eh-card eh-card-result">
      <div class="eh-result-label">예상 세액</div>
      <div class="eh-result-total" id="resultTotal">₩0</div>
      <div class="eh-result-items" id="resultItems"></div>
      <p class="eh-result-note">사실관계에 따라 실제 세액은 달라질 수 있습니다.</p>
    </div>
    <div class="eh-card eh-card-ai-cta">
      <h3 class="eh-ai-cta-title">EEHO AI로 세금 줄이기</h3>
      <ul class="eh-ai-cta-list"><li>자체 개발 AI로 맞춤형 절세 전략 분석</li><li>세부담을 가장 줄여주는 최적의 방식 추천</li><li>예상 절세액 확인</li></ul>
      <div class="eh-ai-cta-acc"><span>⊘</span> 정확도 <strong>99.9%</strong></div>
      <button class="eh-btn-ai eh-btn-yellow" id="startAI">EEHO AI로 분석하기</button>
    </div>
  </div>
  <div class="eh-footer"><button class="eh-btn-ghost" id="backStep3">← 이전</button><button class="eh-btn-ghost" id="resetAll">다시 계산하기</button></div>
</div>

<!-- ================================================================
     AI PHASES
     ================================================================ -->

<!-- AI 5a: 텍스트 입력 -->
<div class="eh-ai" id="aiTextPhase">
  <div class="eh-ai-header">
    <div class="eh-brand">세금 계산기 <span class="eh-brand-ai">with EEHO AI</span></div>
    <button class="eh-btn-ghost eh-btn-sm" id="aiBackToResult">← 결과로 돌아가기</button>
  </div>
  <div class="eh-card eh-card-main">
    <h1 class="eh-title">상황을 알려주세요</h1>
    <p class="eh-subtitle">자유롭게 입력하시면 EEHO AI가 절세 가능성을 분석합니다</p>
    <div class="eh-examples" id="aiExamples">
      <div class="eh-ex-label">✏️ 입력 예시</div>
      <div class="eh-ex-bubble" id="aiEx1">"올해 결혼을 하면서 2주택이 되었어요"</div>
      <div class="eh-ex-bubble" id="aiEx2">"부모님이 2주택자인데, 송파구 소재 아파트를 저가양수 하려고 해요."</div>
      <div class="eh-ex-bubble" id="aiEx3">"작년에 이사하려고 분당 아파트를 하나 더 샀어요. 기존 송파 아파트는 언제 팔아야 하나요?"</div>
    </div>
    <div class="eh-ta-wrap"><textarea class="eh-textarea" id="aiTextInput" placeholder="상황을 자유롭게 입력해주세요..." rows="4" maxlength="500"></textarea></div>
    <div class="eh-ta-bar"><span class="eh-ta-cnt"><span id="aiTxtCnt">0</span>/500</span><button class="eh-btn-primary" id="aiSendText">분석 요청 →</button></div>
  </div>
</div>

<!-- ★ AI 5b: 체크리스트 -->
<div class="eh-ai" id="aiChecklistPhase">
  <div class="eh-ai-header">
    <div class="eh-brand">세금 계산기 <span class="eh-brand-ai">with EEHO AI</span></div>
  </div>
  <div class="eh-card eh-card-main" style="padding:32px 36px 36px">
    <h2 class="eh-title" style="font-size:22px;margin-bottom:6px">추가 확인 사항</h2>
    <p class="eh-subtitle" style="margin-bottom:20px">아래 조건에 해당하는지 확인해주세요</p>
    <div id="checklistQuestions"></div>
    <div style="display:flex;gap:12px;margin-top:28px">
      <button class="eh-btn-primary" id="checklistSubmit">제출하기 →</button>
    </div>
  </div>
</div>

<!-- ★ AI 5c: 사실관계 확인 -->
<div class="eh-ai" id="aiConfirmPhase">
  <div class="eh-ai-header">
    <div class="eh-brand">세금 계산기 <span class="eh-brand-ai">with EEHO AI</span></div>
  </div>
  <div class="eh-card eh-card-main" style="padding:32px 36px 36px">
    <h2 class="eh-title" style="font-size:22px;margin-bottom:6px">사실관계 확인</h2>
    <p class="eh-subtitle" style="margin-bottom:20px">아래 내용이 정확한지 확인해주세요</p>
    <span class="eh-conf-badge" id="confirmConfidence"></span>
    <div class="eh-confirm-fact" style="margin:20px 0">
      <p id="confirmFactSummary" style="font-size:14px;line-height:1.7;color:var(--text)"></p>
    </div>
    <div id="confirmRequirements" style="margin-bottom:24px"></div>
    <p class="eh-confirm-guide" id="confirmGuideText" style="font-size:13px;color:var(--text-m);margin-bottom:20px">사실관계가 정확하면 '제출하기'를, 수정·보완이 필요하면 '보완하기'를 눌러주세요.</p>
    <div style="display:flex;gap:12px">
      <button class="eh-btn-primary" id="submitFinal">제출하기 →</button>
      <button class="eh-btn-outline" id="supplementBtn">보완하기</button>
      <button class="eh-btn-ghost eh-btn-sm" id="backToResultFromConfirm" style="margin-left:auto">← 결과로 돌아가기</button>
    </div>
  </div>
</div>

<!-- ★ AI 5d: 보완하기 텍스트 입력 -->
<div class="eh-ai" id="aiSupplementPhase">
  <div class="eh-ai-header">
    <div class="eh-brand">세금 계산기 <span class="eh-brand-ai">with EEHO AI</span></div>
  </div>
  <div class="eh-card eh-card-main" style="padding:32px 36px 36px">
    <h2 class="eh-title" style="font-size:22px;margin-bottom:6px">추가 상황을 알려주세요</h2>
    <p class="eh-subtitle" style="margin-bottom:20px">사실관계 정리에서 빠진 내용이나 수정할 사항을 입력해주세요</p>
    <div class="eh-ta-wrap"><textarea class="eh-textarea" id="supplementInput" placeholder="예: 합가 전에 분양권이 하나 더 있었어요..." rows="4" maxlength="500"></textarea></div>
    <div class="eh-ta-bar"><span class="eh-ta-cnt"><span id="supplementCnt">0</span>/500</span></div>
    <div style="display:flex;gap:12px;margin-top:20px">
      <button class="eh-btn-primary" id="supplementSubmit">보완 제출 →</button>
      <button class="eh-btn-ghost eh-btn-sm" id="backToConfirm">← 이전으로</button>
    </div>
  </div>
</div>

<!-- AI 대화형 (호환용) -->
<div class="eh-ai" id="aiConvPhase">
  <div class="eh-ai-header">
    <div class="eh-brand">세금 계산기 <span class="eh-brand-ai">with EEHO AI</span></div>
    <div class="eh-ai-progress-bar"><div class="eh-ai-progress-fill" id="aiProgressFill"></div></div>
  </div>
  <div class="eh-card eh-card-main eh-conv-card">
    <div class="eh-conv-chat" id="aiConvChat"></div>
    <div class="eh-conv-input-area" id="aiConvInputArea"></div>
  </div>
</div>

<!-- AI Loading -->
<div class="eh-ai" id="aiLoading">
  <div class="eh-loading">
    <div class="eh-bot">
      <div class="eh-bot-body">
        <div class="eh-bot-antenna"><div class="eh-bot-antenna-ball"></div></div>
        <div class="eh-bot-head">
          <div class="eh-bot-eye eh-bot-eye-l"></div>
          <div class="eh-bot-eye eh-bot-eye-r"></div>
        </div>
        <div class="eh-bot-torso"></div>
      </div>
      <div class="eh-bot-legs">
        <div class="eh-bot-leg eh-bot-leg-l"></div>
        <div class="eh-bot-leg eh-bot-leg-r"></div>
      </div>
    </div>
    <h3 class="eh-ld-title">AI 분석 중<span class="eh-ld-dots"></span></h3>
    <p class="eh-ld-desc">제출하신 자료를 기반으로<br>관련 세법과 판례를 분석하고 있습니다</p>
    <p class="eh-ld-wait">잠시만 기다려주세요</p>
    <div class="eh-ld-meta"><span>📋 <span id="ehLdYear"></span>년 개정세법 반영</span><span>⏱ 약 10~15초</span></div>
  </div>
</div>

<!-- AI 최종 결과 -->
<div class="eh-ai" id="aiFinal">
  <div class="eh-final-header">
    <div id="finalResultBadge" class="eh-result-badge eh-badge-pass">
      <span class="eh-badge-icon" id="finalBadgeIcon">✓</span>
      <div class="eh-badge-text">
        <span class="eh-badge-label" id="finalBadgeLabel">비과세 특례 적용 가능</span>
        <span class="eh-badge-type" id="finalBadgeType">PASS</span>
      </div>
    </div>
  </div>
  <div class="eh-card eh-card-compare">
    <div class="eh-compare-row">
      <div class="eh-compare-before"><span class="eh-compare-label">AI 적용 전</span><span class="eh-compare-amt strikethrough" id="finalBefore">₩0</span></div>
      <div class="eh-compare-after"><span class="eh-compare-label">AI 적용 후</span><span class="eh-compare-amt highlight" id="finalAfter">₩0</span></div>
    </div>
    <div id="finalTaxSaving" style="display:none;padding:12px 20px;text-align:center;font-size:14px;font-weight:700;color:var(--teal);background:rgba(0,68,71,0.04);border-top:1px solid var(--gray-l)"></div>
  </div>
  <div class="eh-final-details">
    <div class="eh-card eh-card-breakdown"><h3>📋 분석 결과</h3><div id="finalDetails" class="eh-details-text"></div></div>
  </div>
  <div class="eh-card" id="finalLawWrap" style="display:none;margin-bottom:16px;padding:20px 24px">
    <h3 style="font-size:16px;font-weight:700;color:var(--teal);margin-bottom:10px">📖 근거 법령</h3>
    <div id="finalAppliedLaw" style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px"></div>
    <div id="finalLawSummary" style="font-size:14px;line-height:1.65;color:var(--text-s)"></div>
  </div>
  <div class="eh-card eh-card-risk"><h3>⚠ 리스크</h3><div id="finalRisks" class="eh-risk-list"></div></div>
  <div class="eh-card eh-card-notice"><div class="eh-notice-icon">📋</div><div class="eh-notice-text"><strong>세무사 검토 안내</strong><p>위 분석은 AI가 세법 데이터를 기반으로 산출한 예상 결과이며, 실제 신고 시에는 반드시 세무 전문가의 검토가 필요합니다.</p></div></div>
  <div class="eh-final-actions">
    <a href="https://pf.kakao.com/_xjKxoG/chat" target="_blank" class="eh-btn-primary eh-btn-consult">세무 전문가 상담</a>
    <button class="eh-btn-outline" id="backToResult">← 결과로 돌아가기</button>
  </div>
</div>

<!-- ★ 로그인 팝업 오버레이 -->
<div id="ehLoginOverlay" style="display:none">
  <div id="ehLoginModal">
    <button id="ehLoginClose">&times;</button>
    <div class="eh-login-logo">
      <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="22" stroke="#004447" stroke-width="2.5"/>
        <path d="M24 14v10l6 4" stroke="#F95C32" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
      <span>EEHO AI</span>
    </div>
    <h2 class="eh-login-title">로그인이 필요한 서비스입니다</h2>
    <p class="eh-login-desc">EEHO AI 분석은 회원에게만 제공됩니다.<br>구글 계정으로 간편하게 시작하세요.</p>
    <a id="ehGoogleLoginBtn" href="<?php echo $google_login_url; ?>">
      <svg width="20" height="20" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        <path fill="none" d="M0 0h48v48H0z"/>
      </svg>
      구글 계정으로 로그인
    </a>
    <p class="eh-login-terms">로그인 시 <a href="/privacy" target="_blank">개인정보처리방침</a>에 동의하는 것으로 간주됩니다.</p>
  </div>
</div>

</div><!-- /#eeho-app -->
