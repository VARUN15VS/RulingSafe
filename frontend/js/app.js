/* =========================================================
   GLOBAL APP STATE
   ========================================================= */

const appState = {
  basePathSet: false,
  userExists: false,
  hasRulings: false
};

let activeCaseKey = null;
let editingCaseKey = null;

/* =========================================================
   TABLE HELPERS
   ========================================================= */

function clearTable() {
  const tbody = document.getElementById("ruling-table-body");
  if (tbody) tbody.innerHTML = "";
}

function populateTable(cases = []) {
  clearTable();
  // cache cases for edit operations
  // Only set master cache ONCE
  if (!window._allCases) {
    window._allCases = cases;
  }
  window._cachedCases = cases;

  if (!cases.length) {
    appState.hasRulings = false;
    return;
  }

  const tbody = document.getElementById("ruling-table-body");

  cases.forEach(c => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${c.case_no || "-"}</td>
      <td>${c.case_name}</td>
      <td>${c.year}</td>
      <td>${c.court || "-"}</td>
      <td>${c.description || "-"}</td>
      <td>${new Date(c.last_updated).toLocaleDateString()}</td>

      <td>
        <button class="doc-btn" data-key="${c.key}" style="background: #111827">📁</button>
      </td>

      <td>
        <span class="action link-btn" data-key="${c.key}">
          🔗 
        </span>
      </td>
      <td class="actions">
  <button class="icon-btn edit-btn" data-key="${c.key}" title="Edit" style="background: #111827">
    ✏️
  </button>
  <button class="icon-btn delete-btn" data-key="${c.key}" title="Delete" style="background: #111827">
    🗑️
  </button>
</td>
    `;

    tbody.appendChild(row);
  });

  appState.hasRulings = true;
}

/* =========================================================
   EDIT & DELETE BUTTON LINKING (EVENT DELEGATION)
   ========================================================= */

document.addEventListener("click", async (e) => {

  if (e.target.classList.contains("edit-btn")) {
    editCase(e.target.dataset.key);
    return;
  }

  if (e.target.classList.contains("delete-btn")) {
    const caseKey = e.target.dataset.key;

    if (!confirm("Are you sure you want to delete this case?")) return;

    const res = await window.pywebview.api.delete_case({ key: caseKey });

    if (res.status !== "ok") {
      alert(res.message || "Failed to delete case");
      return;
    }

    const casesRes = await window.pywebview.api.get_cases();
    populateTable(casesRes.cases || []);
    renderApp();
  }
});

/* =========================================================
   EDIT CASE FUNCTION (ALREADY YOURS)
   ========================================================= */

function editCase(caseKey) {
  const cases = window._cachedCases || [];
  const c = cases.find(x => x.key === caseKey);

  if (!c) {
    console.error("Case not found:", caseKey);
    return;
  }

  editingCaseKey = caseKey;

  document.getElementById("case-no").value = c.case_no || "";
  document.getElementById("case-name").value = c.case_name;
  document.getElementById("case-year").value = c.year;
  document.getElementById("court").value = c.court || "";
  document.getElementById("description").value = c.description || "";

  document.getElementById("add-ruling-modal").classList.remove("hidden");
}
/* =========================================================
   SCREEN RENDER CONTROLLER
   ========================================================= */

function renderApp() {
  document.getElementById("select-location-screen")?.classList.add("hidden");
  document.getElementById("first-time-screen")?.classList.add("hidden");
  document.getElementById("empty-workspace")?.classList.add("hidden");
  document.getElementById("dashboard")?.classList.add("hidden");

  if (!appState.basePathSet) {
    document.getElementById("select-location-screen")?.classList.remove("hidden");
    return;
  }

  if (!appState.userExists) {
    document.getElementById("first-time-screen")?.classList.remove("hidden");
    return;
  }

  if (!appState.hasRulings) {
    document.getElementById("empty-workspace")?.classList.remove("hidden");
    return;
  }

  document.getElementById("dashboard")?.classList.remove("hidden");
}

/* =========================================================
   INITIAL LOAD (PYWEBVIEW)
   ========================================================= */

window.addEventListener("pywebviewready", async () => {
  try {
    appState.basePathSet = await window.pywebview.api.has_base_path();
    appState.userExists = await window.pywebview.api.has_user();

    if (appState.userExists) {
      const res = await window.pywebview.api.get_cases();
      populateTable(res.cases || []);
    }
  } catch (err) {
    console.error("Startup sync failed:", err);
  }

  renderApp();
});

/* =========================================================
   STORAGE LOCATION
   ========================================================= */

document.getElementById("select-location-btn")?.addEventListener("click", async () => {
  const res = await window.pywebview.api.pick_storage_location();
  if (res.status === "ok") {
    appState.basePathSet = true;
    renderApp();
  }
});

/* =========================================================
   CREATE USER
   ========================================================= */

document.getElementById("create-user-btn")?.addEventListener("click", () => {
  document.getElementById("create-user-modal")?.classList.remove("hidden");
});

document.getElementById("cancel-user")?.addEventListener("click", () => {
  document.getElementById("create-user-modal")?.classList.add("hidden");
});

document.getElementById("save-user")?.addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  if (!username) return alert("Username required");

  const res = await window.pywebview.api.create_user({
    username,
    first_name: document.getElementById("first-name").value.trim(),
    middle_name: document.getElementById("middle-name").value.trim(),
    last_name: document.getElementById("last-name").value.trim()
  });

  if (res.status === "ok") {
    appState.userExists = true;
    document.getElementById("create-user-modal").classList.add("hidden");
    renderApp();
  }
});

/* =========================================================
   ADD RULING
   ========================================================= */

const addRulingModal = document.getElementById("add-ruling-modal");

function openAddRulingModal() {
  resetCaseForm();
  addRulingModal.classList.remove("hidden");
}

document.getElementById("add-first-ruling")?.addEventListener("click", openAddRulingModal);
document.getElementById("add-new-ruling")?.addEventListener("click", openAddRulingModal);

document.getElementById("cancel-ruling")?.addEventListener("click", () => {
  addRulingModal.classList.add("hidden");
});

document.getElementById("save-ruling")?.addEventListener("click", async () => {
  const data = {
    case_no: document.getElementById("case-no").value.trim(),
    case_name: document.getElementById("case-name").value.trim(),
    year: document.getElementById("case-year").value.trim(),
    court: document.getElementById("court").value,
    description: document.getElementById("description").value.trim()
  };

  if (!data.case_name || !data.year) {
    return alert("Case Name and Year required");
  }

  const res = await window.pywebview.api.create_case(data);
  if (res.status === "ok") {
    const casesRes = await window.pywebview.api.get_cases();
    populateTable(casesRes.cases || []);
    addRulingModal.classList.add("hidden");
    renderApp();
  }
});

/* =========================================================
   DOCUMENT MENU (📁)
   ========================================================= */

document.addEventListener("click", e => {
  if (e.target.classList.contains("doc-btn")) {
    activeCaseKey = e.target.dataset.key;

    const menu = document.getElementById("doc-menu");
    menu.style.top = e.pageY + "px";
    menu.style.left = e.pageX + "px";
    menu.classList.remove("hidden");
  } else {
    document.getElementById("doc-menu")?.classList.add("hidden");
  }
});

document.getElementById("add-doc")?.addEventListener("click", async () => {
  await window.pywebview.api.add_documents({ caseKey: activeCaseKey });
  document.getElementById("doc-menu").classList.add("hidden");
});

document.getElementById("open-doc")?.addEventListener("click", async () => {
  await window.pywebview.api.open_documents({ caseKey: activeCaseKey });
  document.getElementById("doc-menu").classList.add("hidden");
});

/* =========================================================
   LINKS
   ========================================================= */
function openExternal(url) {
  if (window.pywebview) {
    window.pywebview.api.open_external(url);
  } else {
    window.open(url, "_blank");
  }
}


document.addEventListener("click", async e => {
  if (e.target.classList.contains("link-btn")) {
    activeCaseKey = e.target.dataset.key;
    document.getElementById("links-modal").classList.remove("hidden");

    const res = await window.pywebview.api.get_links({ caseKey: activeCaseKey });
    renderLinks(res.links || []);
  }
});

function renderLinks(links = []) {
  const tbody = document.getElementById("links-table-body");
  const empty = document.getElementById("no-links");

  tbody.innerHTML = "";

  if (!links.length) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  links.forEach(link => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${link.title}</td>
      <td>${link.platform || "-"}</td>
      <td class="truncate">${link.url}</td>
      <td>
        <span class="action" onclick="openExternal('${link.url}')">🔗</span>
      </td>
      <td>
        <span class="action delete" onclick="deleteLink('${link.id}')">🗑️</span>
      </td>
    `;

    tbody.appendChild(row);
  });
}


