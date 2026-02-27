let patientTips = [];
let editingTipId = null;
const PATIENT_TIP_SUGGESTIONS = [
  {
    title: "Morning hydration routine",
    description: "Start the day with one glass of water before breakfast.",
    category: "Hydration"
  },
  {
    title: "Five-minute stretch break",
    description: "Do light neck, shoulder, and ankle stretches once in the afternoon.",
    category: "Movement"
  },
  {
    title: "Consistent bedtime reminder",
    description: "Keep bedtime at the same hour every night to improve sleep quality.",
    category: "Sleep"
  },
  {
    title: "Calm breathing exercise",
    description: "Take slow deep breaths for two minutes during stress or anxiety.",
    category: "Calm"
  },
  {
    title: "Balanced snack idea",
    description: "Include a fruit or handful of nuts in the evening snack.",
    category: "Nutrition"
  },
  {
    title: "Short gratitude moment",
    description: "Share one positive memory or thing to be grateful for today.",
    category: "General"
  }
];

document.addEventListener("DOMContentLoaded", () => {
  const addTipForm = document.getElementById("addTipForm");
  if (addTipForm) {
    addTipForm.addEventListener("submit", handleAddTip);
  }

  renderPatientTipSuggestions();
  loadCaregiverTips();
  loadPatientTips();
});

async function loadCaregiverTips() {
  try {
    const res = await fetch("/selfcare/api/caregiver-tips", {
      credentials: "include"
    });

    const data = await safeJson(res);
    if (!res.ok) {
      renderCaregiverTips([], data.message || "Unable to load caregiver tips right now.");
      return;
    }

    renderCaregiverTips(data.tips || []);
  } catch (err) {
    console.error("Failed to load caregiver tips:", err);
    renderCaregiverTips([], "Unable to load caregiver tips right now.");
  }
}

async function loadPatientTips() {
  try {
    const res = await fetch("/selfcare/api/patient-tips", {
      credentials: "include"
    });

    const data = await safeJson(res);
    if (!res.ok) {
      patientTips = [];
      renderPatientTips([], data.message || "Unable to load patient tips right now.");
      return;
    }

    patientTips = data.tips || [];
    renderPatientTips(patientTips);
  } catch (err) {
    console.error("Failed to load patient tips:", err);
    patientTips = [];
    renderPatientTips([], "Unable to load patient tips right now.");
  }
}

