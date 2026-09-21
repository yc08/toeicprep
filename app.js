const state = {
  questions: [],
  remaining: [],
  current: null,
  answered: 0,
  correct: 0,
  streak: 0,
  locked: false,
  name: "",
  wrong: [],
};

const profilePrefix = "toeic-quickfire-profile:";

const content = document.querySelector("#quiz-content");
const score = document.querySelector("#score");
const correct = document.querySelector("#correct");
const streak = document.querySelector("#streak");
const questionNumber = document.querySelector("#question-number");
const progressLabel = document.querySelector("#progress-label");
const progressBar = document.querySelector("#progress-bar");
const questionCount = document.querySelector("#question-count");
const wrongCount = document.querySelector("#wrong-count");
const profileName = document.querySelector("#profile-name");
const profileButton = document.querySelector("#profile-button");
const profileDialog = document.querySelector("#profile-dialog");
const nameInput = document.querySelector("#name-input");
const reviewPanel = document.querySelector("#review-panel");
const reviewList = document.querySelector("#review-list");

function profileKey(name = state.name) {
  return `${profilePrefix}${name.toLowerCase()}`;
}

function saveProfile() {
  if (!state.name) return;
  localStorage.setItem(profileKey(), JSON.stringify({
    name: state.name,
    answered: state.answered,
    correct: state.correct,
    wrong: state.wrong,
  }));
}

function loadProfile(name) {
  state.name = name.trim();
  const saved = JSON.parse(localStorage.getItem(profileKey()) || "null");
  state.answered = Number(saved?.answered) || 0;
  state.correct = Number(saved?.correct) || 0;
  state.wrong = Array.isArray(saved?.wrong) ? saved.wrong : [];
  profileName.textContent = state.name;
  profileButton.textContent = state.name;
  updateStats();
  renderReview();
  saveProfile();
}

