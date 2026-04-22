const API_BASE = 'http://127.0.0.1:5000';
const API_URL = `${API_BASE}/analyze`;
const UPLOAD_URL = `${API_BASE}/upload`;
const HISTORY_URL = `${API_BASE}/history?limit=8`;
const HEALTH_URL = `${API_BASE}/health`;
const GENERATE_NEW_QUIZ_URL = `${API_BASE}/generate-quiz`;

let extractedText = '';
let uploadedFileName = '';
let currentQuiz = [];

const elements = {
  fileInput: document.getElementById('fileInput'),
  browseBtn: document.getElementById('browseBtn'),
  dropzone: document.getElementById('dropzone'),
  fileMeta: document.getElementById('fileMeta'),
  courseText: document.getElementById('courseText'),
  difficulty: document.getElementById('difficulty'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  clearBtn: document.getElementById('clearBtn'),
  progressBlock: document.getElementById('progressBlock'),
  progressFill: document.getElementById('progressFill'),
  progressText: document.getElementById('progressText'),
  progressPercent: document.getElementById('progressPercent'),
  summarySection: document.getElementById('summarySection'),
  summaryCards: document.getElementById('summaryCards'),
  languageBadge: document.getElementById('languageBadge'),
  quizSection: document.getElementById('quizSection'),
  quizContainer: document.getElementById('quizContainer'),
  checkAnswersBtn: document.getElementById('checkAnswersBtn'),
  retryQuizBtn: document.getElementById('retryQuizBtn'),
  newQuizBtn: document.getElementById('newQuizBtn'),
  quizResult: document.getElementById('quizResult'),
  reviewBlock: document.getElementById('reviewBlock'),
  quizProgressBadge: document.getElementById('quizProgressBadge'),
  flashcardsSection: document.getElementById('flashcardsSection'),
  flashcardsContainer: document.getElementById('flashcardsContainer'),
  qualityBox: document.getElementById('qualityBox'),
  historyContainer: document.getElementById('historyContainer'),
  refreshHistoryBtn: document.getElementById('refreshHistoryBtn'),
  apiStatusDot: document.getElementById('apiStatusDot'),
  apiStatusText: document.getElementById('apiStatusText')
};

function setProgress(step, percent) {
  elements.progressBlock.classList.remove('hidden');
  elements.progressText.textContent = step;
  elements.progressFill.style.width = `${percent}%`;
  if (elements.progressPercent) elements.progressPercent.textContent = `${percent}%`;
}

function hideProgress() {
  elements.progressBlock.classList.add('hidden');
  elements.progressFill.style.width = '0%';
  if (elements.progressPercent) elements.progressPercent.textContent = '0%';
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showFileMeta(meta) {
  elements.fileMeta.classList.remove('hidden');
  elements.fileMeta.innerHTML = `
    <strong>${escapeHtml(meta.filename)}</strong>
    <span class="badge">${escapeHtml(meta.file_type.toUpperCase())}</span>
    <span class="badge">${(meta.file_size / 1024).toFixed(1)} KB</span>
    <span class="badge">${meta.extracted_chars.toLocaleString()} chars</span>
  `;
}

function resetUI() {
  elements.summarySection.classList.add('hidden');
  elements.quizSection.classList.add('hidden');
  elements.flashcardsSection.classList.add('hidden');
  elements.quizResult.classList.add('hidden');
  elements.reviewBlock.classList.add('hidden');
  elements.summaryCards.innerHTML = '';
  elements.quizContainer.innerHTML = '';
  elements.flashcardsContainer.innerHTML = '';
  elements.qualityBox.className = 'quality-box empty-state';
  elements.qualityBox.innerHTML = '<div class="empty-icon">◎</div><p>Run an analysis to see quality metrics.</p>';
  currentQuiz = [];
}

async function checkBackendStatus() {
  try {
    const res = await fetch(HEALTH_URL);
    if (!res.ok) throw new Error();
    elements.apiStatusDot.classList.add('ok');
    elements.apiStatusText.textContent = 'Backend connected';
  } catch {
    elements.apiStatusDot.classList.add('error');
    elements.apiStatusText.textContent = 'Backend unreachable';
  }
}

async function handleSelectedFile(file) {
  if (!file) return;
  const lower = file.name.toLowerCase();
  if (!lower.endsWith('.pdf') && !lower.endsWith('.txt')) {
    alert('Unsupported format. Choose a .pdf or .txt file.');
    return;
  }
  uploadedFileName = file.name;
  setProgress('Uploading file...', 20);
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await fetch(UPLOAD_URL, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    extractedText = data.text || '';
    elements.courseText.value = extractedText;
    showFileMeta(data);
    if (data.warning) alert(data.warning);
    setProgress('File ready.', 100);
    setTimeout(hideProgress, 500);
  } catch (error) {
    hideProgress();
    alert(`Upload error: ${error.message}`);
  }
}

async function analyzeText() {
  const typedText = elements.courseText.value.trim();
  const text = typedText || extractedText;
  const difficulty = elements.difficulty.value;
  if (!text) { alert('Paste a lesson or import a file first.'); return; }
  resetUI();
  elements.analyzeBtn.disabled = true;
  try {
    setProgress('Preparing analysis...', 15);
    const payload = { text, difficulty, source_name: uploadedFileName || 'Manual input' };
    setProgress('Generating summary and quiz...', 55);
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Analysis failed');
    setProgress('Rendering results...', 85);
    renderSummary(data.summary || []);
    renderQuiz(data.quiz || []);
    renderFlashcards(data.flashcards || []);
    renderQuality(data.quality || {}, data.meta || {}, data.language || 'fr');
    setProgress('Done!', 100);
    await fetchHistory();
    setTimeout(hideProgress, 700);
  } catch (error) {
    hideProgress();
    alert(`Analysis error: ${error.message}`);
  } finally {
    elements.analyzeBtn.disabled = false;
  }
}

async function generateNewQuiz() {
  const text = elements.courseText.value.trim() || extractedText;
  const difficulty = elements.difficulty.value;
  if (!text) { alert('No text found. Paste a lesson or upload a file first.'); return; }
  elements.newQuizBtn.disabled = true;
  elements.checkAnswersBtn.disabled = true;
  elements.retryQuizBtn.disabled = true;
  try {
    setProgress('Generating a new quiz...', 60);
    const res = await fetch(GENERATE_NEW_QUIZ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, difficulty })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'New quiz generation failed');
    renderQuiz(data.quiz || []);
    elements.quizResult.classList.add('hidden');
    elements.reviewBlock.classList.add('hidden');
    elements.reviewBlock.innerHTML = '';
    setProgress('New quiz ready!', 100);
    setTimeout(hideProgress, 500);
  } catch (error) {
    hideProgress();
    alert(`New quiz error: ${error.message}`);
  } finally {
    elements.newQuizBtn.disabled = false;
    elements.checkAnswersBtn.disabled = false;
    elements.retryQuizBtn.disabled = false;
  }
}

