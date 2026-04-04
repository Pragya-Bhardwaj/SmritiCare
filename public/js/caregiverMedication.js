let selectedMedicationId = null;
let isEdit = false;
let allMedications = [];

/* INITIALIZATION */
document.addEventListener("DOMContentLoaded", () => {
  loadMedications();
});

/* OPEN */
function openAddModal() {
  isEdit = false;
  selectedMedicationId = null;

  document.getElementById("modalTitle").innerText = "Add Medication";
  document.getElementById("medName").value = "";
  document.getElementById("medHour").value = "09";
  document.getElementById("medMinute").value = "00";
  document.getElementById("medAmPm").value = "AM";
  document.getElementById("medDose").value = "";
  document.getElementById("medNotes").value = "";

  document.getElementById("medModal").classList.remove("hidden");
}

function openEditModal(medicationId) {
  isEdit = true;
  selectedMedicationId = medicationId;

  const medication = allMedications.find(m => m._id === medicationId);
  if (!medication) return alert("Medication not found");

  document.getElementById("modalTitle").innerText = "Edit Medication";
  document.getElementById("medName").value = medication.name || "";
  document.getElementById("medDose").value = medication.dosage || "";
  document.getElementById("medNotes").value = medication.notes || "";

  const time = Array.isArray(medication.times) && medication.times[0] ? medication.times[0] : "";
  if (time) {
    const parts = time.split(":");
    let hh = parseInt(parts[0], 10);
    const mm = parts[1] || "00";
    let ampm = "AM";
    if (hh >= 12) { ampm = "PM"; if (hh > 12) hh = hh - 12; }
    if (hh === 0) hh = 12;
    document.getElementById("medHour").value = String(hh).padStart(2, "0");
    document.getElementById("medMinute").value = mm;
    document.getElementById("medAmPm").value = ampm;
  }

  document.getElementById("medModal").classList.remove("hidden");
}

function openDeleteModal(medicationId) {
  selectedMedicationId = medicationId;
  document.getElementById("deleteModal").classList.remove("hidden");
}

/* CLOSE */
function closeMedModal() {
  document.getElementById("medModal").classList.add("hidden");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.add("hidden");
}

/* LOAD */
async function loadMedications() {
  try {
    const res = await fetch("/medication/api/medications", {
      credentials: "include"
    });

    if (!res.ok) {
      console.error("Failed to load medications:", res.status);
      renderMedicationsError();
      return;
    }

    const data = await res.json();
    allMedications = data.medications || [];
    renderMedications();

  } catch (err) {
    console.error("Load medications error:", err);
    renderMedicationsError();
  }
}

function renderMedicationsError() {
  const list = document.getElementById("medicationList");
  if (!list) return;
  list.innerHTML = `
    <div class="card" style="text-align: center; padding: 40px; color: #999;">
      <p>Failed to load medications</p>
    </div>
  `;
}

function renderMedications() {
  const list = document.getElementById("medicationList");
  if (!list) return;

  if (allMedications.length === 0) {
    list.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px; color: #999;">
        <p>No medications yet. Add one to get started!</p>
      </div>
    `;
    return;
  }

  list.innerHTML = allMedications.map(m => {
    const time = Array.isArray(m.times) && m.times[0] ? m.times[0] : "";
    const displayTime = time ? formatTime(time) : "--:--";
    return `
      <div class="card medication-card" data-id="${m._id}">
        <div>
          <strong class="title">${escapeHtml(m.name)}</strong>
          <p class="small meta"><span class="dose">${escapeHtml(m.dosage || "")}</span> - <span class="time" data-time="${time}">${displayTime}</span></p>
          <p class="small notes">${escapeHtml(m.notes || "")}</p>
        </div>

        <div class="actions">
          <button class="edit-btn" onclick="openEditModal('${m._id}')">Edit</button>
          <button class="delete-btn" onclick="openDeleteModal('${m._id}')">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

/* SAVE */
async function saveMedication() {
  const name = document.getElementById("medName").value.trim();
  const hour = document.getElementById("medHour").value;
  const minute = document.getElementById("medMinute").value;
  const ampm = document.getElementById("medAmPm").value;
  const dose = document.getElementById("medDose").value.trim();
  const notes = document.getElementById("medNotes").value.trim();

  if (!name) return alert("Enter medication name");
  if (!dose) return alert("Enter dosage");

  // convert to 24-hour HH:MM
  let hh = parseInt(hour, 10);
  if (ampm === "PM" && hh !== 12) hh += 12;
  if (ampm === "AM" && hh === 12) hh = 0;
  const time = `${String(hh).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  const payload = { name, dosage: dose, time, notes };

  try {
    if (isEdit && selectedMedicationId) {
      const res = await fetch(`/medication/api/medications/${selectedMedicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      let data;
      try { data = await res.json(); } catch (e) { data = null; }

      if (!res.ok) {
        alert((data && (data.message || data.error)) || "Failed to update medication");
        return;
      }

      const idx = allMedications.findIndex(m => m._id === selectedMedicationId);
      if (idx >= 0 && data && data.medication) {
        allMedications[idx] = data.medication;
      }
    } else {
      const res = await fetch("/medication/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      let data;
      try { data = await res.json(); } catch (e) { data = null; }

      if (!res.ok) {
        alert((data && (data.message || data.error)) || "Failed to add medication");
        return;
      }

      if (data && data.medication) {
        allMedications.unshift(data.medication);
      }
    }

    renderMedications();
    closeMedModal();

  } catch (err) {
    console.error("Save medication error:", err);
    alert("Failed to save medication");
  }
}

/* DELETE */
async function confirmDelete() {
  if (!selectedMedicationId) return;

  try {
    const res = await fetch(`/medication/api/medications/${selectedMedicationId}`, {
      method: "DELETE",
      credentials: "include"
    });

    let data;
    try { data = await res.json(); } catch (e) { data = null; }

    if (!res.ok) {
      alert((data && (data.message || data.error)) || "Failed to delete medication");
      return;
    }

    allMedications = allMedications.filter(m => m._id !== selectedMedicationId);
    renderMedications();
    closeDeleteModal();

  } catch (err) {
    console.error("Delete medication error:", err);
    alert("Failed to delete medication");
  }
}

/* UTILITY */
function formatTime(t) {
  if (!t) return "--:--";
  const parts = t.split(":");
  if (parts.length !== 2) return t;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return t;
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = ((h % 12) === 0) ? 12 : (h % 12);
  return `${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}
