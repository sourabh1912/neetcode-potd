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
    later: {},
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
  state.later = state.later ?? {};
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

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function closeAllReviseMenus() {
  document.querySelectorAll("[data-revise-menu].open").forEach((el) => el.classList.remove("open"));
}

function renderLists(state) {
  const laterEl = document.getElementById("laterList");
  const revisionEl = document.getElementById("revisionList");
  const importantEl = document.getElementById("importantList");
  const completedEl = document.getElementById("completedList");

  if (!laterEl || !revisionEl || !importantEl || !completedEl) return;

  const laterItems = Object.entries(state.later)
    .map(([id, meta]) => ({ id, ...meta }))
    .sort((a, b) => new Date(a.dueAtIso).getTime() - new Date(b.dueAtIso).getTime());

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

  laterEl.innerHTML =
    laterItems.length === 0
      ? `<p class="empty">No “Later” problems yet.</p>`
      : laterItems
          .map((x) => {
            const due = x.dueAtIso ? formatShortDate(new Date(x.dueAtIso)) : "";
            const added = x.createdAtIso ? formatShortDate(new Date(x.createdAtIso)) : "";
            const right = [added ? `Added: ${added}` : "", due ? `Due: ${due}` : ""].filter(Boolean).join(" • ");
            const hasRevision = Boolean(state.revisions[x.id]);
            const reviseLabel = hasRevision ? "Revise ✓" : "Revise";
            return itemHtml(
              x.id,
              right,
              `<button class="btn btnDanger" data-action="remove-later" data-id="${x.id}">Remove</button>
               <div class="menu">
                 <button class="btn" data-action="toggle-revise-menu" data-id="${x.id}">${reviseLabel}</button>
                 <div class="menuPanel" data-revise-menu="${x.id}" role="menu" aria-label="Revision options">
                   <p class="menuTitle">Add to revision list</p>
                   <div class="menuBtns">
                     <button class="btn" data-action="revise-later" data-id="${x.id}" data-revise-days="14">2 weeks</button>
                     <button class="btn" data-action="revise-later" data-id="${x.id}" data-revise-days="30">1 month</button>
                     <button class="btn" data-action="revise-later" data-id="${x.id}" data-revise-days="60">2 months</button>
                   </div>
                 </div>
               </div>`
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

    if (action === "toggle-revise-menu" && id) {
      const menu = document.querySelector(`[data-revise-menu="${CSS.escape(id)}"]`);
      if (!menu) return;
      const wasOpen = menu.classList.contains("open");
      closeAllReviseMenus();
      if (!wasOpen) menu.classList.add("open");
      return;
    }

    const daysRaw = target.getAttribute("data-revise-days");
    if (action === "revise-later" && id && daysRaw) {
      const days = Number(daysRaw);
      const next = loadState();
      const now = new Date();
      next.revisions[id] = {
        createdAtIso: now.toISOString(),
        dueAtIso: addDays(now, days).toISOString(),
      };
      delete next.later[id];
      saveState(next);
      closeAllReviseMenus();
      renderLists(next);
      return;
    }

    if (action && id) {
      const next = loadState();
      if (action === "remove-later") delete next.later[id];
      if (action === "remove-revision") delete next.revisions[id];
      if (action === "remove-important") delete next.important[id];
      if (action === "remove-completed") delete next.completed[id];
      saveState(next);
      renderLists(next);
      return;
    }

    if (!target.closest(".menu")) closeAllReviseMenus();
  });
}

wireActions();
renderLists(loadState());
