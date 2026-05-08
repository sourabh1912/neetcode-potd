const STORAGE_KEY = "neetcode_potd_state_v1";

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function emptyState() {
  return {
    completed: {},
    important: {},
    revisions: {},
    cache: {},
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

function formatShortDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function renderLists(state) {
  const revisionEl = document.getElementById("revisionList");
  const importantEl = document.getElementById("importantList");
  const completedEl = document.getElementById("completedList");

  if (!revisionEl || !importantEl || !completedEl) return;

  const revisionItems = Object.entries(state.revisions)
    .map(([id, meta]) => ({ id, ...meta }))
    .sort((a, b) => new Date(a.dueAtIso).getTime() - new Date(b.dueAtIso).getTime());

  const importantItems = Object.keys(state.important)
    .map((id) => ({ id, markedAtIso: state.important[id] }))
    .sort((a, b) => new Date(b.markedAtIso).getTime() - new Date(a.markedAtIso).getTime());

  const completedItems = Object.keys(state.completed)
    .map((id) => ({ id, completedAtIso: state.completed[id] }))
    .sort((a, b) => new Date(b.completedAtIso).getTime() - new Date(a.completedAtIso).getTime());

  function itemHtml(id, extraRight, actionsHtml) {
    const p = state.cache[id];
    if (!p) return "";

    const difficulty = p.difficulty ? `<span class="pill">${p.difficulty}</span>` : "";
    const links = `
      <div class="itemLinks">
        <a href="${p.neetcodeUrl}" target="_blank" rel="noopener noreferrer">NeetCode</a>
        <a href="${p.leetcodeUrl}" target="_blank" rel="noopener noreferrer">LeetCode</a>
      </div>
    `;

    return `
      <div class="listItem">
        <div class="listItemTop">
          <p class="listItemTitle">${p.title}</p>
          <span class="due">${extraRight}</span>
        </div>
        ${difficulty}
        ${links}
        <div class="itemActions">
          ${actionsHtml}
        </div>
      </div>
    `;
  }

  revisionEl.innerHTML =
    revisionItems.length === 0
      ? `<p class="empty">No revisions scheduled yet.</p>`
      : revisionItems
          .map((x) => {
            const due = x.dueAtIso ? formatShortDate(new Date(x.dueAtIso)) : "";
            return itemHtml(
              x.id,
              due ? `Due: ${due}` : "",
              `<button class="btn btnDanger" data-action="remove-revision" data-id="${x.id}">Remove</button>`
            );
          })
          .join("");

  importantEl.innerHTML =
    importantItems.length === 0
      ? `<p class="empty">No important problems yet.</p>`
      : importantItems
          .map((x) =>
            itemHtml(
              x.id,
              "",
              `<button class="btn btnDanger" data-action="remove-important" data-id="${x.id}">Remove</button>`
            )
          )
          .join("");

  completedEl.innerHTML =
    completedItems.length === 0
      ? `<p class="empty">Nothing completed yet.</p>`
      : completedItems
          .map((x) => {
            const doneOn = x.completedAtIso ? formatShortDate(new Date(x.completedAtIso)) : "";
            return itemHtml(
              x.id,
              doneOn ? `Done: ${doneOn}` : "",
              `<button class="btn btnDanger" data-action="remove-completed" data-id="${x.id}">Remove</button>`
            );
          })
          .join("");
}

function wireActions() {
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    const action = target.getAttribute("data-action");
    const id = target.getAttribute("data-id");
    if (!action || !id) return;

    const next = loadState();
    if (action === "remove-revision") delete next.revisions[id];
    if (action === "remove-important") delete next.important[id];
    if (action === "remove-completed") delete next.completed[id];
    saveState(next);
    renderLists(next);
  });
}

wireActions();
renderLists(loadState());
