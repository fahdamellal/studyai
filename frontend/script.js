// URL du backend Flask (à adapter si le port change)
const API_URL = 'http://localhost:5000/analyze';


// ─── Fonction principale : envoie le texte au backend ───
async function analyzeText() {
  const text = document.getElementById('courseText').value.trim();
  if (!text) { alert('Colle un texte d\'abord !'); return; }


  const btn = document.getElementById('analyzeBtn');
  btn.textContent = '⏳ Analyse en cours...';
  btn.disabled = true;


  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    displaySummary(data.summary);
    displayQuiz(data.quiz);
  } catch (err) {
    alert('Erreur : ' + err.message);
  } finally {
    btn.textContent = '✨ Analyser avec l\'IA';
    btn.disabled = false;
  }
}


// ─── Affiche le résumé ───
function displaySummary(points) {
  const section = document.getElementById('summarySection');
  const list    = document.getElementById('summaryList');
  list.innerHTML = '';
  points.forEach(p => {
    const li = document.createElement('li');
    li.textContent = p;
    list.appendChild(li);
  });
  section.style.display = 'block';
}


// ─── Construit le quiz ───
function displayQuiz(questions) {
  const section    = document.getElementById('quizSection');
  const container  = document.getElementById('quizContainer');
  container.innerHTML = '';


  questions.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'question';
    div.dataset.correct = q.correct;   // stocke la bonne réponse
    div.innerHTML = `<p><strong>Q${i+1}. ${q.question}</strong></p>`;


    q.options.forEach((opt, j) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.dataset.index = j;
      btn.onclick = () => selectOption(btn, div);
      div.appendChild(btn);
    });
    container.appendChild(div);
  });
  section.style.display = 'block';
}


// ─── Sélection d'une option (une seule à la fois) ───
function selectOption(btn, questionDiv) {
  questionDiv.querySelectorAll('.option-btn').forEach(b => {
    b.classList.remove('selected');
    b.style.fontWeight = 'normal';
  });
  btn.classList.add('selected');
  btn.style.fontWeight = 'bold';
}


// ─── Valide les réponses et colorie vert/rouge ───
function checkAnswers() {
  document.querySelectorAll('.question').forEach(q => {
    const correct  = parseInt(q.dataset.correct);
    const selected = q.querySelector('.selected');
    if (!selected) return;
    const chosen = parseInt(selected.dataset.index);
    selected.classList.add(chosen === correct ? 'correct' : 'wrong');
    // Afficher la bonne réponse si mauvaise
    if (chosen !== correct) {
      q.querySelectorAll('.option-btn')[correct].classList.add('correct');
    }
  });
}


// ─── BONUS : lecture fichier .txt ───
function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => document.getElementById('courseText').value = e.target.result;
  reader.readAsText(file);
}
