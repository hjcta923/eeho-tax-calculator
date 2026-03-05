<style>
#eeho-app .eh-hd{display:none!important}
#eeho-app .eh-step{display:none!important}
#eeho-app .eh-step.active{display:block!important}
#eeho-app .eh-ai{display:none!important}
#eeho-app .eh-ai.active{display:block!important}
#eeho-app *{box-sizing:border-box!important}
</style>
<div id="eeho-app">

<!-- HERO -->
<div class="eh-hero">
  <div class="eh-hero-badge"><span class="eh-hero-dot"></span> AI 세금 분석</div>
  <h1 class="eh-hero-title">AI 세금 계산기</h1>
  <p class="eh-hero-sub">EEHO AI의 정밀 분석으로 단순 계산부터 복잡한 시나리오까지,<br>모든 절세 포인트를 찾아드립니다.</p>
</div>

<!-- OLD HEADER (완전 숨김 — JS 호환용) -->
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
        <button class="eh-type-card" data-type="gift">
          <span class="eh-type-check">✓</span>
          <div class="eh-type-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 24c-4 0-6-4-2-6s6 2 12 6c6-4 10-8 12-6s2 6-2 6"/><rect x="10" y="24" width="28" height="16" rx="2"/><path d="M24 24v16"/></svg></div>
          <span class="eh-type-name">상속·증여</span>
          <span class="eh-type-desc">재산을 무상으로 이전받을 때 발생하는 세금</span>
        </button>
      </div>
    </div>
  </div>
  <div class="eh-footer"><span class="eh-footer-info">예상 소요 시간: 3분 내외</span><button class="eh-btn-primary" id="toStep2">다음 →</button></div>
</div>

<!-- STEP 2 -->
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
      <!-- 부동산 유형 드롭다운 -->
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
      <!-- 기존 chip 숨김 (JS 호환용) -->
      <div class="eh-re-types" id="reTypes" style="display:none!important"></div>
      <div class="eh-extra-input eh-hd" id="stockNameWrap">
        <label class="eh-input-label">법인명</label>
        <input type="text" class="eh-text-input" id="inpStockName" placeholder="예: 삼성전자">
      </div>
      <div class="eh-amount-section">
        <span class="eh-field-label" id="amountLabel">양도가액</span>
        <div class="eh-amount-box">
          <div class="eh-amount-display"><input type="text" class="eh-amount-input" id="inpAmount" placeholder="0" inputmode="numeric" autocomplete="off"><span class="eh-amount-unit">원</span></div>
          <div class="eh-amount-kr" id="amountKr"></div>
        </div>
      </div>
    </div>
  </div>
  <div class="eh-footer"><button class="eh-btn-ghost" id="backStep1">← 이전</button><button class="eh-btn-primary" id="toStep3">다음 →</button></div>
</div>

<!-- STEP 3 -->
<div class="eh-step" data-step="3">
  <div class="eh-card eh-card-main">
    <div class="eh-progress-bar">
      <span class="eh-pg-step-label">Step 3 of 4</span>
      <span class="eh-pg-step-name">상세 조건</span>
    </div>
    <div class="eh-pg-track"><div class="eh-pg-fill" style="width:75%"></div></div>
    <div style="padding: 32px 36px 36px;">
      <h1 class="eh-title">상세 조건을 선택하세요</h1>

      <!-- 부동산 / 주식 공통: 날짜 -->
      <div class="eh-field" id="f3Dates">
        <div class="eh-date-row">
          <div class="eh-date-field"><label>취득일</label><input type="date" class="eh-date-input" id="inpAcqDate"></div>
          <div class="eh-date-field"><label>양도일</label><input type="date" class="eh-date-input" id="inpSaleDate"></div>
        </div>
      </div>

      <!-- 부동산 전용 -->
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

      <!-- ★ 주식 전용 필드 (assetType=stock 일 때만 표시) -->
      <!-- 상장/비상장 구분 -->
      <div class="eh-field eh-hd" id="f3StockListed">
        <span class="eh-field-label">상장 여부</span>
        <select class="eh-select-input" id="selStockListed">
          <option value="listed" selected>상장주식 (코스피/코스닥)</option>
          <option value="unlisted">비상장주식</option>
        </select>
      </div>
      <!-- 대주주 여부 (상장 선택 시 표시) -->
      <div class="eh-field eh-hd" id="f3StockMajor">
        <span class="eh-field-label">대주주 여부
          <button type="button" class="eh-help-btn" id="stockMajorHelpBtn" title="대주주 기준 보기">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.8"/><text x="10" y="14.5" text-anchor="middle" fill="currentColor" font-size="13" font-weight="700" font-family="sans-serif">?</text></svg>
          </button>
        </span>
        <select class="eh-select-input" id="selStockMajor">
          <option value="minor" selected>소액주주 (비과세)</option>
          <option value="major">대주주 (지분율 1% 이상 또는 시가총액 10억 이상)</option>
        </select>
        <div class="eh-help-popup eh-hd" id="stockMajorHelpPopup">
          <button type="button" class="eh-help-close" id="stockMajorHelpClose">&times;</button>
          <h4>대주주 기준 (2024년 기준)</h4>
          <p>코스피: 지분율 <strong>1% 이상</strong> 또는 시가총액 <strong>10억 원 이상</strong><br>
          코스닥: 지분율 <strong>2% 이상</strong> 또는 시가총액 <strong>10억 원 이상</strong></p>
          <p style="margin-top:8px;font-size:12px;color:#888;">직전 사업연도 종료일(12/31) 기준으로 판정합니다.</p>
        </div>
      </div>
      <!-- 중소기업 여부 (비상장 선택 시 표시) -->
      <div class="eh-field eh-hd" id="f3StockSme">
        <span class="eh-field-label">법인 규모</span>
        <select class="eh-select-input" id="selStockSme">
          <option value="sme" selected>중소기업</option>
          <option value="mid">중견기업</option>
          <option value="large">일반법인 (대기업)</option>
        </select>
      </div>

      <!-- 기존 chip 컨테이너 숨김 (JS 호환) -->
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

