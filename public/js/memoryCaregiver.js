const form = document.getElementById("memoryForm");
const grid = document.getElementById("memoryGrid");
const modal = document.getElementById("memoryModal");
const deleteModal = document.getElementById("deleteModal");
const saveBtn = document.getElementById("memorySaveBtn");
let currentMemories = [];
let selectedMemoryId = null;
let isSaving = false;

document.addEventListener("DOMContentLoaded", () => {
  loadMemories();
  setupForm();
  setupMediaPreviewInputs();
  setupVisualMediaToggle();
  setupGridInteractions();
});

function setupForm() {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (isSaving) {
      return;
    }

    const id = document.getElementById("memoryId").value || null;
    const title = document.getElementById("memoryTitle").value.trim();
    if (!title) return alert("Enter a title");

    const fd = new FormData(form);
    fd.set("description", (document.getElementById("memoryDesc").value || "").trim());

    try {
      setSaveState(true);
      const url = id ? `/memory/api/memories/${id}` : "/memory/api/memories";
      const method = id ? "PUT" : "POST";
      const res = await fetch(url, { method, body: fd, credentials: "include" });
      const contentType = res.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? await res.json() : { message: await res.text() };

      if (!res.ok) {
        throw new Error(payload.message || payload.error || "Failed to save memory");
      }

      closeMemoryModal();
      form.reset();

      if (payload && payload.memory && method === "PUT") {
        updateCardInDOM(payload.memory);
      } else {
        await loadMemories();
      }

      if (Array.isArray(payload.warnings) && payload.warnings.length) {
        alert(payload.warnings.join("\n"));
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save memory");
    } finally {
      setSaveState(false);
    }
  });
}

function setupMediaPreviewInputs() {
  const imageInput = document.getElementById("memoryImage");
  const audioInput = document.getElementById("memoryAudio");
  const videoInput = document.getElementById("memoryVideo");

  if (imageInput) imageInput.addEventListener("change", () => previewSelectedFile(imageInput, "image"));
  if (audioInput) audioInput.addEventListener("change", () => previewSelectedFile(audioInput, "audio"));
  if (videoInput) videoInput.addEventListener("change", () => previewSelectedFile(videoInput, "video"));
}

function setupVisualMediaToggle() {
  const inputs = document.querySelectorAll('input[name="visualMediaType"]');
  inputs.forEach((input) => {
    input.addEventListener("change", () => applyVisualMediaSelection(input.value));
  });

  const active = document.querySelector('input[name="visualMediaType"]:checked');
  applyVisualMediaSelection(active ? active.value : "image");
}

function setupGridInteractions() {
  if (!grid) return;

  grid.addEventListener("click", (e) => {
    if (e.target.closest("audio, video")) {
      e.stopPropagation();
      return;
    }

    const editBtn = e.target.closest(".edit-btn");
    if (editBtn) {
      e.stopPropagation();
      openEditModalById(editBtn.dataset.id);
      return;
    }

    const delBtn = e.target.closest(".delete-btn");
    if (delBtn) {
      e.stopPropagation();
      openDeleteModalById(delBtn.dataset.id);
      return;
    }

    const card = e.target.closest(".memory-item[data-id]");
    if (!card) return;

    const memory = currentMemories.find((item) => item._id === card.dataset.id);
    if (memory) {
      openMemoryDetailModal(memory);
    }
  });
}

function openAddModal() {
  setSaveState(false);
  document.getElementById("modalTitle").innerText = "Add Memory";
  document.getElementById("memoryId").value = "";
  form.reset();
  resetMediaPreview();
  setVisualMediaChoice("image");
  modal.classList.remove("hidden");
}

async function openEditModalById(id) {
  try {
    setSaveState(false);
    const memory = currentMemories.find((item) => item._id === id) || await fetchMemoryById(id);
    if (!memory) return alert("Memory not found");

    document.getElementById("modalTitle").innerText = "Edit Memory";
    document.getElementById("memoryId").value = memory._id;
    document.getElementById("memoryTitle").value = memory.title || "";
    document.getElementById("memoryRelation").value = memory.relation || "";
    document.getElementById("memoryDesc").value = memory.description || "";
    document.getElementById("memoryNotes").value = memory.notes || "";

    populateMediaPreview(memory);
    setVisualMediaChoice(memory.videoUrl ? "video" : "image");
    modal.classList.remove("hidden");
  } catch (err) {
    console.error("Open edit failed:", err);
    alert("Could not load memory for editing");
  }
}

