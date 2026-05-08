const DATA_PATH = "data/neetcode150.json";
const MIN_DAYS_BEFORE_REPEAT = 30;
const STORAGE_KEY = "neetcode_potd_state_v1";

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

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
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

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function emptyState() {
  return {
    completed: {}, // { [id]: completedAtIso }
    important: {}, // { [id]: markedAtIso }
    revisions: {}, // { [id]: { dueAtIso, createdAtIso } }
    cache: {}, // { [id]: { title, difficulty, neetcodeUrl, leetcodeUrl } }
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? safeJsonParse(raw, emptyState()) : emptyState();
  const state = { ...emptyState(), ...parsed };
  state.completed = state.completed ?? {};
  state.important = state.important ?? {};
  state.revisions = state.revisions ?? {};
  state.cache = state.cache ?? {};
  return state;
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function problemId(problem) {
  return problem.leetcodeUrl || problem.neetcodeUrl || problem.title;
}

function cacheProblem(state, problem) {
  const id = problemId(problem);
  state.cache[id] = {
    title: problem.title,
    difficulty: problem.difficulty,
    neetcodeUrl: problem.neetcodeUrl,
    leetcodeUrl: problem.leetcodeUrl,
  };
  return id;
}

let globalMenuCloseHandlerRegistered = false;

function renderPotd(problem, index, total) {
  const state = loadState();
  const id = cacheProblem(state, problem);
  saveState(state);

  const container = document.getElementById("potd");

  const isDone = Boolean(state.completed[id]);
  const isImportant = Boolean(state.important[id]);
  const hasRevision = Boolean(state.revisions[id]);

  const counts = {
    completed: Object.keys(state.completed).length,
    important: Object.keys(state.important).length,
    revisions: Object.keys(state.revisions).length,
  };

  const statusBits = [
    isDone ? `<span class="pill">Done</span>` : "",
    isImportant ? `<span class="pill">Important</span>` : "",
    hasRevision ? `<span class="pill">Revision scheduled</span>` : "",
  ].filter(Boolean);

  container.innerHTML = `
    <h2 class="title">${problem.title}</h2>
    <div>
      <span class="pill">${problem.difficulty}</span>
    </div>
    ${statusBits.length ? `<div style="margin-top: 6px;">${statusBits.join("")}</div>` : ""}
    <p><a href="${problem.neetcodeUrl}" target="_blank" rel="noopener noreferrer">Open on NeetCode</a></p>
    <p><a href="${problem.leetcodeUrl}" target="_blank" rel="noopener noreferrer">Open on LeetCode</a></p>
    <div class="actions">
      <button id="btnDone" class="btn btnPrimary">${isDone ? "Done ✓" : "Done"} (${counts.completed})</button>
      <div class="menu">
        <button id="btnRevise" class="btn">${hasRevision ? "Revise ✓" : "Revise"} (${counts.revisions})</button>
        <div id="reviseMenu" class="menuPanel" role="menu" aria-label="Revision options">
          <p class="menuTitle">Add to revision list</p>
          <div class="menuBtns">
            <button class="btn" data-revise-days="14">2 weeks</button>
            <button class="btn" data-revise-days="30">1 month</button>
            <button class="btn" data-revise-days="60">2 months</button>
          </div>
        </div>
      </div>
      <button id="btnImportant" class="btn">${isImportant ? "Important ✓" : "Important"} (${counts.important})</button>
    </div>
  `;

  const reviseMenu = document.getElementById("reviseMenu");
  const btnRevise = document.getElementById("btnRevise");
  const btnDone = document.getElementById("btnDone");
  const btnImportant = document.getElementById("btnImportant");

  function closeMenu() {
    if (reviseMenu) reviseMenu.classList.remove("open");
  }

  if (btnRevise && reviseMenu) {
    btnRevise.addEventListener("click", () => {
      reviseMenu.classList.toggle("open");
    });
  }

  if (!globalMenuCloseHandlerRegistered) {
    globalMenuCloseHandlerRegistered = true;
    document.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      const menu = document.getElementById("reviseMenu");
      const btn = document.getElementById("btnRevise");
      if (!menu || !btn) return;
      const clickedInside = btn.contains(target) || menu.contains(target);
      if (!clickedInside) menu.classList.remove("open");
    });
  }

  if (reviseMenu) {
    reviseMenu.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const daysRaw = target.getAttribute("data-revise-days");
      if (!daysRaw) return;

      const days = Number(daysRaw);
      const next = loadState();
      cacheProblem(next, problem);
      next.revisions[id] = {
        createdAtIso: new Date().toISOString(),
        dueAtIso: addDays(new Date(), days).toISOString(),
      };
      saveState(next);
      closeMenu();
      renderPotd(problem, index, total);
    });
  }

  if (btnDone) {
    btnDone.addEventListener("click", () => {
      const next = loadState();
      cacheProblem(next, problem);
      if (next.completed[id]) {
        delete next.completed[id];
      } else {
        next.completed[id] = new Date().toISOString();
      }
      saveState(next);
      renderPotd(problem, index, total);
    });
  }

  if (btnImportant) {
    btnImportant.addEventListener("click", () => {
      const next = loadState();
      cacheProblem(next, problem);
      if (next.important[id]) {
        delete next.important[id];
      } else {
        next.important[id] = new Date().toISOString();
      }
      saveState(next);
      renderPotd(problem, index, total);
    });
  }

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