<!-- STEP 4 -->
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

<!-- AI 5a: 텍스트 입력 -->
<div class="eh-ai" id="aiTextPhase">
  <div class="eh-ai-header">
    <div class="eh-brand">세금 계산기 <span class="eh-brand-ai">with EEHO AI</span></div>
    <button class="eh-btn-ghost eh-btn-sm" id="aiBackToResult">← 결과로 돌아가기</button>
  </div>
  <div class="eh-card eh-card-main">
    <h1 class="eh-title">상황을 알려주세요</h1>
    <p class="eh-subtitle">자유롭게 입력하시면 EEHO AI가 절세 가능성을 분석합니다</p>
    <div class="eh-examples">
      <div class="eh-ex-label">✏️ 입력 예시</div>
      <div class="eh-ex-bubble">"올해 결혼을 하면서 2주택이 되었어요"</div>
      <div class="eh-ex-bubble">"부모님이 2주택자인데, 송파구 소재 아파트를 저가양수 하려고 해요."</div>
      <div class="eh-ex-bubble">"작년에 이사하려고 분당 아파트를 하나 더 샀어요. 기존 송파 아파트는 언제 팔아야 하나요?"</div>
    </div>
    <div class="eh-ta-wrap"><textarea class="eh-textarea" id="aiTextInput" placeholder="상황을 자유롭게 입력해주세요..." rows="4" maxlength="500"></textarea></div>
    <div class="eh-ta-bar"><span class="eh-ta-cnt"><span id="aiTxtCnt">0</span>/500</span><button class="eh-btn-primary" id="aiSendText">분석 요청 →</button></div>
  </div>
</div>

<!-- AI 5b: 대화형 추가질문 -->
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
    <div class="eh-ld-ring"><svg width="100" height="100" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="#EDE6E2" stroke-width="4"/><circle cx="60" cy="60" r="52" fill="none" stroke="#F95C32" stroke-width="4" stroke-dasharray="327" stroke-dashoffset="327" stroke-linecap="round" class="eh-ld-anim"/></svg><div class="eh-ld-icon"><svg width="28" height="28" viewBox="0 0 36 36" fill="none"><rect x="7" y="7" width="22" height="16" rx="4" stroke="#004447" stroke-width="1.5"/><circle cx="14" cy="15" r="2" fill="#004447"/><circle cx="22" cy="15" r="2" fill="#004447"/><path d="M13 28l5-4 5 4" stroke="#004447" stroke-width="1.5" stroke-linecap="round"/></svg></div></div>
    <h3 class="eh-ld-title">AI 분석 중<span class="eh-ld-dots"></span></h3>
    <p class="eh-ld-desc">제출하신 자료를 기반으로<br>관련 세법과 판례를 분석하고 있습니다</p>
    <p class="eh-ld-wait">잠시만 기다려주세요</p>
    <div class="eh-ld-meta"><span>📋 <span id="ehLdYear"></span>년 개정세법 반영</span><span>⏱ 약 10~15초</span></div>
  </div>
</div>

<!-- AI 6: 최종 결과 -->
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
  </div>
  <div class="eh-final-details">
    <div class="eh-card eh-card-breakdown"><h3>📋 상세 분석</h3><div id="finalDetails" class="eh-details-text"></div></div>
  </div>
  <div class="eh-card eh-card-risk"><h3>⚠ 리스크 안내</h3><div id="finalRisks" class="eh-risk-list"></div></div>
  <div class="eh-card eh-card-notice"><div class="eh-notice-icon">📋</div><div class="eh-notice-text"><strong>세무사 검토 안내</strong><p>위 분석은 AI가 세법 데이터를 기반으로 산출한 예상 결과이며, 실제 신고 시에는 반드시 세무 전문가의 검토가 필요합니다.</p></div></div>
  <div class="eh-final-actions">
    <a href="https://pf.kakao.com/_xjKxoG/chat" target="_blank" class="eh-btn-primary eh-btn-consult">세무 전문가 상담</a>
    <button class="eh-btn-outline" id="backToResult">← 결과로 돌아가기</button>
  </div>
</div>
</div>
