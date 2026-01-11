let selectedCard = null;
let isEdit = false;

/* ================= OPEN ================= */

function openAddModal() {
  isEdit = false;
  selectedCard = null;

  document.getElementById("modalTitle").innerText = "Add Medication";
  document.getElementById("medName").value = "";
  document.getElementById("medDose").value = "";

  document.getElementById("medModal").classList.remove("hidden");
}

function openEditModal(btn) {
  isEdit = true;
  selectedCard = btn.closest(".medication-card");

  document.getElementById("modalTitle").innerText = "Edit Medication";
  document.getElementById("medName").value =
    selectedCard.querySelector(".title").innerText;

  document.getElementById("medModal").classList.remove("hidden");
}

function openDeleteModal(btn) {
  selectedCard = btn.closest(".medication-card");
  document.getElementById("deleteModal").classList.remove("hidden");
}

/* ================= CLOSE ================= */

function closeMedModal() {
  document.getElementById("medModal").classList.add("hidden");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.add("hidden");
}

/* ================= SAVE ================= */

function saveMedication() {
  const name = document.getElementById("medName").value.trim();
  const dose = document.getElementById("medDose").value.trim();

  if (!name) return alert("Enter medication name");

  if (isEdit && selectedCard) {
    selectedCard.querySelector(".title").innerText = name;
    selectedCard.querySelector(".small").innerText = dose;
  } else {
    const card = document.createElement("div");
    card.className = "card medication-card";

    card.innerHTML = `
      <div>
        <strong class="title">${name}</strong>
        <p class="small">${dose}</p>
      </div>

      <span class="status pending">Pending</span>

      <div class="actions">
        <button class="icon-btn" onclick="openEditModal(this)">✏️</button>
        <button class="icon-btn" onclick="openDeleteModal(this)">🗑️</button>
      </div>
    `;

    document.getElementById("medicationList").appendChild(card);
  }

  closeMedModal();
}

/* ================= DELETE ================= */

function confirmDelete() {
  if (selectedCard) selectedCard.remove();
  closeDeleteModal();
}
