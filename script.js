const DATA_PATH = "data/neetcode150.json";
const MIN_DAYS_BEFORE_REPEAT = 30;

function getDayNumber(date = new Date()) {
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(midnight.getTime() / 86400000);
}

function seededIndex(day, attempt, totalProblems) {
  let value = Math.imul(day + 1, 2654435761) ^ Math.imul(attempt + 1, 1597334677);
  value = Math.imul(value ^ (value >>> 16), 2246822507);
  value = Math.imul(value ^ (value >>> 13), 3266489909);
  const normalized = (value ^ (value >>> 16)) >>> 0;
  return normalized % totalProblems;
}

function getPotdIndex(totalProblems) {
  const dayNumber = getDayNumber();
  const cooldown = Math.min(MIN_DAYS_BEFORE_REPEAT, totalProblems - 1);

  if (cooldown <= 0) return 0;

  const recent = [];
  const recentSet = new Set();
  let selectedIndex = 0;

  for (let day = 0; day <= dayNumber; day += 1) {
    let attempt = 0;
    let candidate = seededIndex(day, attempt, totalProblems);

    while (recentSet.has(candidate) && attempt < totalProblems * 2) {
      attempt += 1;
      candidate = seededIndex(day, attempt, totalProblems);
    }

    // Fallback path in case hashing attempts collide too much.
    if (recentSet.has(candidate)) {
      candidate = 0;
      while (recentSet.has(candidate)) {
        candidate = (candidate + 1) % totalProblems;
      }
    }

    selectedIndex = candidate;
    recent.push(candidate);
    recentSet.add(candidate);

    if (recent.length > cooldown) {
      const removed = recent.shift();
      recentSet.delete(removed);
    }
  }

  return selectedIndex;
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

function formatTodayDate(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function renderTodayDate() {
  const dateEl = document.getElementById("todayDate");
  if (dateEl) {
    dateEl.textContent = `Today: ${formatTodayDate()}`;
  }
}

function renderPotd(problem, index, total) {
  const container = document.getElementById("potd");
  container.innerHTML = `
    <h2 class="title">${problem.title}</h2>
    <div>
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
renderTodayDate();
setInterval(() => {
  const countdown = document.getElementById("nextRefresh");
  if (countdown) {
    countdown.textContent = `Next problem in about ${formatDuration(msUntilNextMidnight())}.`;
  }
}, 60000);