function openProfileDialog() {
  profileDialog.hidden = false;
  nameInput.value = state.name;
  nameInput.focus();
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function normalizeQuestions(data) {
  return Object.entries(data)
    .map(([id, item]) => ({
      id,
      question: item.question,
      answer: String(item.anwser ?? item.answer ?? "").trim(),
      choices: [1, 2, 3, 4]
        .map((choiceId) => String(item[String(choiceId)] ?? "").trim())
        .filter(Boolean),
    }))
    .filter((item) => item.question && item.answer && item.choices.length === 4);
}

function updateStats() {
  const percentage = state.answered ? Math.round((state.correct / state.answered) * 100) : 0;
  score.textContent = `${percentage}%`;
  correct.textContent = `${state.correct} / ${state.answered}`;
  streak.textContent = state.streak;
  progressLabel.textContent = `${state.answered} answered`;
  progressBar.style.width = `${state.questions.length ? (state.answered / state.questions.length) * 100 : 0}%`;
  wrongCount.textContent = state.wrong.length;
}

function renderReview() {
  if (!state.wrong.length) {
    reviewList.innerHTML = `<p class="empty-state">No wrong answers yet. Keep practicing and they will appear here.</p>`;
    return;
  }
  reviewList.innerHTML = state.wrong.map((item) => `
    <article class="review-item">
      <span class="review-id">Q${item.id}</span>
      <div><strong>${item.question}</strong><span>Correct answer: ${item.answer}</span></div>
    </article>
  `).join("");
}

function renderQuestion() {
  if (!state.remaining.length) {
    state.remaining = shuffle(state.questions);
  }

  state.current = state.remaining.pop();
  state.locked = false;
  questionNumber.textContent = `QUESTION ${String(state.current.id).padStart(2, "0")}`;

  const choices = state.current.choices.map((choice, index) => `
    <button class="choice" type="button" data-choice="${choice}">
      <span class="choice-key">${String.fromCharCode(65 + index)}</span>
      <span class="choice-text">${choice}</span>
    </button>
  `).join("");

  content.innerHTML = `
    <p class="question-text">${state.current.question}</p>
    <div class="choices">${choices}</div>
  `;
  content.querySelectorAll(".choice").forEach((button) => {
    button.addEventListener("click", () => submitAnswer(button));
  });
}

function submitAnswer(button) {
  if (state.locked) return;
  state.locked = true;
  state.answered += 1;
  const selected = button.dataset.choice;
  const isCorrect = selected.toLowerCase() === state.current.answer.toLowerCase();
  if (isCorrect) {
    state.correct += 1;
    if (!state.wrong.some((item) => item.id === state.current.id)) {
      state.wrong.push({ id: state.current.id, question: state.current.question, answer: state.current.answer });
    }
    state.streak += 1;
  } else {
    state.streak = 0;
  }

  content.querySelectorAll(".choice").forEach((choice) => {
    choice.disabled = true;
    if (choice.dataset.choice.toLowerCase() === state.current.answer.toLowerCase()) choice.classList.add("correct");
  });
  if (!isCorrect) button.classList.add("incorrect");

  const feedback = document.createElement("div");
  feedback.className = "feedback";
  feedback.innerHTML = `
    <div class="feedback-copy">
      <strong>${isCorrect ? "Correct. Nice work." : "Not quite this time."}</strong>
      <span>${isCorrect ? "Keep the rhythm going." : `The answer is “${state.current.answer}”.`}</span>
    </div>
    <button class="next-button" type="button">Next question <span aria-hidden="true">→</span></button>
  `;
  content.append(feedback);
  feedback.querySelector(".next-button").addEventListener("click", renderQuestion);
  updateStats();
  saveProfile();
  renderReview();
}

function exportProgress() {
  const payload = { app: "TOEIC Quickfire", version: 1, exportedAt: new Date().toISOString(), profile: {
    name: state.name, answered: state.answered, correct: state.correct, wrong: state.wrong,
  }};
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "toeic"}-progress.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      const profile = imported.profile;
      if (!profile?.name || !Array.isArray(profile.wrong)) throw new Error("Invalid progress file");
      loadProfile(profile.name);
      state.answered = Number(profile.answered) || 0;
      state.correct = Number(profile.correct) || 0;
      state.wrong = profile.wrong;
      saveProfile();
      updateStats();
      renderReview();
      alert(`Progress imported for ${state.name}.`);
    } catch (error) {
      alert("That progress file could not be imported.");
    }
  };
  reader.readAsText(file);
}

async function loadQuestions() {
  try {
    const response = await fetch("./toeic_test.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.questions = normalizeQuestions(await response.json());
    if (!state.questions.length) throw new Error("No complete questions found");
    state.remaining = shuffle(state.questions);
    questionCount.textContent = `${state.questions.length.toLocaleString()} questions ready`;
    updateStats();
    renderQuestion();
  } catch (error) {
    questionCount.textContent = "Question bank unavailable";
    content.innerHTML = `<p class="error-state">Could not load the question bank. Open this app through a local server so the browser can read the JSON file.</p>`;
    console.error(error);
  }
}

document.querySelector("#reset-button").addEventListener("click", () => {
  state.remaining = shuffle(state.questions);
  state.answered = 0;
  state.correct = 0;
  state.streak = 0;
  state.wrong = [];
  updateStats();
  saveProfile();
  renderReview();
  renderQuestion();
});

document.querySelector("#profile-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;
  loadProfile(name);
  profileDialog.hidden = true;
});
profileButton.addEventListener("click", openProfileDialog);
document.querySelector("#review-button").addEventListener("click", () => {
  reviewPanel.hidden = false;
  reviewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});
document.querySelector("#close-review").addEventListener("click", () => { reviewPanel.hidden = true; });
document.querySelector("#export-button").addEventListener("click", exportProgress);
document.querySelector("#import-input").addEventListener("change", (event) => {
  if (event.target.files[0]) importProgress(event.target.files[0]);
  event.target.value = "";
});

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(console.error);

loadQuestions();
openProfileDialog();