document.getElementById("save-link")?.addEventListener("click", async () => {
  const title = document.getElementById("link-title").value.trim();
  const url = document.getElementById("link-url").value.trim();
  const platform = document.getElementById("link-platform").value.trim();

  if (!title || !url) return alert("Title & URL required");

  await window.pywebview.api.add_link({
    caseKey: activeCaseKey,
    title,
    url,
    platform
  });

  const res = await window.pywebview.api.get_links({ caseKey: activeCaseKey });
  renderLinks(res.links || []);
});

async function deleteLink(id) {
  await window.pywebview.api.delete_link({
    caseKey: activeCaseKey,
    id
  });

  const res = await window.pywebview.api.get_links({ caseKey: activeCaseKey });
  renderLinks(res.links || []);
}

document.getElementById("close-links")?.addEventListener("click", () => {
  document.getElementById("links-modal").classList.add("hidden");
});

function editCase(caseKey) {
  const cases = window._cachedCases || [];
  const c = cases.find(x => x.key === caseKey);

  if (!c) {
    console.error("Case not found for edit:", caseKey);
    return;
  }

  editingCaseKey = caseKey;

  document.getElementById("case-no").value = c.case_no || "";
  document.getElementById("case-name").value = c.case_name;
  document.getElementById("case-year").value = c.year;
  document.getElementById("court").value = c.court || "";
  document.getElementById("description").value = c.description || "";

  addRulingModal.classList.remove("hidden");
}