function renderSummary(points) {
  elements.summaryCards.innerHTML = points.map((point, i) => `
    <article class="summary-card" style="animation-delay:${i * 0.05}s">
      <span class="summary-index">${String(i + 1).padStart(2, '0')}</span>
      <p>${escapeHtml(point)}</p>
    </article>
  `).join('');
  elements.summarySection.classList.remove('hidden');
}

function renderQuiz(questions) {
  currentQuiz = questions;
  elements.quizProgressBadge.textContent = `${questions.length} questions`;
  elements.quizContainer.innerHTML = questions.map((q, i) => `
    <div class="question-card" data-correct="${q.correct}" style="animation-delay:${i * 0.06}s">
      <div class="question-head">
        <span class="badge">Q${i + 1}</span>
      </div>
      <p class="question-text">${escapeHtml(q.question)}</p>
      <div class="options-list">
        ${q.options.map((opt, j) => `
          <button type="button" class="option-btn" data-index="${j}" data-question="${i}">
            <span class="opt-letter">${String.fromCharCode(65 + j)}</span> ${escapeHtml(opt)}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');
  elements.quizContainer.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => selectOption(btn));
  });
  elements.quizSection.classList.remove('hidden');
}

function selectOption(button) {
  const card = button.closest('.question-card');
  card.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
  button.classList.add('selected');
}

function renderFlashcards(cards) {
  elements.flashcardsContainer.innerHTML = cards.map((card, i) => `
    <article class="flashcard" style="animation-delay:${i * 0.05}s">
      <h3>${escapeHtml(card.question)}</h3>
      <p>${escapeHtml(card.answer)}</p>
    </article>
  `).join('');
  elements.flashcardsSection.classList.remove('hidden');
}

function renderQuality(quality, meta, language) {
  elements.languageBadge.textContent = String(language).toUpperCase();
  const conf = quality.confidence || 'medium';
  elements.qualityBox.className = 'quality-box';
  elements.qualityBox.innerHTML = `
    <p><strong>Confidence</strong> <span class="quality-pill ${conf}">${escapeHtml(conf)}</span></p>
    <p><strong>Notes</strong> ${escapeHtml(quality.notes || 'No note')}</p>
    <p><strong>Difficulty</strong> ${escapeHtml(meta.difficulty || 'medium')}</p>
    <p><strong>Input</strong> ${Number(meta.input_chars || 0).toLocaleString()} characters</p>
  `;
}