function renderCaregiverTips(tips, emptyMessage = "No static tips available.") {
  const grid = document.getElementById("caregiverTipsGrid");
  if (!grid) return;

  if (!tips.length) {
    grid.innerHTML = `
      <div class="card" style="text-align: center; color: #94a3b8;">
        <p>${escapeHtml(emptyMessage)}</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = tips.map((tip) => `
    <div class="card selfcare">
      <h3>${escapeHtml(tip.title)}</h3>
      <p>${escapeHtml(tip.description)}</p>
    </div>
  `).join("");
}

function renderPatientTips(tips, emptyMessage = "No patient tips yet. Use \"Add Tip for Patient\" to create one.") {
  const list = document.getElementById("patientTipsList");
  if (!list) return;

  if (!tips.length) {
    list.innerHTML = `
      <div class="card" style="text-align: center; color: #94a3b8;">
        <p>${escapeHtml(emptyMessage)}</p>
      </div>
    `;
    return;
  }

  list.innerHTML = tips.map((tip) => `
    <div class="card patient-tip-card" data-id="${tip._id}">
      <strong class="title">${escapeHtml(tip.title)}</strong>
      <p class="small desc">${escapeHtml(tip.description)}</p>
      <p class="small tip-meta">${escapeHtml(tip.category || "General")} - ${formatDate(tip.createdAt)}</p>
      <div class="actions">
        <button type="button" class="edit-btn" onclick="openEditModal('${tip._id}')">Edit</button>
        <button type="button" class="delete-btn" onclick="deletePatientTip('${tip._id}')">Delete</button>
      </div>
    </div>
  `).join("");
}

function renderPatientTipSuggestions() {
  const section = document.getElementById("patientTipSuggestions");
  if (!section) return;

  section.innerHTML = PATIENT_TIP_SUGGESTIONS.map((suggestion, index) => `
    <article class="card suggestion-card">
      <h3>${escapeHtml(suggestion.title)}</h3>
      <p>${escapeHtml(suggestion.description)}</p>
      <p class="small suggestion-meta">Category: ${escapeHtml(suggestion.category)}</p>
      <button type="button" class="secondary-btn suggestion-btn" onclick="useSuggestion(${index})">
        Use This Suggestion
      </button>
    </article>
  `).join("");
}

function useSuggestion(index) {
  const suggestion = PATIENT_TIP_SUGGESTIONS[index];
  if (!suggestion) return;

  openAddModal();

  const titleInput = document.getElementById("tipTitle");
  const descriptionInput = document.getElementById("tipDescription");
  const categoryInput = document.getElementById("tipCategory");

  if (titleInput) titleInput.value = suggestion.title;
  if (descriptionInput) descriptionInput.value = suggestion.description;
  if (categoryInput) categoryInput.value = suggestion.category || "General";
}

function openAddModal() {
  const modal = document.getElementById("addTipModal");
  const modalTitle = document.getElementById("tipModalTitle");
  const saveBtn = document.getElementById("tipSaveBtn");
  const addTipForm = document.getElementById("addTipForm");

  if (!modal) return;

  editingTipId = null;
  if (addTipForm) addTipForm.reset();
  if (modalTitle) modalTitle.textContent = "Add Self-care Tip for Patient";
  if (saveBtn) saveBtn.textContent = "Save Tip";
  modal.classList.remove("hidden");
}

function closeAddModal() {
  const modal = document.getElementById("addTipModal");
  const addTipForm = document.getElementById("addTipForm");
  const modalTitle = document.getElementById("tipModalTitle");
  const saveBtn = document.getElementById("tipSaveBtn");

  editingTipId = null;
  if (modal) modal.classList.add("hidden");
  if (addTipForm) addTipForm.reset();
  if (modalTitle) modalTitle.textContent = "Add Self-care Tip for Patient";
  if (saveBtn) saveBtn.textContent = "Save Tip";
}

function openEditModal(tipId) {
  const tip = patientTips.find((item) => item._id === tipId);
  if (!tip) {
    alert("Tip not found.");
    return;
  }

  editingTipId = tipId;

  const modal = document.getElementById("addTipModal");
  const modalTitle = document.getElementById("tipModalTitle");
  const saveBtn = document.getElementById("tipSaveBtn");
  const titleInput = document.getElementById("tipTitle");
  const descriptionInput = document.getElementById("tipDescription");
  const categoryInput = document.getElementById("tipCategory");

  if (modalTitle) modalTitle.textContent = "Update Self-care Tip for Patient";
  if (saveBtn) saveBtn.textContent = "Update Tip";
  if (titleInput) titleInput.value = tip.title || "";
  if (descriptionInput) descriptionInput.value = tip.description || "";
  if (categoryInput) categoryInput.value = tip.category || "General";
  if (modal) modal.classList.remove("hidden");
}

async function handleAddTip(event) {
  event.preventDefault();

  const titleInput = document.getElementById("tipTitle");
  const descriptionInput = document.getElementById("tipDescription");
  const categoryInput = document.getElementById("tipCategory");

  const title = titleInput?.value.trim() || "";
  const description = descriptionInput?.value.trim() || "";
  const category = categoryInput?.value || "General";

  if (!title || !description) {
    alert("Please enter both title and description.");
    return;
  }

  try {
    const endpoint = editingTipId
      ? `/selfcare/api/patient-tips/${editingTipId}`
      : "/selfcare/api/patient-tips";

    const method = editingTipId ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        title,
        description,
        category
      })
    });

    const data = await safeJson(res);
    if (!res.ok) {
      alert(data.message || "Failed to save tip.");
      return;
    }

    if (editingTipId) {
      if (data.tip) {
        patientTips = patientTips.map((tip) =>
          tip._id === editingTipId ? data.tip : tip
        );
      } else {
        patientTips = patientTips.map((tip) =>
          tip._id === editingTipId
            ? { ...tip, title, description, category }
            : tip
        );
      }
    } else {
      if (data.tip) {
        patientTips = [data.tip, ...patientTips];
      } else {
        await loadPatientTips();
      }
    }

    renderPatientTips(patientTips);
    closeAddModal();
  } catch (err) {
    console.error("Failed to save patient tip:", err);
    alert("Failed to save tip.");
  }
}

async function deletePatientTip(tipId) {
  if (!tipId) return;

  const shouldDelete = window.confirm("Delete this self-care tip for patient?");
  if (!shouldDelete) return;

  try {
    const res = await fetch(`/selfcare/api/patient-tips/${tipId}`, {
      method: "DELETE",
      credentials: "include"
    });

    const data = await safeJson(res);
    if (!res.ok) {
      alert(data.message || "Failed to delete tip.");
      return;
    }

    patientTips = patientTips.filter((tip) => tip._id !== tipId);
    renderPatientTips(patientTips);
  } catch (err) {
    console.error("Failed to delete patient tip:", err);
    alert("Failed to delete tip.");
  }
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch (err) {
    return {};
  }
}

function formatDate(dateValue) {
  if (!dateValue) return "Just now";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleDateString();
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.closeAddModal = closeAddModal;
window.useSuggestion = useSuggestion;
window.deletePatientTip = deletePatientTip;
