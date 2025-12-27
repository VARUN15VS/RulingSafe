/* =========================================================
   GLOBAL APP STATE (SINGLE SOURCE OF TRUTH)
   ========================================================= */

const appState = {
  basePathSet: false,
  userExists: false,
  hasRulings: false
};


/* =========================================================
   TABLE HELPERS
   ========================================================= */

function clearTable() {
  document.getElementById("ruling-table-body").innerHTML = "";
}

function populateTable(cases) {
  clearTable();

  cases.forEach(c => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${c.case_no || "-"}</td>
      <td>${c.case_name}</td>
      <td>${c.year}</td>
      <td>${c.court || "-"}</td>
      <td>${c.result || "-"}</td>
      <td>${new Date(c.last_updated).toLocaleDateString()}</td>
    `;
    document.getElementById("ruling-table-body").appendChild(row);
  });
}


/* =========================================================
   SCREEN RENDER CONTROLLER
   ========================================================= */

function renderApp() {
  document.getElementById("select-location-screen")?.classList.add("hidden");
  document.getElementById("first-time-screen") &&
    (document.getElementById("first-time-screen").style.display = "none");
  document.getElementById("empty-workspace")?.classList.add("hidden");
  document.getElementById("dashboard")?.classList.add("hidden");

  if (!appState.basePathSet) {
    document.getElementById("select-location-screen")?.classList.remove("hidden");
  }
  else if (!appState.userExists) {
    document.getElementById("first-time-screen").style.display = "flex";
  }
  else if (!appState.hasRulings) {
    document.getElementById("empty-workspace")?.classList.remove("hidden");
  }
  else {
    document.getElementById("dashboard")?.classList.remove("hidden");
  }
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
      appState.hasRulings = res.cases.length > 0;

      if (appState.hasRulings) {
        populateTable(res.cases);
      }
    }

    console.log("Base path:", appState.basePathSet);
    console.log("User exists:", appState.userExists);
    console.log("Has rulings:", appState.hasRulings);

  } catch (err) {
    console.error("Startup sync failed:", err);
  }

  renderApp();
});


/* =========================================================
   BROWSER MODE FALLBACK
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  if (!window.pywebview) {
    console.warn("Browser mode (no backend)");
    renderApp();
  }
});


/* =========================================================
   SELECT STORAGE LOCATION
   ========================================================= */

document.getElementById("select-location-btn")?.addEventListener("click", async () => {
  try {
    const res = await window.pywebview.api.pick_storage_location();
    if (res.status === "ok") {
      appState.basePathSet = true;
      renderApp();
    }
  } catch {
    alert("Failed to select storage location");
  }
});


/* =========================================================
   CREATE USER MODAL
   ========================================================= */

const createUserModal = document.getElementById("create-user-modal");

document.getElementById("create-user-btn")?.addEventListener("click", () => {
  createUserModal.classList.remove("hidden");
});

document.getElementById("cancel-user")?.addEventListener("click", () => {
  createUserModal.classList.add("hidden");
});

document.getElementById("save-user")?.addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();

  if (!username) {
    alert("Username is required");
    return;
  }

  try {
    const res = await window.pywebview.api.create_user({
      username,
      first_name: document.getElementById("first-name").value.trim(),
      middle_name: document.getElementById("middle-name").value.trim(),
      last_name: document.getElementById("last-name").value.trim()
    });

    if (res.status === "ok") {
      appState.userExists = true;
      createUserModal.classList.add("hidden");
      renderApp();
    }
  } catch (err) {
    alert(err.message || "User creation failed");
  }
});


/* =========================================================
   ADD RULING
   ========================================================= */

const addRulingModal = document.getElementById("add-ruling-modal");

document.getElementById("add-first-ruling")?.addEventListener("click", () => {
  addRulingModal.classList.remove("hidden");
});

document.getElementById("cancel-ruling")?.addEventListener("click", () => {
  addRulingModal.classList.add("hidden");
});


document.getElementById("save-ruling")?.addEventListener("click", async () => {
  const data = {
    case_no: document.getElementById("case-no").value.trim(),
    case_name: document.getElementById("case-name").value.trim(),
    year: document.getElementById("case-year").value.trim(),
    court: document.getElementById("court").value,
    result: document.getElementById("result").value,
    description: document.getElementById("description").value.trim()
  };

  if (!data.case_name || !data.year) {
    alert("Case Name and Year are required");
    return;
  }

  try {
    const res = await window.pywebview.api.create_case(data);

    if (res.status === "ok") {
      const casesRes = await window.pywebview.api.get_cases();
      populateTable(casesRes.cases);

      appState.hasRulings = true;
      addRulingModal.classList.add("hidden");
      renderApp();
    }
  } catch (err) {
    alert(err.message || "Failed to add ruling");
  }
});
