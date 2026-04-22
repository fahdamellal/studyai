// URL du backend Flask
const API_URL = 'http://127.0.0.1:5000/analyze';
const UPLOAD_URL = 'http://127.0.0.1:5000/upload';

// Stocke le texte extrait depuis un fichier
let extractedText = '';


// ─── Fonction principale : envoie le texte au backend ───
async function analyzeText() {
  const textareaText = document.getElementById('courseText').value.trim();
  const text = textareaText || extractedText;

  if (!text) {
    alert('Colle un texte ou charge un fichier d\'abord !');
    return;
  }

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

    if (!res.ok) {
      throw new Error(data.error || 'Erreur backend');
    }

    displaySummary(data.summary || []);
    displayQuiz(data.quiz || []);
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
  const list = document.getElementById('summaryList');

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
  const section = document.getElementById('quizSection');
  const container = document.getElementById('quizContainer');

  container.innerHTML = '';

  questions.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'question';
    div.dataset.correct = q.correct;

    div.innerHTML = `<p><strong>Q${i + 1}. ${q.question}</strong></p>`;

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


// ─── Sélection d'une option ───
function selectOption(btn, questionDiv) {
  questionDiv.querySelectorAll('.option-btn').forEach(b => {
    b.classList.remove('selected', 'correct', 'wrong');
    b.style.fontWeight = 'normal';
  });

  btn.classList.add('selected');
  btn.style.fontWeight = 'bold';
}


// ─── Valide les réponses ───
function checkAnswers() {
  document.querySelectorAll('.question').forEach(q => {
    const correct = parseInt(q.dataset.correct, 10);
    const selected = q.querySelector('.selected');

    if (!selected) return;

    const chosen = parseInt(selected.dataset.index, 10);

    selected.classList.add(chosen === correct ? 'correct' : 'wrong');

    if (chosen !== correct) {
      const correctBtn = q.querySelectorAll('.option-btn')[correct];
      if (correctBtn) correctBtn.classList.add('correct');
    }
  });
}


// ─── Lecture fichier .txt ou extraction PDF via backend ───
async function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const btn = document.getElementById('analyzeBtn');

  if (file.name.toLowerCase().endsWith('.txt')) {
    const reader = new FileReader();
    reader.onload = e => {
      extractedText = e.target.result || '';
      document.getElementById('courseText').value = extractedText;
    };
    reader.readAsText(file);

  } else if (file.name.toLowerCase().endsWith('.pdf')) {
    btn.textContent = '⏳ Extraction PDF...';
    btn.disabled = true;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur extraction PDF');
      }

      if (data.text) {
        extractedText = data.text;
        document.getElementById('courseText').value = extractedText;
      } else {
        alert('Erreur extraction PDF : aucune donnée reçue');
      }
    } catch (err) {
      alert('Erreur connexion backend : ' + err.message);
    } finally {
      btn.textContent = '✨ Analyser avec l\'IA';
      btn.disabled = false;
    }

  } else {
    alert('Format non supporté. Choisis un fichier .txt ou .pdf');
  }
}