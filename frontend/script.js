const API_URL = 'http://localhost:5000/analyze';
let extractedText = '';

async function analyzeText() {
  const textareaText = document.getElementById('courseText').value.trim();
  const text = textareaText || extractedText;

  if (!text) {
    alert("Colle un texte ou charge un fichier d'abord !");
    return;
  }

  const btn = document.getElementById('analyzeBtn');
  const loadingBox = document.getElementById('loadingBox');
  const statusChip = document.getElementById('statusChip');

  btn.disabled = true;
  btn.textContent = "⏳ Analyse...";
  loadingBox.style.display = 'flex';
  statusChip.textContent = 'Analyse en cours';

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Erreur serveur");
    }

    displaySummary(data.summary || []);
    displayQuiz(data.quiz || []);
    statusChip.textContent = 'Analyse terminée';
  } catch (err) {
    console.error(err);
    alert('Erreur : ' + err.message);
    statusChip.textContent = 'Erreur';
  } finally {
    btn.disabled = false;
    btn.textContent = "✨ Analyser avec l’IA";
    loadingBox.style.display = 'none';
  }
}

function displaySummary(points) {
  const section = document.getElementById('summarySection');
  const list = document.getElementById('summaryList');

  list.innerHTML = '';

  points.forEach(point => {
    const li = document.createElement('li');
    li.textContent = point;
    list.appendChild(li);
  });

  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function displayQuiz(questions) {
  const section = document.getElementById('quizSection');
  const container = document.getElementById('quizContainer');

  container.innerHTML = '';

  questions.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'question';
    div.dataset.correct = q.correct;

    const title = document.createElement('p');
    title.innerHTML = `<strong>Q${i + 1}. ${q.question}</strong>`;
    div.appendChild(title);

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

function selectOption(btn, questionDiv) {
  questionDiv.querySelectorAll('.option-btn').forEach(b => {
    b.classList.remove('selected');
  });

  btn.classList.add('selected');
}

function checkAnswers() {
  document.querySelectorAll('.question').forEach(question => {
    const correctIndex = parseInt(question.dataset.correct, 10);
    const selected = question.querySelector('.selected');

    question.querySelectorAll('.option-btn').forEach(btn => {
      btn.classList.remove('correct', 'wrong');
    });

    if (!selected) return;

    const chosenIndex = parseInt(selected.dataset.index, 10);

    if (chosenIndex === correctIndex) {
      selected.classList.add('correct');
    } else {
      selected.classList.add('wrong');
      const correctBtn = question.querySelectorAll('.option-btn')[correctIndex];
      if (correctBtn) {
        correctBtn.classList.add('correct');
      }
    }
  });
}

async function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const btn = document.getElementById('analyzeBtn');
  const statusChip = document.getElementById('statusChip');

  if (file.name.endsWith('.txt')) {
    const reader = new FileReader();
    reader.onload = e => {
      extractedText = e.target.result;
      document.getElementById('courseText').value = extractedText;
      statusChip.textContent = 'Fichier TXT chargé';
    };
    reader.readAsText(file);
  } else if (file.name.endsWith('.pdf')) {
    btn.textContent = '⏳ Extraction PDF...';
    btn.disabled = true;
    statusChip.textContent = 'Extraction PDF';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.text) {
        extractedText = data.text;
        document.getElementById('courseText').value = extractedText;
        statusChip.textContent = 'PDF chargé';
      } else {
        alert('Erreur extraction PDF : ' + data.error);
        statusChip.textContent = 'Erreur PDF';
      }
    } catch (err) {
      alert('Erreur connexion backend : ' + err.message);
      statusChip.textContent = 'Erreur PDF';
    } finally {
      btn.textContent = "✨ Analyser avec l’IA";
      btn.disabled = false;
    }
  } else {
    alert('Format non supporté');
  }
}