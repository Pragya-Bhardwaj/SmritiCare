/**
 * patientMemory.js
 * Memory board view-only functionality for patients
 */

let currentMemories = [];

document.addEventListener("DOMContentLoaded", () => {
  loadMemories();
  setupEventListeners();
});

function setupEventListeners() {
  const grid = document.getElementById("memoryGrid");
  if (!grid) return;

  grid.addEventListener("click", (event) => {
    const mediaControl = event.target.closest("audio, video");
    if (mediaControl) {
      event.stopPropagation();
      return;
    }

    const card = event.target.closest(".memory-item[data-id]");
    if (!card) return;

    const memory = currentMemories.find((item) => item._id === card.dataset.id);
    if (memory) {
      openMemoryDetailModal(memory);
    }
  });
}

async function loadMemories() {
  try {
    showLoadingState();

    const res = await fetch("/memory/api/memories", {
      credentials: "include"
    });

    if (!res.ok) {
      throw new Error("Failed to fetch memories");
    }

    const data = await res.json();
    currentMemories = data.memories || [];
    renderMemories();
  } catch (err) {
    console.error("Load memories error:", err);
    showError("Failed to load memories. Please refresh the page.");
  }
}

function showLoadingState() {
  const grid = document.getElementById("memoryGrid");
  if (grid) {
    grid.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  }
}

function renderMemories() {
  const grid = document.getElementById("memoryGrid");
  if (!grid) return;

  if (currentMemories.length === 0) {
    grid.innerHTML = `
      <div class="no-memories">
        <div class="no-memories-icon">&#128230;</div>
        <p>No memories yet</p>
        <p>Your caregiver will add important memories for you</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = currentMemories.map((memory) => createMemoryCard(memory)).join("");
}

function createMemoryCard(memory) {
  const title = memory.title || "Memory";
  const initials = title
    .split(" ")
    .map((word) => word[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  let mediaMarkup = `<div class="memory-image">${initials}</div>`;
  if (memory.imageUrl) {
    mediaMarkup = `<div class="memory-image has-image" style="background-image: url('${escapeAttribute(memory.imageUrl)}')"></div>`;
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
        <h3 class="memory-title">${escapeHtml(title)}</h3>
        ${memory.relation ? `<span class="memory-relation">${escapeHtml(memory.relation)}</span>` : ""}
        ${memory.description ? `<p class="memory-description">${escapeHtml(memory.description)}</p>` : ""}
        ${memory.notes ? `<p class="memory-notes">Note: ${escapeHtml(memory.notes)}</p>` : ""}
        ${memory.audioUrl ? `
          <div class="memory-audio">
            <audio controls preload="none" src="${escapeAttribute(memory.audioUrl)}"></audio>
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

function openMemoryDetailModal(memory) {
  const modal = document.getElementById("memoryDetailModal");
  const titleEl = document.getElementById("memoryDetailTitle");
  const metaEl = document.getElementById("memoryDetailMeta");
  const bodyEl = document.getElementById("memoryDetailBody");
  if (!modal || !titleEl || !metaEl || !bodyEl) return;

  titleEl.textContent = memory.title || "Memory";
  metaEl.textContent = memory.relation || "Memory details";

  const mediaParts = [];
  if (memory.imageUrl) {
    mediaParts.push(`
      <div class="memory-detail-media">
        <img src="${escapeAttribute(memory.imageUrl)}" alt="${escapeAttribute(memory.title || "Memory image")}" />
      </div>
    `);
  }
  if (memory.videoUrl) {
    mediaParts.push(`
      <div class="memory-detail-media">
        <video controls preload="metadata" src="${escapeAttribute(memory.videoUrl)}"></video>
      </div>
    `);
  }
  if (memory.audioUrl) {
    mediaParts.push(`
      <div class="memory-detail-media">
        <audio controls preload="none" src="${escapeAttribute(memory.audioUrl)}"></audio>
      </div>
    `);
  }

  bodyEl.innerHTML = `
    <div class="memory-detail-gallery">
      ${mediaParts.join("")}
    </div>
    <div class="memory-detail-copy">
      ${memory.description ? `<p>${escapeHtml(memory.description)}</p>` : ""}
      ${memory.notes ? `<p>${escapeHtml(memory.notes)}</p>` : ""}
    </div>
  `;

  modal.classList.remove("hidden");
}

function closeMemoryDetailModal() {
  const modal = document.getElementById("memoryDetailModal");
  const bodyEl = document.getElementById("memoryDetailBody");
  if (bodyEl) bodyEl.innerHTML = "";
  if (modal) modal.classList.add("hidden");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function escapeAttribute(text) {
  return escapeHtml(text || "");
}

function showError(message) {
  console.error("Memory board error:", message);
  const grid = document.getElementById("memoryGrid");
  if (grid) {
    grid.innerHTML = `
      <div class="no-memories">
        <div class="no-memories-icon">&#9888;</div>
        <p>${message}</p>
      </div>
    `;
  }
}

window.closeMemoryDetailModal = closeMemoryDetailModal;
