let selectedCard = null;
let isEdit = false;

/* OPEN */

function openAddModal() {
  isEdit = false;
  selectedCard = null;

  document.getElementById("modalTitle").innerText = "Add Memory";
  document.getElementById("memoryTitle").value = "";
  document.getElementById("memoryDesc").value = "";

  document.getElementById("memoryModal").classList.remove("hidden");
}

function openEditModal(btn) {
  isEdit = true;
  selectedCard = btn.closest(".memory-card");

  document.getElementById("modalTitle").innerText = "Edit Memory";
  document.getElementById("memoryTitle").value =
    selectedCard.querySelector(".title").innerText;
  document.getElementById("memoryDesc").value =
    selectedCard.querySelector(".desc").innerText;

  document.getElementById("memoryModal").classList.remove("hidden");
}

function openDeleteModal(btn) {
  selectedCard = btn.closest(".memory-card");
  document.getElementById("deleteModal").classList.remove("hidden");
}

/* CLOSE */

function closeMemoryModal() {
  document.getElementById("memoryModal").classList.add("hidden");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.add("hidden");
}

/* SAVE */

function saveMemory() {
  const title = document.getElementById("memoryTitle").value.trim();
  const desc = document.getElementById("memoryDesc").value.trim();

  if (!title) return alert("Enter memory title");

  if (isEdit && selectedCard) {
    selectedCard.querySelector(".title").innerText = title;
    selectedCard.querySelector(".desc").innerText = desc;
  } else {
    const card = document.createElement("div");
    card.className = "card memory-card";

    card.innerHTML = `
      <div>
        <strong class="title">${title}</strong>
        <p class="small desc">${desc}</p>
      </div>

      <div class="actions">
        <button class="icon-btn" onclick="openEditModal(this)">✏️</button>
        <button class="icon-btn" onclick="openDeleteModal(this)">🗑️</button>
      </div>
    `;

    document.getElementById("memoryList").appendChild(card);
  }

  closeMemoryModal();
}

/* DELETE */

function confirmDelete() {
  if (selectedCard) selectedCard.remove();
  closeDeleteModal();
}
