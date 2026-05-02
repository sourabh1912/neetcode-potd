const DATA_PATH = "data/neetcode150.json";

function getDayNumber(date = new Date()) {
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(midnight.getTime() / 86400000);
}

function getPotdIndex(totalProblems) {
  return getDayNumber() % totalProblems;
}

function msUntilNextMidnight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function renderPotd(problem, index, total) {
  const container = document.getElementById("potd");
  container.innerHTML = `
    <h2 class="title">${problem.title}</h2>
    <div>
      <span class="pill">#${index + 1} of ${total}</span>
      <span class="pill">${problem.topic}</span>
      <span class="pill">${problem.difficulty}</span>
    </div>
    <p><a href="${problem.neetcodeUrl}" target="_blank" rel="noopener noreferrer">Open on NeetCode</a></p>
    <p><a href="${problem.leetcodeUrl}" target="_blank" rel="noopener noreferrer">Open on LeetCode</a></p>
  `;

  const countdown = document.getElementById("nextRefresh");
  countdown.textContent = `Next problem in about ${formatDuration(msUntilNextMidnight())}.`;
}

async function loadPotd() {
  try {
    const response = await fetch(DATA_PATH);
    if (!response.ok) throw new Error("Failed to load NeetCode list.");

    const problems = await response.json();
    if (!Array.isArray(problems) || problems.length === 0) {
      throw new Error("Problem list is empty.");
    }

    const index = getPotdIndex(problems.length);
    renderPotd(problems[index], index, problems.length);
  } catch (error) {
    const container = document.getElementById("potd");
    container.innerHTML = `<p>${error.message}</p>`;
  }
}

loadPotd();
setInterval(() => {
  const countdown = document.getElementById("nextRefresh");
  if (countdown) {
    countdown.textContent = `Next problem in about ${formatDuration(msUntilNextMidnight())}.`;
  }
}, 60000);
