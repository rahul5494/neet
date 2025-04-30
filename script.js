const apiKey = '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';
const model = "accounts/fireworks/models/qwen2p5-72b-instruct";
let currentQuestions = [];

let loadingInterval = null;
const loadingMessages = [
  "Please Wait...",
  "This takes some time...",
  "Filtering Questions..."
];
let loadingIndex = 0;

function startLoadingMessages() {
  const loadingText = document.getElementById('loadingText');
  loadingText.textContent = loadingMessages[loadingIndex];
  loadingInterval = setInterval(() => {
    loadingIndex = (loadingIndex + 1) % loadingMessages.length;
    loadingText.textContent = loadingMessages[loadingIndex];
  }, 1500);
}

function stopLoadingMessages() {
  clearInterval(loadingInterval);
  loadingIndex = 0;
  document.getElementById('loadingText').textContent = '';
}

async function startTest() {
  const subject = document.getElementById('subject').value;
  const count = parseInt(document.getElementById('questionCount').value);
  if (!subject || !count) return alert("Please select both subject and number of questions.");

  document.getElementById('loading').style.display = 'flex';
  startLoadingMessages();
  document.getElementById('quizContainer').innerHTML = '';
  document.getElementById('submitBtn').style.display = 'none';

  const prompt = `Generate ${count} NEET-level multiple-choice questions in ${subject}. Each question must have 4 options labeled A-D and end with "Answer: <A/B/C/D>". Format:
Q1. <question>
A. <option>
B. <option>
C. <option>
D. <option>
Answer: <A/B/C/D>`;

  const response = await fetch('https://router.huggingface.co/fireworks-ai/inference/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const result = await response.json();
  const output = result?.choices?.[0]?.message?.content || "";
  parseQuestions(output);
  displayQuestions();
  stopLoadingMessages();
  document.getElementById('loading').style.display = 'none';
  document.getElementById('submitBtn').style.display = 'inline-block';
}

function parseQuestions(text) {
  const lines = text.split('\n').filter(l => l.trim() !== '');
  currentQuestions = [];
  let q = null;

  for (const line of lines) {
    if (line.match(/^Q\d+\./)) {
      if (q) currentQuestions.push(q);
      q = { question: line.split('.').slice(1).join('.').trim(), options: [], answer: -1 };
    } else if (/^[ABCD]\./.test(line)) {
      q?.options?.push(line.slice(2).trim());
    } else if (line.startsWith('Answer:')) {
      const ans = line.split('Answer:')[1].trim().toUpperCase();
      q.answer = ['A', 'B', 'C', 'D'].indexOf(ans);
    }
  }
  if (q) currentQuestions.push(q);
}

function displayQuestions() {
  const container = document.getElementById('quizContainer');
  container.innerHTML = '';

  currentQuestions.forEach((q, idx) => {
    const div = document.createElement('div');
    div.className = 'question';
    div.innerHTML = `<strong>Q${idx + 1}. ${q.question}</strong><div class="options">` +
      q.options.map((opt, i) =>
        `<label><input type="radio" name="q${idx}" value="${i}"> ${opt}</label>`
      ).join('') +
      `</div><div id="feedback${idx}"></div>`;
    container.appendChild(div);
  });

  if (window.MathJax) MathJax.typeset();
}

function submitTest() {
  let score = 0;
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  currentQuestions.forEach((q, idx) => {
    const selected = document.querySelector(`input[name="q${idx}"]:checked`);
    const feedback = document.getElementById(`feedback${idx}`);
    feedback.style.marginTop = '10px';

    if (!selected) {
      unanswered++;
      feedback.innerHTML = `<strong>🔲 Unanswered</strong><br>Correct: ${['A', 'B', 'C', 'D'][q.answer]}. ${q.options[q.answer]}`;
      feedback.style.color = '#a0a0a0';
    } else if (parseInt(selected.value) === q.answer) {
      score += 4;
      correct++;
      feedback.innerHTML = `✅ Correct!<br>Correct: ${['A', 'B', 'C', 'D'][q.answer]}. ${q.options[q.answer]}`;
      feedback.style.color = '#28a745';
    } else {
      score -= 1;
      wrong++;
      feedback.innerHTML = `❌ Wrong<br>Correct: ${['A', 'B', 'C', 'D'][q.answer]}. ${q.options[q.answer]}`;
      feedback.style.color = '#dc3545';
    }
  });

  document.getElementById('resultText').textContent =
    `You scored ${score} marks. ✅ Correct: ${correct}, ❌ Wrong: ${wrong}, 🔲 Unanswered: ${unanswered}`;
  document.getElementById('resultModal').style.display = 'flex';

  document.querySelectorAll('input[type="radio"]').forEach(input => input.disabled = true);
  if (window.MathJax) MathJax.typeset();
}

function closeResultModal() {
  document.getElementById('resultModal').style.display = 'none';
  document.querySelectorAll('input[type="radio"]').forEach(input => input.disabled = false);
}