function checkAnswers() {
  const questionCards = document.querySelectorAll('.question-card');
  let score = 0;
  const reviewItems = [];
  questionCards.forEach((card, idx) => {
    const correct = Number(card.dataset.correct);
    const selected = card.querySelector('.option-btn.selected');
    const buttons = card.querySelectorAll('.option-btn');
    buttons.forEach(btn => btn.disabled = true);
    if (!selected) {
      reviewItems.push(`<div class="review-item"><strong>Q${idx + 1}:</strong> no answer selected.<br><em>Correct answer:</em> ${escapeHtml(currentQuiz[idx].options[correct])}<br><em>Explanation:</em> ${escapeHtml(currentQuiz[idx].explanation)}</div>`);
      buttons[correct]?.classList.add('correct');
      return;
    }
    const chosen = Number(selected.dataset.index);
    if (chosen === correct) {
      score++;
      selected.classList.add('correct');
    } else {
      selected.classList.add('wrong');
      buttons[correct]?.classList.add('correct');
      reviewItems.push(`<div class="review-item"><strong>Q${idx + 1}:</strong> wrong answer.<br><em>Correct answer:</em> ${escapeHtml(currentQuiz[idx].options[correct])}<br><em>Explanation:</em> ${escapeHtml(currentQuiz[idx].explanation)}</div>`);
    }
  });
  elements.quizResult.classList.remove('hidden');
  const pct = Math.round((score / questionCards.length) * 100);
  elements.quizResult.innerHTML = `Score: <strong>${score}/${questionCards.length}</strong> — ${pct}%`;
  if (reviewItems.length > 0) {
    elements.reviewBlock.classList.remove('hidden');
    elements.reviewBlock.innerHTML = `<h3>Points to review</h3>${reviewItems.join('')}`;
  } else {
    elements.reviewBlock.classList.add('hidden');
    elements.reviewBlock.innerHTML = '';
  }
}

function retryQuiz() {
  renderQuiz(currentQuiz);
  elements.quizResult.classList.add('hidden');
  elements.reviewBlock.classList.add('hidden');
  elements.reviewBlock.innerHTML = '';
}

async function fetchHistory() {
  try {
    const res = await fetch(HISTORY_URL);
    const data = await res.json();
    const items = data.items || [];
    if (!items.length) {
      elements.historyContainer.className = 'history-list empty-state';
      elements.historyContainer.innerHTML = '<div class="empty-icon">○</div><p>No history yet.</p>';
      return;
    }
    elements.historyContainer.className = 'history-list';
    elements.historyContainer.innerHTML = items.map(item => `
      <article class="history-item">
        <div class="history-head">
          <strong>${escapeHtml(item.source_name)}</strong>
          <span class="badge">${escapeHtml(item.difficulty)}</span>
        </div>
        <p class="muted">${escapeHtml(item.created_at)} · ${Number(item.extracted_chars).toLocaleString()} chars</p>
        <ul>${(item.summary || []).map(pt => `<li>${escapeHtml(pt)}</li>`).join('')}</ul>
      </article>
    `).join('');
  } catch {
    elements.historyContainer.className = 'history-list empty-state';
    elements.historyContainer.innerHTML = '<div class="empty-icon">!</div><p>Unable to load history.</p>';
  }
}

function clearAll() {
  extractedText = '';
  uploadedFileName = '';
  elements.courseText.value = '';
  elements.fileInput.value = '';
  elements.fileMeta.classList.add('hidden');
  elements.fileMeta.innerHTML = '';
  resetUI();
  hideProgress();
}

function initDropzone() {
  elements.browseBtn.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', e => handleSelectedFile(e.target.files[0]));
  ['dragenter', 'dragover'].forEach(ev => {
    elements.dropzone.addEventListener(ev, e => { e.preventDefault(); elements.dropzone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(ev => {
    elements.dropzone.addEventListener(ev, e => { e.preventDefault(); elements.dropzone.classList.remove('dragover'); });
  });
  elements.dropzone.addEventListener('drop', e => handleSelectedFile(e.dataTransfer.files?.[0]));
}

elements.analyzeBtn.addEventListener('click', analyzeText);
elements.checkAnswersBtn.addEventListener('click', checkAnswers);
elements.retryQuizBtn.addEventListener('click', retryQuiz);
elements.newQuizBtn.addEventListener('click', generateNewQuiz);
elements.clearBtn.addEventListener('click', clearAll);
elements.refreshHistoryBtn.addEventListener('click', fetchHistory);

initDropzone();
checkBackendStatus();
fetchHistory();