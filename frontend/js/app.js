/* =========================================================
   GLOBAL APP STATE
   ========================================================= */

const appState = {
  basePathSet: false,
  userExists: false,
  hasRulings: false
};

let activeCaseKey = null;

/* =========================================================
   TABLE HELPERS
   ========================================================= */

function clearTable() {
  const tbody = document.getElementById("ruling-table-body");
  if (tbody) tbody.innerHTML = "";
}

function populateTable(cases = []) {
  clearTable();

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
          🔗 ${c.links_count || 0}
        </span>
      </td>

      <td class="actions">
        ✏️ <span class="action">➕</span> <span class="action delete">🗑️</span>
      </td>
    `;

    tbody.appendChild(row);
  });

  appState.hasRulings = true;
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

document.addEventListener("click", async e => {
  if (e.target.classList.contains("link-btn")) {
    activeCaseKey = e.target.dataset.key;
    document.getElementById("links-modal").classList.remove("hidden");

    const res = await window.pywebview.api.get_links({ caseKey: activeCaseKey });
    renderLinks(res.links || []);
  }
});

function renderLinks(links) {
  const list = document.getElementById("links-list");
  const empty = document.getElementById("no-links");
  list.innerHTML = "";

  if (!links.length) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  links.forEach(link => {
    const div = document.createElement("div");
    div.className = "link-item";
    div.innerHTML = `
      <div>
        <strong>${link.title}</strong><br/>
        <small>${link.url}</small>
      </div>
      <span class="action delete" onclick="deleteLink('${link.id}')">🗑️</span>
    `;
    list.appendChild(div);
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
