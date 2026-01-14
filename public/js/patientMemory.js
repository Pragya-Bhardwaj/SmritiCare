/**
 * patientMemory.js
 * Memory board view-only functionality for patients
 */

// State management
let currentMemories = [];
let currentCategory = "All";
let currentSearch = "";

/* ================= INITIALIZATION ================= */

document.addEventListener("DOMContentLoaded", () => {
  initializeMemoryBoard();
  setupEventListeners();
});

function initializeMemoryBoard() {
  loadMemories();
}

/* ================= EVENT LISTENERS ================= */

function setupEventListeners() {
  // No add/edit/delete buttons for patients
  // Only setup viewing and playback functionality
}

/* ================= CATEGORY FILTERS ================= */





/* ================= LOAD MEMORIES ================= */

async function loadMemories() {
  try {
    showLoadingState();
    
    const res = await fetch(`/memory/api/memories`, {
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
        <div class="no-memories-icon">📦</div>
        <p>No memories yet</p>
        <p>Your caregiver will add important memories for you</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = currentMemories.map(memory => createMemoryCard(memory)).join("");
}

function createMemoryCard(memory) {
  const initials = memory.title.split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return `
    <div class="memory-item" data-id="${memory._id}">
      <div class="memory-image ${memory.imageUrl ? 'has-image' : ''}" 
           ${memory.imageUrl ? `style="background-image: url('${memory.imageUrl}')"` : ''}>
        ${!memory.imageUrl ? initials : ''}
      </div>
      
      <div class="memory-content">
        <h3 class="memory-title">${escapeHtml(memory.title)}</h3>
        
        ${memory.relation ? `
          <span class="memory-relation">${escapeHtml(memory.relation)}</span>
        ` : ''}
        
        ${memory.description ? `
          <p class="memory-description">${escapeHtml(memory.description)}</p>
        ` : ''}
        
        ${memory.notes ? `
          <p class="memory-notes">Note: ${escapeHtml(memory.notes)}</p>
        ` : ''}
        

        
        ${memory.audioUrl ? `
          <div class="memory-audio">
            <button class="audio-btn" onclick="playAudio('${memory.audioUrl}')">
              <span>▶</span> Play Audio
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/* ================= AUDIO PLAYBACK ================= */

function playAudio(url) {
  const audio = new Audio(url);
  audio.play().catch(err => {
    console.error("Audio playback failed:", err);
    alert("Could not play audio. Please check your browser settings.");
  });
}

/* ================= UTILITY FUNCTIONS ================= */

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  console.error("❌", message);
  const grid = document.getElementById("memoryGrid");
  if (grid) {
    grid.innerHTML = `
      <div class="no-memories">
        <div class="no-memories-icon">⚠️</div>
        <p>${message}</p>
      </div>
    `;
  }
}

// Expose function to global scope
window.playAudio = playAudio;