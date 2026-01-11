let selectedCard = null;
let isEdit = false;

/* ================= OPEN MODALS ================= */

function openAddModal() {
  isEdit = false;
  selectedCard = null;

  document.getElementById("modalTitle").innerText = "Add Reminder";
  document.getElementById("reminderTitle").value = "";
  document.getElementById("reminderTime").value = "";

  document.getElementById("reminderModal").classList.remove("hidden");
}

function openEditModal(btn) {
  isEdit = true;
  selectedCard = btn.closest(".reminder-card");

  document.getElementById("modalTitle").innerText = "Edit Reminder";
  document.getElementById("reminderTitle").value =
    selectedCard.querySelector(".title").innerText;

  document.getElementById("reminderModal").classList.remove("hidden");
}

function openDeleteModal(btn) {
  selectedCard = btn.closest(".reminder-card");
  document.getElementById("deleteModal").classList.remove("hidden");
}

/* ================= CLOSE MODALS ================= */

function closeReminderModal() {
  document.getElementById("reminderModal").classList.add("hidden");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.add("hidden");
}

/* ================= SAVE (ADD / EDIT) ================= */

function saveReminder() {
  const title = document.getElementById("reminderTitle").value.trim();
  const time = document.getElementById("reminderTime").value;

  if (!title) return alert("Please enter reminder title");

  if (isEdit && selectedCard) {
    selectedCard.querySelector(".title").innerText = title;
  } else {
    const card = document.createElement("div");
    card.className = "card reminder-card";

    card.innerHTML = `
      <div>
        <strong class="title">${title}</strong>
        <p class="small time">${time || "--:--"}</p>
      </div>

      <span class="status pending">Pending</span>

      <div class="actions">
        <button class="icon-btn" onclick="openEditModal(this)">✏️</button>
        <button class="icon-btn" onclick="openDeleteModal(this)">🗑️</button>
      </div>
    `;

    document.getElementById("reminderList").appendChild(card);
  }

  closeReminderModal();
}

/* ================= DELETE ================= */

function confirmDelete() {
  if (selectedCard) selectedCard.remove();
  closeDeleteModal();
}
