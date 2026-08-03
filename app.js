/* Boost Vocabulary - IELTS Cambridge 20
   Vanilla JS single-page app: Flashcards + Exercises over VOCAB_DATA (data.js) */

const app = document.getElementById('app');

const PASSAGES = VOCAB_DATA.map(p => ({ test: p.test, passage: p.passage, key: p.test + '-' + p.passage, vocab: p.vocab }));

function passageLabel(test, passage) {
  return 'Test ' + test + ' - Bài ' + passage;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[.,!?;:'"()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Flatten selected scope (array of "test-passage" keys) into a list of vocab entries,
// each tagged with its source passage for display/review purposes.
function flattenScope(scopeKeys) {
  const keySet = new Set(scopeKeys);
  const out = [];
  PASSAGES.forEach(p => {
    if (!keySet.has(p.key)) return;
    p.vocab.forEach(v => out.push({ ...v, _test: p.test, _passage: p.passage }));
  });
  return out;
}

const ALL_KEYS = PASSAGES.map(p => p.key);

// ---------------------------------------------------------------------------
// Global state
// ---------------------------------------------------------------------------
const state = {
  screen: 'home',
  flashSetup: { scope: new Set(ALL_KEYS), shuffle: true },
  flash: null,
  exSetup: { scope: new Set(ALL_KEYS), type: 'mcq', count: 20 },
  exercise: null,
};

function render() {
  switch (state.screen) {
    case 'home': return renderHome();
    case 'flash-setup': return renderFlashSetup();
    case 'flash-view': return renderFlashView();
    case 'ex-setup': return renderExSetup();
    case 'ex-run': return renderExRun();
    case 'ex-result': return renderExResult();
  }
}

function goHome() { state.screen = 'home'; render(); }

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------
function renderHome() {
  const totalWords = PASSAGES.reduce((n, p) => n + p.vocab.length, 0);
  app.innerHTML = `
    <div class="topbar">
      <div class="brand">📗 Boost Vocabulary</div>
    </div>
    <div class="subtitle">IELTS Cambridge 20 &middot; ${totalWords} từ vựng &middot; 12 bài đọc</div>
    <div class="home-grid">
      <button class="mode-btn" onclick="openFlashSetup()">
        <span class="icon">🃏</span>
        <span class="title">Ôn tập Flashcard</span>
        <span class="desc">Mặt trước: từ &amp; phiên âm. Mặt sau: từ đồng nghĩa &amp; trái nghĩa.</span>
      </button>
      <button class="mode-btn" onclick="openExSetup()">
        <span class="icon">✏️</span>
        <span class="title">Luyện tập</span>
        <span class="desc">Trắc nghiệm hoặc điền từ, có chấm điểm và xem lại câu sai.</span>
      </button>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Scope selector (shared between Flashcard & Exercise setup)
// ---------------------------------------------------------------------------
function scopeGridHtml(selectedSet, toggleFnName) {
  const chips = PASSAGES.map(p => {
    const checked = selectedSet.has(p.key);
    return `<div class="scope-chip ${checked ? 'checked' : ''}" onclick="${toggleFnName}('${p.key}')">
      <input type="checkbox" ${checked ? 'checked' : ''} onclick="event.stopPropagation(); ${toggleFnName}('${p.key}')">
      <span>${passageLabel(p.test, p.passage)}</span>
    </div>`;
  }).join('');
  return `
    <div class="scope-toolbar">
      <button class="btn secondary" onclick="${toggleFnName}('__all__')">Chọn tất cả</button>
      <button class="btn secondary" onclick="${toggleFnName}('__none__')">Bỏ chọn</button>
    </div>
    <div class="scope-grid">${chips}</div>
  `;
}

function toggleScope(setupObj, key) {
  if (key === '__all__') { setupObj.scope = new Set(ALL_KEYS); return; }
  if (key === '__none__') { setupObj.scope = new Set(); return; }
  if (setupObj.scope.has(key)) setupObj.scope.delete(key);
  else setupObj.scope.add(key);
}

window.toggleFlashScope = function (key) {
  toggleScope(state.flashSetup, key);
  renderFlashSetup();
};
window.toggleExScope = function (key) {
  toggleScope(state.exSetup, key);
  renderExSetup();
};

// ---------------------------------------------------------------------------
// Flashcard setup
// ---------------------------------------------------------------------------
function openFlashSetup() { state.screen = 'flash-setup'; render(); }
window.openFlashSetup = openFlashSetup;

function renderFlashSetup() {
  const pool = flattenScope([...state.flashSetup.scope]);
  app.innerHTML = `
    <button class="back-link" onclick="goHome()">← Trang chủ</button>
    <h2>🃏 Ôn tập Flashcard</h2>
    <div class="subtitle">Chọn phạm vi từ vựng muốn ôn tập</div>
    <div class="card">
      <div class="section-title">Phạm vi (${pool.length} từ đã chọn)</div>
      ${scopeGridHtml(state.flashSetup.scope, 'toggleFlashScope')}

      <div class="section-title">Thứ tự</div>
      <div class="radio-row">
        <div class="radio-chip ${state.flashSetup.shuffle ? 'checked' : ''}" onclick="setFlashShuffle(true)">
          <span class="t">🔀 Ngẫu nhiên</span>
          <span class="d">Xáo trộn thứ tự thẻ</span>
        </div>
        <div class="radio-chip ${!state.flashSetup.shuffle ? 'checked' : ''}" onclick="setFlashShuffle(false)">
          <span class="t">📖 Tuần tự</span>
          <span class="d">Theo đúng thứ tự trong sách</span>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn" ${pool.length === 0 ? 'disabled' : ''} onclick="startFlash()">Bắt đầu (${pool.length} thẻ)</button>
      </div>
    </div>
  `;
}

window.setFlashShuffle = function (v) { state.flashSetup.shuffle = v; renderFlashSetup(); };

window.startFlash = function () {
  let pool = flattenScope([...state.flashSetup.scope]);
  if (state.flashSetup.shuffle) pool = shuffle(pool);
  if (pool.length === 0) return;
  state.flash = { cards: pool, index: 0, flipped: false };
  state.screen = 'flash-view';
  render();
};

// ---------------------------------------------------------------------------
// Flashcard view
// ---------------------------------------------------------------------------
function renderFlashView() {
  const f = state.flash;
  const card = f.cards[f.index];
  const pct = Math.round(((f.index) / f.cards.length) * 100);

  const synList = card.s.length
    ? card.s.map(s => `<li>${escapeHtml(s)}</li>`).join('')
    : '<li>(không có)</li>';
  const antoBlock = card.a.length
    ? `<div class="def-block">
         <div class="def-label anto">Trái nghĩa</div>
         <ul class="def-list">${card.a.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
       </div>`
    : '';

  app.innerHTML = `
    <button class="back-link" onclick="goHome()">← Trang chủ</button>
    <div class="progress-wrap">
      <span>Thẻ ${f.index + 1} / ${f.cards.length}</span>
      <span>${passageLabel(card._test, card._passage)}</span>
    </div>
    <div class="progress-bar"><div style="width:${pct}%"></div></div>

    <div class="flash-scene">
      <div class="flash-card ${f.flipped ? 'flipped' : ''}" onclick="flipFlash()">
        <div class="flash-face front">
          <div class="flash-word">${escapeHtml(card.w)}</div>
          ${card.ipa ? `<div class="flash-ipa">/${escapeHtml(card.ipa)}/</div>` : ''}
          <div class="flash-hint">chạm để lật</div>
        </div>
        <div class="flash-face back">
          <div class="def-block">
            <div class="def-label">Đồng nghĩa</div>
            <ul class="def-list">${synList}</ul>
          </div>
          ${antoBlock}
          ${card.n ? `<div class="flash-note">${escapeHtml(card.n)}</div>` : ''}
        </div>
      </div>
    </div>

    <div class="flash-controls">
      <button class="icon-btn" ${f.index === 0 ? 'disabled' : ''} onclick="prevFlash()">◀</button>
      <button class="btn secondary" onclick="flipFlash()">🔄 Lật thẻ</button>
      <button class="icon-btn" onclick="nextFlash()">▶</button>
    </div>
    <div class="btn-row">
      <button class="btn ghost" onclick="openFlashSetup()">⚙️ Đổi phạm vi</button>
    </div>
  `;
}

window.flipFlash = function () { state.flash.flipped = !state.flash.flipped; renderFlashView(); };
window.prevFlash = function () {
  const f = state.flash;
  if (f.index > 0) { f.index--; f.flipped = false; renderFlashView(); }
};
window.nextFlash = function () {
  const f = state.flash;
  f.flipped = false;
  if (f.index < f.cards.length - 1) { f.index++; }
  else { f.index = 0; }
  renderFlashView();
};

// ---------------------------------------------------------------------------
// Exercise setup
// ---------------------------------------------------------------------------
function openExSetup() { state.screen = 'ex-setup'; render(); }
window.openExSetup = openExSetup;

function eligiblePool(scopeKeys) {
  // Only entries with at least one synonym can be used for either exercise type.
  return flattenScope(scopeKeys).filter(v => v.s && v.s.length > 0);
}

function renderExSetup() {
  const pool = eligiblePool([...state.exSetup.scope]);
  const maxCount = pool.length;
  if (state.exSetup.count > maxCount) state.exSetup.count = maxCount;
  if (state.exSetup.count < 1 && maxCount > 0) state.exSetup.count = Math.min(20, maxCount);

  app.innerHTML = `
    <button class="back-link" onclick="goHome()">← Trang chủ</button>
    <h2>✏️ Luyện tập</h2>
    <div class="subtitle">Chọn phạm vi, dạng bài và số câu</div>
    <div class="card">
      <div class="section-title">Phạm vi (${pool.length} từ khả dụng)</div>
      ${scopeGridHtml(state.exSetup.scope, 'toggleExScope')}

      <div class="section-title">Dạng bài</div>
      <div class="radio-row">
        <div class="radio-chip ${state.exSetup.type === 'mcq' ? 'checked' : ''}" onclick="setExType('mcq')">
          <span class="t">🔘 Trắc nghiệm</span>
          <span class="d">Chọn 1 trong 4 đáp án</span>
        </div>
        <div class="radio-chip ${state.exSetup.type === 'fill' ? 'checked' : ''}" onclick="setExType('fill')">
          <span class="t">⌨️ Điền từ</span>
          <span class="d">Gõ từ đồng nghĩa / trái nghĩa</span>
        </div>
        <div class="radio-chip ${state.exSetup.type === 'mixed' ? 'checked' : ''}" onclick="setExType('mixed')">
          <span class="t">🔀 Hỗn hợp</span>
          <span class="d">Trộn cả hai dạng</span>
        </div>
      </div>

      <div class="field-row">
        <label for="qcount">Số câu hỏi (tối đa ${maxCount})</label>
        <input type="number" id="qcount" min="1" max="${maxCount}" value="${state.exSetup.count}"
          oninput="setExCount(this.value, ${maxCount})">
        <div class="field-hint">Mỗi câu lấy ngẫu nhiên 1 từ trong phạm vi đã chọn, không lặp lại.</div>
      </div>

      <div class="btn-row">
        <button class="btn" ${maxCount === 0 ? 'disabled' : ''} onclick="startExercise()">Bắt đầu làm bài</button>
      </div>
    </div>
  `;
}

window.setExType = function (t) { state.exSetup.type = t; renderExSetup(); };
window.setExCount = function (v, max) {
  let n = parseInt(v, 10);
  if (isNaN(n)) n = 1;
  n = Math.max(1, Math.min(n, max));
  state.exSetup.count = n;
};

function buildDistractors(entry, pool) {
  // Prefer distractors from the same scope; fall back to the whole dataset if scope is too small.
  let candidates = pool.filter(v => v !== entry && v.s && v.s.length > 0);
  if (candidates.length < 3) {
    candidates = PASSAGES.flatMap(p => p.vocab).filter(v => v.w !== entry.w && v.s && v.s.length > 0);
  }
  const shuffled = shuffle(candidates);
  const picked = [];
  const usedTexts = new Set([normalize(entry.s[0])]);
  for (const c of shuffled) {
    if (picked.length >= 3) break;
    const text = c.s[Math.floor(Math.random() * c.s.length)];
    const norm = normalize(text);
    if (usedTexts.has(norm)) continue;
    usedTexts.add(norm);
    picked.push(text);
  }
  return picked;
}

window.startExercise = function () {
  const pool = eligiblePool([...state.exSetup.scope]);
  if (pool.length === 0) return;
  const count = Math.min(state.exSetup.count, pool.length);
  const picks = shuffle(pool).slice(0, count);

  const questions = picks.map(entry => {
    let type = state.exSetup.type;
    if (type === 'mixed') type = Math.random() < 0.5 ? 'mcq' : 'fill';
    if (type === 'mcq') {
      const correctText = entry.s[0];
      const distractors = buildDistractors(entry, pool);
      const options = shuffle([correctText, ...distractors]);
      return { type: 'mcq', entry, options, correctText };
    }
    return { type: 'fill', entry };
  });

  state.exercise = {
    questions,
    index: 0,
    answers: [],   // { question, correct, userSynonym, userAntonym, chosen }
    answered: false,
  };
  state.screen = 'ex-run';
  render();
};

// ---------------------------------------------------------------------------
// Exercise run
// ---------------------------------------------------------------------------
function renderExRun() {
  const ex = state.exercise;
  const q = ex.questions[ex.index];
  const pct = Math.round((ex.index / ex.questions.length) * 100);
  const okCount = ex.answers.filter(a => a.correct).length;
  const badCount = ex.answers.length - okCount;

  let bodyHtml;
  if (q.type === 'mcq') bodyHtml = mcqHtml(q, ex.answered);
  else bodyHtml = fillHtml(q, ex.answered);

  app.innerHTML = `
    <button class="back-link" onclick="confirmQuitExercise()">← Thoát bài tập</button>
    <div class="progress-wrap">
      <span>Câu ${ex.index + 1} / ${ex.questions.length}</span>
      <span class="tally"><span class="ok">✓ ${okCount}</span><span class="bad">✗ ${badCount}</span></span>
    </div>
    <div class="progress-bar"><div style="width:${pct}%"></div></div>
    <div class="card">
      <span class="q-tag">${q.type === 'mcq' ? 'Trắc nghiệm' : 'Điền từ'} &middot; ${passageLabel(q.entry._test, q.entry._passage)}</span>
      <div class="q-word">${escapeHtml(q.entry.w)}</div>
      ${q.entry.ipa ? `<div class="q-ipa">/${escapeHtml(q.entry.ipa)}/</div>` : ''}
      ${bodyHtml}
    </div>
  `;
}

window.confirmQuitExercise = function () {
  if (confirm('Thoát bài tập đang làm dở? Kết quả sẽ không được lưu.')) {
    state.exercise = null;
    goHome();
  }
};

function mcqHtml(q, answered) {
  const chosen = answered ? state.exercise.answers[state.exercise.answers.length - 1] : null;
  const optionsHtml = q.options.map((opt, i) => {
    let cls = '';
    if (answered) {
      if (opt === q.correctText) cls = 'correct';
      else if (chosen && chosen.chosen === opt) cls = 'wrong';
    }
    return `<button class="option-btn ${cls}" ${answered ? 'disabled' : ''} onclick="answerMcq(${i})">${escapeHtml(opt)}</button>`;
  }).join('');

  let feedback = '';
  if (answered) {
    const ok = chosen.correct;
    feedback = `<div class="feedback ${ok ? 'ok' : 'bad'}">
      ${ok ? '✓ Chính xác!' : '✗ Chưa đúng.'}
      ${!ok ? `<span class="sub">Đáp án đúng: ${escapeHtml(q.correctText)}</span>` : ''}
    </div>
    <div class="btn-row"><button class="btn" onclick="nextQuestion()">Tiếp tục →</button></div>`;
  }
  return `<div class="options">${optionsHtml}</div>${feedback}`;
}

window.answerMcq = function (i) {
  const ex = state.exercise;
  if (ex.answered) return;
  const q = ex.questions[ex.index];
  const chosen = q.options[i];
  const correct = chosen === q.correctText;
  ex.answers.push({ question: q, correct, chosen });
  ex.answered = true;
  renderExRun();
};

function fillHtml(q, answered) {
  const entry = q.entry;
  const hasAnto = entry.a && entry.a.length > 0;
  if (!answered) {
    return `
      <div class="field-row">
        <label>Nhập 1 từ đồng nghĩa (bắt buộc)</label>
        <input type="text" id="fillSyn" placeholder="Gõ đáp án..." autocomplete="off"
          onkeydown="if(event.key==='Enter') submitFill(${hasAnto})">
      </div>
      ${hasAnto ? `
      <div class="field-row">
        <label>Nhập 1 từ trái nghĩa (không bắt buộc)</label>
        <input type="text" id="fillAnto" placeholder="Gõ đáp án... (có thể bỏ trống)" autocomplete="off"
          onkeydown="if(event.key==='Enter') submitFill(${hasAnto})">
      </div>` : ''}
      <div class="btn-row"><button class="btn" onclick="submitFill(${hasAnto})">Kiểm tra</button></div>
    `;
  }

  const last = state.exercise.answers[state.exercise.answers.length - 1];
  const ok = last.correct;
  const antoNote = hasAnto
    ? `<span class="sub">Trái nghĩa gợi ý: ${entry.a.map(escapeHtml).join(', ')}${last.userAntonym ? ' — bạn nhập: "' + escapeHtml(last.userAntonym) + '"' : ''}</span>`
    : '';
  return `
    <div class="field-row">
      <label>Từ đồng nghĩa của bạn</label>
      <input type="text" value="${escapeHtml(last.userSynonym)}" disabled>
    </div>
    <div class="feedback ${ok ? 'ok' : 'bad'}">
      ${ok ? '✓ Chính xác!' : '✗ Chưa đúng.'}
      <span class="sub">Đáp án chấp nhận: ${entry.s.map(escapeHtml).join(', ')}</span>
      ${antoNote}
    </div>
    <div class="btn-row"><button class="btn" onclick="nextQuestion()">Tiếp tục →</button></div>
  `;
}

window.submitFill = function (hasAnto) {
  const ex = state.exercise;
  if (ex.answered) return;
  const q = ex.questions[ex.index];
  const entry = q.entry;
  const synInput = document.getElementById('fillSyn');
  const antoInput = hasAnto ? document.getElementById('fillAnto') : null;
  const userSynonym = synInput ? synInput.value : '';
  const userAntonym = antoInput ? antoInput.value : '';

  const correct = entry.s.some(s => normalize(s) === normalize(userSynonym)) && normalize(userSynonym) !== '';

  ex.answers.push({ question: q, correct, userSynonym, userAntonym });
  ex.answered = true;
  renderExRun();
};

window.nextQuestion = function () {
  const ex = state.exercise;
  ex.answered = false;
  if (ex.index < ex.questions.length - 1) {
    ex.index++;
    renderExRun();
  } else {
    state.screen = 'ex-result';
    render();
  }
};

// ---------------------------------------------------------------------------
// Exercise result
// ---------------------------------------------------------------------------
function renderExResult() {
  const ex = state.exercise;
  const total = ex.answers.length;
  const okCount = ex.answers.filter(a => a.correct).length;
  const badCount = total - okCount;
  const pct = total ? Math.round((okCount / total) * 100) : 0;
  const wrongs = ex.answers.filter(a => !a.correct);

  const reviewHtml = wrongs.length
    ? wrongs.map(a => {
        const e = a.question.entry;
        const yourAnswer = a.question.type === 'mcq' ? (a.chosen || '(chưa chọn)') : (a.userSynonym || '(bỏ trống)');
        const correctAnswer = a.question.type === 'mcq' ? a.question.correctText : e.s.join(', ');
        return `<div class="review-item">
          <div class="rw-word">${escapeHtml(e.w)}${e.ipa ? ` <span style="color:var(--text-dim);font-weight:400;font-style:italic;">/${escapeHtml(e.ipa)}/</span>` : ''}</div>
          <div class="rw-line wrong-answer">Bạn trả lời: <b>${escapeHtml(yourAnswer)}</b></div>
          <div class="rw-line correct-answer">Đáp án đúng: <b>${escapeHtml(correctAnswer)}</b></div>
        </div>`;
      }).join('')
    : `<div class="empty-state">🎉 Không có câu nào sai!</div>`;

  app.innerHTML = `
    <button class="back-link" onclick="goHome()">← Trang chủ</button>
    <div class="card result-hero">
      <div class="result-score">${okCount}/${total}</div>
      <div class="result-sub">Bạn trả lời đúng ${pct}% &middot; <span class="tally"><span class="ok">✓ ${okCount} đúng</span> &nbsp; <span class="bad">✗ ${badCount} sai</span></span></div>
      <div class="btn-row" style="justify-content:center">
        <button class="btn" onclick="retryExercise()">🔁 Làm lại bộ câu này</button>
        <button class="btn secondary" onclick="openExSetup()">⚙️ Tạo bài mới</button>
      </div>
    </div>
    ${wrongs.length ? '<div class="section-title">Xem lại câu sai (' + wrongs.length + ')</div>' : ''}
    ${reviewHtml}
  `;
}

window.retryExercise = function () {
  const ex = state.exercise;
  const questions = ex.questions.map(q => {
    if (q.type === 'mcq') return { type: 'mcq', entry: q.entry, options: shuffle(q.options), correctText: q.correctText };
    return { type: 'fill', entry: q.entry };
  });
  state.exercise = { questions: shuffle(questions), index: 0, answers: [], answered: false };
  state.screen = 'ex-run';
  render();
};

// ---------------------------------------------------------------------------
render();