document.getElementById("save-ruling").addEventListener("click", async () => {
  const data = {
    case_no: document.getElementById("case-no").value.trim(),
    case_name: document.getElementById("case-name").value.trim(),
    year: document.getElementById("case-year").value.trim(),
    court: document.getElementById("court").value,
    description: document.getElementById("description").value.trim()
  };

  if (!data.case_name || !data.year) {
    return alert("Case Name and Year are required");
  }

  try {
    let res;

    if (editingCaseKey) {
      res = await window.pywebview.api.update_case({
        old_key: editingCaseKey,
        ...data
      });
    } else {
      res = await window.pywebview.api.create_case(data);
    }

    if (res.status !== "ok") {
      return alert(res.message || "Operation failed");
    }

    editingCaseKey = null;
    addRulingModal.classList.add("hidden");

    const casesRes = await window.pywebview.api.get_cases();
    window._cachedCases = casesRes.cases;
    populateTable(casesRes.cases);
    renderApp();
  } catch (e) {
    alert(e.message || "Error saving case");
  }
});

function resetCaseForm() {
  editingCaseKey = null;
  ["case-no","case-name","case-year","court","description"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

document.getElementById("cancel-ruling").onclick = () => {
  resetCaseForm();
  addRulingModal.classList.add("hidden");
};

// Search functionality
function searchCases(query) {
  query = query.trim().toLowerCase();

  const source = window._allCases || [];

  if (!query) {
    populateTable(source);
    return;
  }

  const scored = source
    .map(c => {
      let score = 0;

      if (c.case_no && c.case_no.toLowerCase().includes(query)) score += 100;
      if (c.case_name && c.case_name.toLowerCase().includes(query)) score += 75;
      if (c.description && c.description.toLowerCase().includes(query)) score += 40;
      if (c.court && c.court.toLowerCase().includes(query)) score += 20;

      return { case: c, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.case);

  populateTable(scored);
}

document.querySelector(".search")?.addEventListener("input", e => {
  searchCases(e.target.value);
});
