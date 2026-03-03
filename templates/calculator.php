<style>
#eeho-app .eh-hd{display:none!important}
#eeho-app .eh-step{display:none!important}
#eeho-app .eh-step.active{display:block!important}
#eeho-app .eh-ai{display:none!important}
#eeho-app .eh-ai.active{display:block!important}
#eeho-app *{box-sizing:border-box!important}
#eeho-app .eh-law-badge{display:inline-block;padding:6px 16px;background:var(--teal-xl);border:1.5px solid var(--teal);border-radius:20px;font-size:13px;font-weight:700;color:var(--teal);margin-bottom:10px}
#eeho-app .eh-law-summary{font-size:14px;color:var(--text-s);line-height:1.6;background:var(--pearl);border-radius:10px;padding:14px 18px;margin-bottom:24px;border-left:4px solid var(--teal)}
#eeho-app .eh-cl-item{background:var(--white);border:1.5px solid var(--gray-l);border-radius:var(--R);padding:20px 22px;margin-bottom:14px;transition:border-color .2s}
#eeho-app .eh-cl-item.eh-cl-error{border-color:var(--red)}
#eeho-app .eh-cl-category{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ember);margin-bottom:8px}
#eeho-app .eh-cl-question{font-size:15px;font-weight:600;color:var(--text);line-height:1.5;margin-bottom:14px}
#eeho-app .eh-cl-btns{display:flex;gap:10px}
#eeho-app .eh-cl-btn{flex:1;padding:12px 8px;border:1.5px solid var(--gray);border-radius:10px;font-size:14px;font-weight:700;color:var(--text-s);background:var(--white);cursor:pointer;transition:all .2s}
#eeho-app .eh-cl-btn:hover{border-color:var(--teal);color:var(--teal)}
#eeho-app .eh-cl-btn[data-val="예"].selected{background:var(--teal);color:#fff;border-color:var(--teal)}
#eeho-app .eh-cl-btn[data-val="아니오"].selected{background:var(--red);color:#fff;border-color:var(--red)}
#eeho-app .eh-cl-btn[data-val="모름"].selected{background:var(--text-m);color:#fff;border-color:var(--text-m)}
#eeho-app .eh-ai-step-indicator{font-size:13px;font-weight:600;color:var(--text-m);margin-left:auto}
#eeho-app .eh-fact-box{background:var(--pearl);border-radius:var(--R);padding:22px 24px;font-size:15px;line-height:1.8;color:var(--text);margin-bottom:20px;border-left:4px solid var(--teal)}
#eeho-app .eh-req-row{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--gray-l)}
#eeho-app .eh-req-row:last-child{border-bottom:none}
#eeho-app .eh-req-icon{font-size:18px;flex-shrink:0;margin-top:1px}
#eeho-app .eh-req-info{flex:1}
#eeho-app .eh-req-info strong{display:block;font-size:14px;font-weight:700;margin-bottom:2px}
#eeho-app .eh-req-info span{font-size:13px;color:var(--text-m)}
#eeho-app .eh-req-status{font-size:13px;font-weight:700;white-space:nowrap}
#eeho-app .eh-req-pass .eh-req-icon{color:var(--green)}#eeho-app .eh-req-pass .eh-req-status{color:var(--green)}
#eeho-app .eh-req-fail .eh-req-icon{color:var(--red)}#eeho-app .eh-req-fail .eh-req-status{color:var(--red)}
#eeho-app .eh-req-review .eh-req-icon{color:#F59E0B}#eeho-app .eh-req-review .eh-req-status{color:#F59E0B}
#eeho-app .eh-tax-compare{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:20px 0}
#eeho-app .eh-tax-col{text-align:center;padding:16px;border-radius:12px;background:var(--pearl)}
#eeho-app .eh-tax-col.saving{background:linear-gradient(135deg,#E0F2E9,#B8DFCA);border:1px solid #81C784}
#eeho-app .eh-tax-col-label{font-size:12px;color:var(--text-m);margin-bottom:6px;display:block}
#eeho-app .eh-tax-col-amt{font-size:18px;font-weight:800;color:var(--text)}
#eeho-app .eh-tax-col.saving .eh-tax-col-amt{color:var(--green)}
#eeho-app .eh-conf-badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:700;margin-left:8px}
#eeho-app .eh-conf-high{background:#E0F2E9;color:var(--green)}
#eeho-app .eh-conf-mid{background:#FFF9E6;color:#B45309}
#eeho-app .eh-conf-low{background:#FFEBEE;color:var(--red)}
#eeho-app .eh-confirm-actions{display:flex;gap:12px;margin-top:24px}
#eeho-app .eh-btn-supplement{padding:16px 32px;font-size:15px;font-weight:600;color:var(--teal);border:1.5px solid var(--teal);border-radius:var(--Rs);background:var(--white);cursor:pointer;transition:all .2s;flex:1}
#eeho-app .eh-btn-supplement:hover{background:var(--teal-xl)}
#eeho-app .eh-btn-submit-final{padding:16px 32px;font-size:15px;font-weight:700;background:var(--ember);color:#fff;border-radius:var(--Rs);border:none;cursor:pointer;transition:all .2s;flex:1}
#eeho-app .eh-btn-submit-final:hover{background:var(--ember-d)}
#eeho-app .eh-supplement-notice{background:var(--ember-l);border:1px solid rgba(249,92,50,.2);border-radius:10px;padding:14px 18px;font-size:14px;color:var(--text-s);line-height:1.6;margin-bottom:20px}
#eeho-app .eh-supplement-notice strong{color:var(--ember);display:block;margin-bottom:4px}
#eeho-app .eh-final-law-wrap{margin-bottom:16px}
#eeho-app .eh-final-law{display:inline-block;background:var(--teal-xl);border:1px solid var(--teal);padding:6px 16px;border-radius:20px;font-size:13px;font-weight:700;color:var(--teal)}
#eeho-app .eh-badge-review{background:linear-gradient(135deg,#FFF9E6 0%,#FDE68A 100%);border:1.5px solid #F59E0B}
#eeho-app .eh-badge-review .eh-badge-icon{background:#F59E0B;color:#fff}
#eeho-app .eh-badge-review .eh-badge-label{color:#92400E}
#eeho-app .eh-badge-review .eh-badge-type{color:#B45309}
@media(max-width:480px){#eeho-app .eh-tax-compare{grid-template-columns:1fr}#eeho-app .eh-confirm-actions{flex-direction:column}}
#eeho-app .eh-ld-ring{position:relative;width:100px;height:100px;margin:0 auto 24px}
#eeho-app .eh-ld-ring svg{display:block}
#eeho-app .eh-ld-icon{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}
@keyframes eehoSpin{0%{stroke-dashoffset:276.46}100%{stroke-dashoffset:0}}
#eeho-app .eh-ld-anim{animation:eehoSpin 2s ease-in-out forwards}
</style>
<div id="eeho-app">
<div class="eh-hero">
  <div class="eh-hero-badge"><span class="eh-hero-dot"></span> AI 세금 분석</div>
  <h1 class="eh-hero-title">AI 세금 계산기</h1>
  <p class="eh-hero-sub">EEHO AI의 정밀 분석으로 단순 계산부터 복잡한 시나리오까지,<br>모든 절세 포인트를 찾아드립니다.</p>
</div>
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
<!-- STEP 1 -->
<div class="eh-step active" data-step="1">
  <div class="eh-card eh-card-main">
    <div class="eh-progress-bar"><span class="eh-pg-step-label">Step 1 of 4</span><span class="eh-pg-step-name">세금 유형</span></div>
    <div class="eh-pg-track"><div class="eh-pg-fill" style="width:25%"></div></div>
    <div style="padding:32px 36px 36px">
      <h1 class="eh-title">어떤 세금을 계산할까요?</h1>
      <p class="eh-subtitle"><span class="eh-highlight">EEHO AI</span>가 최적의 절세 포인트를 찾아드립니다</p>
      <div class="eh-type-grid">
        <button class="eh-type-card active" data-type="cgt"><span class="eh-type-check">✓</span><div class="eh-type-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 40V20L20 10l12 10v20"/><path d="M28 40V28h-8v12"/><path d="M32 16l8 0m-4-4v8"/></svg></div><span class="eh-type-name">양도소득세</span><span class="eh-type-desc">부동산 등 매매 시 발생하는 소득에 대한 세금</span></button>
        <button class="eh-type-card" data-type="acq"><span class="eh-type-check">✓</span><div class="eh-type-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="12" width="32" height="28" rx="2"/><path d="M8 20h32"/><path d="M16 8v8m16-8v8"/><path d="M18 28h12m-12 6h8"/></svg></div><span class="eh-type-name">취득세</span><span class="eh-type-desc">부동산 등 자산 취득 시 납부하는 세금</span></button>
        <button class="eh-type-card" data-type="prop"><span class="eh-type-check">✓</span><div class="eh-type-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="18" width="28" height="22" rx="2"/><path d="M10 24h28"/><path d="M18 18V10h12v8"/><path d="M18 30h4v10h-4zm8 0h4v10h-4z"/></svg></div><span class="eh-type-name">재산세/종합부동산세</span><span class="eh-type-desc">매년 보유한 부동산에 대해 부과되는 세금</span></button>
        <button class="eh-type-card" data-type="gift"><span class="eh-type-check">✓</span><div class="eh-type-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 24c-4 0-6-4-2-6s6 2 12 6c6-4 10-8 12-6s2 6-2 6"/><rect x="10" y="24" width="28" height="16" rx="2"/><path d="M24 24v16"/></svg></div><span class="eh-type-name">상속·증여</span><span class="eh-type-desc">재산을 무상으로 이전받을 때 발생하는 세금</span></button>
      </div>
    </div>
  </div>
  <div class="eh-footer"><span class="eh-footer-info">예상 소요 시간: 3분 내외</span><button class="eh-btn-primary" id="toStep2">다음 →</button></div>
</div>
<!-- STEP 2 -->
<div class="eh-step" data-step="2">
  <div class="eh-card eh-card-main">
    <div class="eh-progress-bar"><span class="eh-pg-step-label">Step 2 of 4</span><span class="eh-pg-step-name">자산 정보</span></div>
    <div class="eh-pg-track"><div class="eh-pg-fill" style="width:50%"></div></div>
    <div style="padding:32px 36px 36px">
      <h1 class="eh-title" id="s2Title">자산 정보를 입력하세요</h1>
      <div class="eh-asset-tabs" id="assetTabs" data-g="asset"><button class="eh-asset-tab active" data-v="re">부동산</button><button class="eh-asset-tab" data-v="stock" id="tabStock2">주식</button><button class="eh-asset-tab" data-v="cash" id="tabCash2">현금</button></div>
      <div class="eh-extra-input" id="reAddressWrap"><label class="eh-input-label">주소 <span class="eh-required">*</span></label><input type="text" class="eh-text-input" id="inpAddress" placeholder="예: 서울시 강남구 역삼동 123-45"></div>
      <div class="eh-extra-input" id="reTypeDropWrap"><label class="eh-input-label">부동산 유형</label><select class="eh-select-input" id="reTypeSelect"><option value="apt" selected>아파트</option><option value="villa">빌라</option><option value="officetel">오피스텔</option><option value="commercial">상가</option><option value="building">건물</option><option value="land">토지</option><option value="rights">입주권/분양권</option></select></div>
      <div class="eh-re-types" id="reTypes" style="display:none!important"></div>
      <div class="eh-extra-input eh-hd" id="stockNameWrap"><label class="eh-input-label">법인명</label><input type="text" class="eh-text-input" id="inpStockName" placeholder="예: 삼성전자"></div>
      <div class="eh-amount-section"><span class="eh-field-label" id="amountLabel">양도가액</span><div class="eh-amount-box"><div class="eh-amount-display"><input type="text" class="eh-amount-input" id="inpAmount" placeholder="0" inputmode="numeric" autocomplete="off"><span class="eh-amount-unit">원</span></div><div class="eh-amount-kr" id="amountKr"></div></div></div>
    </div>
  </div>
  <div class="eh-footer"><button class="eh-btn-ghost" id="backStep1">← 이전</button><button class="eh-btn-primary" id="toStep3">다음 →</button></div>
</div>
<!-- STEP 3 -->
<div class="eh-step" data-step="3">
  <div class="eh-card eh-card-main">
    <div class="eh-progress-bar"><span class="eh-pg-step-label">Step 3 of 4</span><span class="eh-pg-step-name">상세 조건</span></div>
    <div class="eh-pg-track"><div class="eh-pg-fill" style="width:75%"></div></div>
    <div style="padding:32px 36px 36px">
      <h1 class="eh-title">상세 조건을 선택하세요</h1>
      <div class="eh-field" id="f3Dates"><div class="eh-date-row"><div class="eh-date-field"><label>취득일</label><input type="date" class="eh-date-input" id="inpAcqDate"></div><div class="eh-date-field"><label>양도일</label><input type="date" class="eh-date-input" id="inpSaleDate"></div></div></div>
      <div class="eh-field" id="f3AcqPrice"><span class="eh-field-label">취득가액</span><div class="eh-amount-box"><div class="eh-amount-display"><input type="text" class="eh-amount-input eh-money" id="inpAcqPrice" placeholder="0" inputmode="numeric"><span class="eh-amount-unit">원</span></div><div class="eh-amount-kr" id="acqPriceKr"></div></div></div>
      <div class="eh-field" id="f3Reg"><span class="eh-field-label">조정대상지역 여부 <button type="button" class="eh-help-btn" id="regHelpBtn"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.8"/><text x="10" y="14.5" text-anchor="middle" fill="currentColor" font-size="13" font-weight="700" font-family="sans-serif">?</text></svg></button></span><select class="eh-select-input" id="selRegulated" data-g="regulated"><option value="no" selected>부 (비조정지역)</option><option value="yes">여 (조정대상지역)</option><option value="unknown">모름</option></select><div class="eh-help-popup eh-hd" id="regHelpPopup"><button type="button" class="eh-help-close" id="regHelpClose">&times;</button><h4>조정대상지역 지정·해제현황 (2025.10.16 현재)</h4><div class="eh-help-scroll"><table class="eh-help-table"><thead><tr><th>구분</th><th>지정지역</th><th>지정일자</th></tr></thead><tbody><tr><td rowspan="2">서울특별시(25)</td><td>서초구, 강남구, 송파구, 용산구 (4개구)</td><td>2017.9.6</td></tr><tr><td>종로구, 중구, 성동구, 광진구, 동대문구, 성북구, 강북구, 도봉구, 노원구, 은평구, 서대문구, 마포구, 양천구, 강서구, 구로구, 금천구, 영등포구, 동작구, 관악구, 강동구 (21개구)</td><td>2025.10.16 (재지정)</td></tr><tr><td rowspan="5">경기도(12)</td><td>과천시, 광명시, 하남시, 의왕시</td><td rowspan="5">2025.10.16 (재지정)</td></tr><tr><td>성남시 분당구·수정구·중원구</td></tr><tr><td>수원시 영통구·장안구·팔달구</td></tr><tr><td>용인시 수지구</td></tr><tr><td>안양시 동안구</td></tr></tbody></table></div></div></div>
      <div class="eh-field" id="f3Houses"><span class="eh-field-label">보유 주택 수</span><select class="eh-select-input" id="selHouses" data-g="houses"><option value="1" selected>1주택</option><option value="2">2주택</option><option value="3">3주택</option><option value="multi">4주택 이상</option><option value="unknown">모름</option></select></div>
      <div class="eh-field" id="f3Reside"><span class="eh-field-label">실거주 기간</span><select class="eh-select-input" id="selReside" data-g="reside"><option value="0">없음</option><option value="2" selected>2년 이상</option><option value="5">5년 이상</option><option value="10">10년 이상</option><option value="unknown">모름</option></select></div>
      <div class="eh-field" id="f3Area"><span class="eh-field-label">전용면적</span><select class="eh-select-input" id="selArea" data-g="area"><option value="under85" selected>85㎡ 이하</option><option value="over85">85㎡ 초과</option><option value="unknown">모름</option></select></div>
      <div style="display:none!important"><div class="eh-chips" data-g="regulated"></div><div class="eh-chips" data-g="houses"></div><div class="eh-chips" data-g="reside"></div><div class="eh-chips" data-g="area"></div></div>
    </div>
  </div>
  <div class="eh-footer"><button class="eh-btn-ghost" id="backStep2">← 이전</button><button class="eh-btn-primary eh-btn-calc" id="doCalc">계산하기</button></div>
</div>
<!-- STEP 4 -->
<div class="eh-step" data-step="4">
  <div class="eh-layout-2col eh-result-layout">
    <div class="eh-card eh-card-result"><div class="eh-result-label">예상 세액</div><div class="eh-result-total" id="resultTotal">₩0</div><div class="eh-result-items" id="resultItems"></div><p class="eh-result-note">사실관계에 따라 실제 세액은 달라질 수 있습니다.</p></div>
    <div class="eh-card eh-card-ai-cta"><h3 class="eh-ai-cta-title">EEHO AI로 세금 줄이기</h3><ul class="eh-ai-cta-list"><li>자체 개발 AI로 맞춤형 절세 전략 분석</li><li>세부담을 가장 줄여주는 최적의 방식 추천</li><li>예상 절세액 확인</li></ul><div class="eh-ai-cta-acc"><span>⊘</span> 정확도 <strong>99.9%</strong></div><button class="eh-btn-ai eh-btn-yellow" id="startAI">EEHO AI로 분석하기</button></div>
  </div>
  <div class="eh-footer"><button class="eh-btn-ghost" id="backStep3">← 이전</button><button class="eh-btn-ghost" id="resetAll">다시 계산하기</button></div>
</div>
<!-- AI Phase 1: 텍스트 입력 -->
<div class="eh-ai" id="aiTextPhase">
  <div class="eh-ai-header"><div class="eh-brand">세금 계산기 <span class="eh-brand-ai">with EEHO AI</span></div><button class="eh-btn-ghost eh-btn-sm" id="aiBackToResult">← 결과로 돌아가기</button></div>
  <div class="eh-card eh-card-main">
    <h1 class="eh-title">상황을 알려주세요</h1>
    <p class="eh-subtitle">자유롭게 입력하시면 EEHO AI가 절세 가능성을 분석합니다</p>
    <div class="eh-examples"><div class="eh-ex-label">✏️ 입력 예시</div><div class="eh-ex-bubble">"올해 결혼을 하면서 2주택이 되었어요"</div><div class="eh-ex-bubble">"부모님이 2주택자인데, 송파구 소재 아파트를 저가양수 하려고 해요."</div><div class="eh-ex-bubble">"작년에 이사하려고 분당 아파트를 하나 더 샀어요. 기존 송파 아파트는 언제 팔아야 하나요?"</div></div>
    <div class="eh-ta-wrap"><textarea class="eh-textarea" id="aiTextInput" placeholder="상황을 자유롭게 입력해주세요..." rows="4" maxlength="500"></textarea></div>
    <div class="eh-ta-bar"><span class="eh-ta-cnt"><span id="aiTxtCnt">0</span>/500</span><button class="eh-btn-primary" id="aiSendText">분석 요청 →</button></div>
  </div>
</div>
<!-- AI Phase 2: 체크리스트 -->
<div class="eh-ai" id="aiChecklistPhase">
  <div class="eh-ai-header"><div class="eh-brand">세금 계산기 <span class="eh-brand-ai">with EEHO AI</span></div><div class="eh-ai-step-indicator">Step 1 of 3 · 요건 확인</div></div>
  <div class="eh-card eh-card-main" style="padding:32px 36px">
    <div class="eh-law-badge" id="checklistLawName" style="display:none"></div>
    <div class="eh-law-summary" id="checklistLawSummary" style="display:none"></div>
    <h2 class="eh-title" style="font-size:20px;margin-bottom:6px">아래 항목을 확인해주세요</h2>
    <p class="eh-subtitle" style="margin-bottom:20px">정확한 판단을 위해 3가지 핵심 요건을 확인합니다</p>
    <div id="checklistQuestions"></div>
    <button class="eh-btn-primary" style="width:100%;margin-top:8px" id="checklistSubmit">요건 확인 완료 →</button>
  </div>
</div>
<!-- AI Phase 3: 사실관계 정리본 -->
<div class="eh-ai" id="aiConfirmPhase">
  <div class="eh-ai-header"><div class="eh-brand">세금 계산기 <span class="eh-brand-ai">with EEHO AI</span></div><div class="eh-ai-step-indicator">Step 2 of 3 · 사실관계 확인</div></div>
  <div class="eh-card eh-card-main" style="padding:32px 36px">
    <h2 class="eh-title" style="font-size:20px;margin-bottom:6px">현재 파악된 고객님의 상황입니다 <span id="confirmConfidence" class="eh-conf-badge"></span></h2>
    <p class="eh-subtitle" style="margin-bottom:16px">내용이 맞으면 제출하기, 추가 설명이 필요하면 보완하기를 선택하세요</p>
    <div class="eh-fact-box" id="confirmFactSummary"></div>
    <h3 style="font-size:15px;font-weight:700;margin-bottom:12px;color:var(--teal)">📋 요건 검토 결과</h3>
    <div id="confirmRequirements" style="margin-bottom:20px"></div>
    <div class="eh-tax-compare" style="display:none">
      <div class="eh-tax-col"><span class="eh-tax-col-label">현재 예상세액</span><div class="eh-tax-col-amt" id="confirmTaxBefore">-</div></div>
      <div class="eh-tax-col"><span class="eh-tax-col-label">비과세 적용 후</span><div class="eh-tax-col-amt" id="confirmTaxAfter">-</div></div>
      <div class="eh-tax-col saving"><span class="eh-tax-col-label">예상 절세액</span><div class="eh-tax-col-amt" id="confirmTaxSaving">-</div></div>
    </div>
    <p style="font-size:13px;color:var(--text-m);margin-bottom:16px;line-height:1.6">위 내용이 맞으면 <strong>예상 절세액 확인하기</strong>를 눌러주세요.<br>고객님의 상황과 요건 검토 결과에 추가로 보완하고자 하는 내용이 있는 경우 <strong>보완하기</strong>를 선택해주세요.</p>
    <div class="eh-confirm-actions">
      <button class="eh-btn-supplement" id="supplementBtn">✏️ 보완하기</button>
      <button class="eh-btn-submit-final" id="submitFinal">예상 절세액 확인하기 →</button>
    </div>
    <div style="text-align:center;margin-top:12px"><button class="eh-btn-ghost eh-btn-sm" id="backToResultFromConfirm">← 결과로 돌아가기</button></div>
  </div>
</div>
<!-- AI Phase 4: 보완 입력 -->
<div class="eh-ai" id="aiSupplementPhase">
  <div class="eh-ai-header"><div class="eh-brand">세금 계산기 <span class="eh-brand-ai">with EEHO AI</span></div><div class="eh-ai-step-indicator">Step 2.5 of 3 · 보완 입력</div></div>
  <div class="eh-card eh-card-main" style="padding:32px 36px">
    <h2 class="eh-title" style="font-size:20px;margin-bottom:6px">추가 상황을 알려주세요</h2>
    <p class="eh-subtitle" style="margin-bottom:16px">사실관계 정리본에서 누락되거나 잘못된 내용이 있다면 자유롭게 입력해주세요</p>
    <div class="eh-ta-wrap"><textarea class="eh-textarea" id="supplementInput" placeholder="예: 합가일이 2023년 3월이고, 어머니 주택은 경기도 과천시에 있습니다..." rows="5" maxlength="1000"></textarea></div>
    <div class="eh-ta-bar"><span class="eh-ta-cnt"><span id="supplementCnt">0</span>/1000</span><button class="eh-btn-primary" id="supplementSubmit">보완 완료 · 최종 분석 받기 →</button></div>
    <div style="text-align:center;margin-top:12px"><button class="eh-btn-ghost eh-btn-sm" id="backToConfirm">← 사실관계로 돌아가기</button></div>
  </div>
</div>
<!-- AI Loading -->
<div class="eh-ai" id="aiLoading">
  <div class="eh-loading">
    <div class="eh-ld-ring">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="none" stroke="#EDE6E2" stroke-width="4"/>
        <circle cx="50" cy="50" r="44" fill="none" stroke="#F95C32" stroke-width="4" stroke-dasharray="276.46" stroke-dashoffset="276.46" stroke-linecap="round" class="eh-ld-anim" style="transform-origin:50px 50px;transform:rotate(-90deg)"/>
      </svg>
      <div class="eh-ld-icon">
        <svg width="22" height="22" viewBox="0 0 36 36" fill="none"><rect x="7" y="7" width="22" height="16" rx="4" stroke="#004447" stroke-width="1.5"/><circle cx="14" cy="15" r="2" fill="#004447"/><circle cx="22" cy="15" r="2" fill="#004447"/><path d="M13 28l5-4 5 4" stroke="#004447" stroke-width="1.5" stroke-linecap="round"/></svg>
      </div>
    </div>
    <h3 class="eh-ld-title">AI 분석 중<span class="eh-ld-dots"></span></h3>
    <p class="eh-ld-desc">제출하신 자료를 기반으로<br>관련 세법과 판례를 분석하고 있습니다</p>
    <p class="eh-ld-wait">잠시만 기다려주세요</p>
    <div class="eh-ld-meta"><span>📋 <span id="ehLdYear"></span>년 개정세법 반영</span><span>⏱ 약 10~20초</span></div>
  </div>
</div>
<!-- AI Phase 5: 최종 리포트 -->
<div class="eh-ai" id="aiFinal">
  <div class="eh-final-header">
    <div id="finalResultBadge" class="eh-result-badge eh-badge-pass">
      <span class="eh-badge-icon" id="finalBadgeIcon">✓</span>
      <div class="eh-badge-text"><span class="eh-badge-label" id="finalBadgeLabel">비과세 특례 적용 가능</span><span class="eh-badge-type" id="finalBadgeType">PASS</span></div>
    </div>
  </div>
  <div class="eh-card eh-card-compare">
    <div class="eh-compare-row">
      <div class="eh-compare-before"><span class="eh-compare-label">AI 적용 전</span><span class="eh-compare-amt strikethrough" id="finalBefore">₩0</span></div>
      <div class="eh-compare-after"><span class="eh-compare-label">AI 적용 후</span><span class="eh-compare-amt highlight" id="finalAfter">₩0</span></div>
    </div>
  </div>
  <div class="eh-final-details"><div class="eh-card eh-card-breakdown"><h3>📋 판단 근거</h3><div id="finalDetails" class="eh-details-text"></div><div class="eh-final-law-wrap" style="margin-top:16px;display:none" id="finalLawWrap"><span class="eh-final-law" id="finalAppliedLaw"></span></div><div class="eh-final-law-summary-wrap" id="finalLawSummaryWrap" style="font-size:13px;color:var(--text-m);line-height:1.6;background:var(--pearl);border-radius:8px;padding:12px 16px;margin-top:10px;border-left:3px solid var(--teal);display:none"><span id="finalLawSummary"></span></div></div></div>
  <div class="eh-card eh-card-risk"><h3>⚠ 리스크 안내</h3><div id="finalRisks" class="eh-risk-list"></div></div>
  <div class="eh-card eh-card-notice"><div class="eh-notice-icon">📋</div><div class="eh-notice-text"><strong>세무사 검토 안내</strong><p>위 분석은 AI가 세법 데이터를 기반으로 산출한 예상 결과이며, 실제 신고 시에는 반드시 세무 전문가의 검토가 필요합니다.</p></div></div>
  <div class="eh-final-actions">
    <a href="https://pf.kakao.com/_xjKxoG/chat" target="_blank" class="eh-btn-primary eh-btn-consult">세무 전문가 상담</a>
    <button class="eh-btn-outline" id="backToResult">← 결과로 돌아가기</button>
  </div>
</div>
</div>
