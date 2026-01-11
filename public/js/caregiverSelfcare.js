let selectedCard = null;
let isEdit = false;

/* ================= OPEN ================= */

function openAddModal() {
  isEdit = false;
  selectedCard = null;

  document.getElementById("modalTitle").innerText = "Add Tip";
  document.getElementById("tipTitle").value = "";
  document.getElementById("tipDesc").value = "";

  document.getElementById("selfcareModal").classList.remove("hidden");
}

function openEditModal(btn) {
  isEdit = true;
  selectedCard = btn.closest(".selfcare-card");

  document.getElementById("modalTitle").innerText = "Edit Tip";
  document.getElementById("tipTitle").value =
    selectedCard.querySelector(".title").innerText;
  document.getElementById("tipDesc").value =
    selectedCard.querySelector(".desc").innerText;

  document.getElementById("selfcareModal").classList.remove("hidden");
}

function openDeleteModal(btn) {
  selectedCard = btn.closest(".selfcare-card");
  document.getElementById("deleteModal").classList.remove("hidden");
}

/* ================= CLOSE ================= */

function closeSelfcareModal() {
  document.getElementById("selfcareModal").classList.add("hidden");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.add("hidden");
}

/* ================= SAVE ================= */

function saveTip() {
  const title = document.getElementById("tipTitle").value.trim();
  const desc = document.getElementById("tipDesc").value.trim();

  if (!title) return alert("Enter tip title");

  if (isEdit && selectedCard) {
    selectedCard.querySelector(".title").innerText = title;
    selectedCard.querySelector(".desc").innerText = desc;
  } else {
    const card = document.createElement("div");
    card.className = "card selfcare-card";

    card.innerHTML = `
      <strong class="title">${title}</strong>
      <p class="small desc">${desc}</p>

      <div class="actions">
        <button class="icon-btn" onclick="openEditModal(this)">✏️</button>
        <button class="icon-btn" onclick="openDeleteModal(this)">🗑️</button>
      </div>
    `;

    document.getElementById("selfcareList").appendChild(card);
  }

  closeSelfcareModal();
}

/* ================= DELETE ================= */

function confirmDelete() {
  if (selectedCard) selectedCard.remove();
  closeDeleteModal();
}
