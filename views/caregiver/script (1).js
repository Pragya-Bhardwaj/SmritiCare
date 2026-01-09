let currentType = null;

/* ---------- MODAL ---------- */
function openModal(title, bodyHTML, type) {
  currentType = type;
  document.getElementById("modal-title").innerText = title;
  document.getElementById("modal-body").innerHTML = bodyHTML;
  document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

/* ---------- BACKEND API URLs ---------- */
const MED_API = "http://localhost:5000/api/medications";
const REM_API = "http://localhost:5000/api/reminders";

/* ---------- MEDICATION ---------- */
function addMedication() {
  openModal(
    "Add Medication",
    `
      <input id="med-name" placeholder="Medicine name">
      <input id="med-dose" placeholder="Dose">
      <input id="med-time" placeholder="Time">
      <input id="med-notes" placeholder="Notes">
    `,
    "medication"
  );
}

function saveModal() {

  /* SAVE MEDICATION */
  if (currentType === "medication") {
    const data = {
      name: document.getElementById("med-name").value,
      dose: document.getElementById("med-dose").value,
      time: document.getElementById("med-time").value,
      notes: document.getElementById("med-notes").value
    };

    fetch(MED_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(() => {
      closeModal();
      loadMedications();
    });
  }

  /* SAVE REMINDER */
  if (currentType === "reminder") {
    const title = document.getElementById("rem-title").value;
    const time = document.getElementById("rem-time").value;

    const container = document.querySelector(".reminder-list");

    const card = document.createElement("div");
    card.className = "reminder-card";
    card.dataset.type = "medicine"; // default category, can extend later

    card.innerHTML = `
      <div class="left">
        <span class="icon">💊</span>
        <div>
          <h3>${title}</h3>
          <p>⏰ ${time}</p>
        </div>
      </div>
      <div class="right">
        <span class="status pending" onclick="toggleStatus(this)">Pending</span>
        <button class="icon-btn" onclick="editItem('reminder','local')">✏️</button>
        <button class="icon-btn" onclick="this.closest('.reminder-card').remove()">🗑️</button>
      </div>
    `;

    container.appendChild(card);
    closeModal();
  }
}

/* ---------- LOAD MEDICATIONS ---------- */
function loadMedications() {
  fetch(MED_API)
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("tbody");
      if (!tbody) return;

      tbody.innerHTML = "";

      data.forEach(med => {
        tbody.innerHTML += `
          <tr>
            <td><strong>${med.name}</strong></td>
            <td><span class="pill">${med.dose}</span></td>
            <td>${med.time}</td>
            <td>${med.notes || "-"}</td>
            <td>
              <button class="icon-btn" onclick="editItem('medication','${med._id}')">✏️</button>
            </td>
          </tr>
        `;
      });
    });
}

/* ---------- REMINDERS ---------- */
function addReminder() {
  openModal(
    "Add Reminder",
    `
      <input id="rem-title" placeholder="Reminder title">
      <input id="rem-time" placeholder="Time">
    `,
    "reminder"
  );
}

function loadReminders() {
  fetch(REM_API)
    .then(res => res.json())
    .then(data => {
      const container = document.querySelector(".reminder-list");
      if (!container) return;

      container.innerHTML = "";

      data.forEach(rem => {
        const row = document.createElement("div");
        row.classList.add("reminder-card");
        row.dataset.type = "medicine"; // default category

        row.innerHTML = `
          <div class="left">
            <span class="icon">💊</span>
            <div>
              <h3>${rem.title}</h3>
              <p>⏰ ${rem.time}</p>
            </div>
          </div>
          <div class="right">
            <span class="status ${rem.status.toLowerCase()}" onclick="toggleStatus(this,'${rem._id}')">
              ${rem.status}
            </span>
            <button class="icon-btn" onclick="editItem('reminder','${rem._id}')">✏️</button>
            <button class="icon-btn" onclick="this.closest('.reminder-card').remove()">🗑️</button>
          </div>
        `;

        container.appendChild(row);
      });
    });
}

/* ---------- DONE / PENDING ---------- */
function toggleStatus(el, id) {
  const newStatus = el.innerText === "Pending" ? "Done" : "Pending";

  el.innerText = newStatus;
  el.classList.toggle("pending");
  el.classList.toggle("done");

  if (id) {
    fetch(`${REM_API}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
  }
}

/* ---------- MEMORY ---------- */
function addMemory() {
  openModal(
    "Add Memory",
    `<input placeholder="Memory title">`,
    null
  );
}

function playVoice() {
  alert("🔊 Playing memory voice");
}

/* ---------- QUICK ACTIONS ---------- */
function emergencyCall() {
  alert("Emergency call triggered!");
}

function checkLocation() {
  window.location.href = "livelocation.html";
}

/* ---------- LIVE LOCATION ---------- */
function refreshLocation() {
  openModal(
    "Live Location",
    `<p>📍 Location refreshed successfully</p>`,
    null
  );
}

/* ---------- PROFILE ---------- */
function editProfile() {
  openModal(
    "Edit Profile",
    `<input placeholder="Edit info">`,
    null
  );
}

/* ---------- EDIT ITEM ---------- */
function editItem(type, id) {
  openModal(
    `Edit ${type}`,
    `<p>Edit feature coming soon for ID: ${id}</p>`,
    null
  );
}

/* ---------- AUTO LOAD ---------- */
document.addEventListener("DOMContentLoaded", () => {
  loadMedications();
  loadReminders();
});