async function fetchMemoryById(id) {
  const res = await fetch(`/memory/api/memories?nocache=${Date.now()}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load memories");
  const data = await res.json();
  currentMemories = data.memories || [];
  return currentMemories.find((item) => item._id === id);
}

function closeMemoryModal() {
  setSaveState(false);
  resetMediaPreview();
  modal.classList.add("hidden");
}

function openDeleteModalById(id) {
  selectedMemoryId = id;
  deleteModal.classList.remove("hidden");
  document.getElementById("confirmDelete").onclick = confirmDelete;
}

function closeDeleteModal() {
  deleteModal.classList.add("hidden");
}

async function confirmDelete() {
  if (!selectedMemoryId) return;
  try {
    const res = await fetch(`/memory/api/memories/${selectedMemoryId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    deleteModal.classList.add("hidden");
    await loadMemories();
  } catch (err) {
    console.error(err);
    alert("Failed to delete");
  }
}

async function loadMemories() {
  try {
    const res = await fetch(`/memory/api/memories?nocache=${Date.now()}`, { credentials: "include" });
    if (!res.ok) throw new Error("Load failed");
    const data = await res.json();
    currentMemories = data.memories || [];
    grid.innerHTML = currentMemories.map((memory) => createCard(memory)).join("");
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<div class="no-memories">Failed to load memories</div>';
  }
}

function createCard(memory) {
  const title = memory.title || "Memory";
  const initials = title
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  let mediaMarkup = `<div class="memory-image">${initials}</div>`;
  if (memory.imageUrl) {
    mediaMarkup = `<div class="memory-image has-image" style="background-image:url('${escapeAttribute(memory.imageUrl)}')"></div>`;
  } else if (memory.videoUrl) {
    mediaMarkup = `
      <div class="memory-image has-video" onclick="event.stopPropagation()">
        <video controls preload="metadata">
          <source src="${escapeAttribute(memory.videoUrl)}" />
        </video>
      </div>
    `;
  }

  return `
    <div class="memory-item" data-id="${memory._id}">
      ${mediaMarkup}
      <div class="memory-content">
        <div class="memory-header">
          <h3 class="memory-title">${escapeHtml(title)}</h3>
          <div class="memory-actions">
            <button class="secondary-btn edit-btn" data-id="${memory._id}">Edit</button>
            <button class="secondary-btn delete-btn" data-id="${memory._id}">Delete</button>
          </div>
        </div>
        ${memory.relation ? `<div class="memory-relation">${escapeHtml(memory.relation)}</div>` : ""}
        ${memory.description ? `<p class="memory-description">${escapeHtml(memory.description)}</p>` : ""}
        ${memory.notes ? `<p class="memory-notes">${escapeHtml(memory.notes)}</p>` : ""}
        ${memory.audioUrl ? `<div class="memory-audio"><audio controls preload="none" src="${escapeAttribute(memory.audioUrl)}"></audio></div>` : ""}
      </div>
    </div>
  `;
}

function updateCardInDOM(memory) {
  const index = currentMemories.findIndex((item) => item._id === memory._id);
  if (index >= 0) {
    currentMemories[index] = memory;
  } else {
    currentMemories.unshift(memory);
  }
  grid.innerHTML = currentMemories.map((item) => createCard(item)).join("");
}

function openMemoryDetailModal(memory) {
  const modalEl = document.getElementById("memoryDetailModal");
  const titleEl = document.getElementById("memoryDetailTitle");
  const metaEl = document.getElementById("memoryDetailMeta");
  const bodyEl = document.getElementById("memoryDetailBody");
  if (!modalEl || !titleEl || !metaEl || !bodyEl) return;

  titleEl.textContent = memory.title || "Memory";
  metaEl.textContent = memory.relation || "Memory details";

  const mediaParts = [];
  if (memory.imageUrl) {
    mediaParts.push(`<div class="memory-detail-media"><img src="${escapeAttribute(memory.imageUrl)}" alt="${escapeAttribute(memory.title || "Memory image")}" /></div>`);
  }
  if (memory.videoUrl) {
    mediaParts.push(`<div class="memory-detail-media"><video controls preload="metadata" src="${escapeAttribute(memory.videoUrl)}"></video></div>`);
  }
  if (memory.audioUrl) {
    mediaParts.push(`<div class="memory-detail-media"><audio controls preload="none" src="${escapeAttribute(memory.audioUrl)}"></audio></div>`);
  }

  bodyEl.innerHTML = `
    <div class="memory-detail-gallery">${mediaParts.join("")}</div>
    <div class="memory-detail-copy">
      ${memory.description ? `<p>${escapeHtml(memory.description)}</p>` : ""}
      ${memory.notes ? `<p>${escapeHtml(memory.notes)}</p>` : ""}
    </div>
  `;

  modalEl.classList.remove("hidden");
}

function closeMemoryDetailModal() {
  const modalEl = document.getElementById("memoryDetailModal");
  const bodyEl = document.getElementById("memoryDetailBody");
  if (bodyEl) bodyEl.innerHTML = "";
  if (modalEl) modalEl.classList.add("hidden");
}

function populateMediaPreview(memory) {
  const img = document.getElementById("previewImage");
  const audio = document.getElementById("previewAudio");
  const video = document.getElementById("previewVideo");

  if (img) {
    img.src = memory.imageUrl || "";
    img.style.display = memory.imageUrl ? "block" : "none";
  }
  if (audio) {
    audio.pause();
    audio.src = memory.audioUrl || "";
    audio.style.display = memory.audioUrl ? "block" : "none";
  }
  if (video) {
    video.pause();
    video.src = memory.videoUrl || "";
    video.style.display = memory.videoUrl ? "block" : "none";
  }
}

function resetMediaPreview() {
  populateMediaPreview({});
}

function previewSelectedFile(input, type) {
  const file = input?.files?.[0];
  if (!file) {
    resetSinglePreview(type);
    return;
  }

  const previewUrl = URL.createObjectURL(file);
  if (type === "image") {
    const img = document.getElementById("previewImage");
    if (img) {
      img.src = previewUrl;
      img.style.display = "block";
    }
  }
  if (type === "audio") {
    const audio = document.getElementById("previewAudio");
    if (audio) {
      audio.src = previewUrl;
      audio.style.display = "block";
    }
  }
  if (type === "video") {
    const video = document.getElementById("previewVideo");
    if (video) {
      video.src = previewUrl;
      video.style.display = "block";
    }
  }
}

function setVisualMediaChoice(type) {
  const target = type === "video" ? "video" : "image";
  const radio = document.querySelector(`input[name="visualMediaType"][value="${target}"]`);
  if (radio) {
    radio.checked = true;
  }
  applyVisualMediaSelection(target);
}

function applyVisualMediaSelection(type) {
  const imageWrap = document.querySelector('[data-visual-upload="image"]');
  const videoWrap = document.querySelector('[data-visual-upload="video"]');
  const audioWrap = document.querySelector("[data-audio-upload]");
  const imageInput = document.getElementById("memoryImage");
  const audioInput = document.getElementById("memoryAudio");
  const videoInput = document.getElementById("memoryVideo");

  if (imageWrap) {
    imageWrap.classList.toggle("hidden", type !== "image");
  }
  if (videoWrap) {
    videoWrap.classList.toggle("hidden", type !== "video");
  }
  if (audioWrap) {
    audioWrap.classList.toggle("hidden", type === "video");
  }

  if (type === "image" && videoInput) {
    videoInput.value = "";
    resetSinglePreview("video");
  }

  if (type === "video" && imageInput) {
    imageInput.value = "";
    resetSinglePreview("image");
  }

  if (type === "video" && audioInput) {
    audioInput.value = "";
    resetSinglePreview("audio");
  }

  if (audioInput) {
    audioInput.disabled = type === "video";
  }
}

function resetSinglePreview(type) {
  if (type === "image") {
    const img = document.getElementById("previewImage");
    if (img) {
      img.src = "";
      img.style.display = "none";
    }
  }
  if (type === "audio") {
    const audio = document.getElementById("previewAudio");
    if (audio) {
      audio.pause();
      audio.src = "";
      audio.style.display = "none";
    }
  }
  if (type === "video") {
    const video = document.getElementById("previewVideo");
    if (video) {
      video.pause();
      video.src = "";
      video.style.display = "none";
    }
  }
}

function setSaveState(saving) {
  isSaving = saving;
  if (!saveBtn) return;
  saveBtn.disabled = saving;
  saveBtn.textContent = saving ? "Saving..." : "Save";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function escapeAttribute(text) {
  return escapeHtml(text || "");
}

window.openAddModal = openAddModal;
window.closeMemoryModal = closeMemoryModal;
window.closeDeleteModal = closeDeleteModal;
window.closeMemoryDetailModal = closeMemoryDetailModal;
