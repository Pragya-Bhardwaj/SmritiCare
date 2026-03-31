/**
 * patientDashboard.js
 * Handles loading patient name and memory board on dashboard
 */

// Load patient name and memories when page loads
document.addEventListener("DOMContentLoaded", async () => {
  setDashboardDate();
  await loadPatientName();
  await loadMemories();
});

/* Load and display patient's name */
async function loadPatientName() {
  try {
    const res = await fetch("/api/profile", {
      credentials: "include"
    });

    if (!res.ok) {
      console.warn("Failed to fetch profile");
      return;
    }

    const data = await res.json();

    if (data.user && data.user.name) {
      // Display the patient's name in the topbar
      const patientP = document.getElementById("patientName");
      if (patientP) patientP.textContent = data.user.name;

      // Ensure the strong title remains 'Patient'
      const strongEl = document.querySelector(".user div strong");
      if (strongEl) strongEl.textContent = "Patient";
    }
  } catch (err) {
    console.error("Error loading patient name:", err);
  }
}

/* Load and display memory board (first 3 memories) */
async function loadMemories() {
  try {
    const res = await fetch("/memory/api/memories", {
      credentials: "include"
    });

    if (!res.ok) {
      throw new Error("Failed to fetch memories");
    }

    const data = await res.json();
    const memories = data.memories || [];

    const grid = document.getElementById("memoryGrid");

    // Show message if no memories exist
    if (!memories.length) {
      grid.innerHTML = `
        <div class="no-memories">
          <div class="no-memories-icon">&#128230;</div>
          <p>No memories added yet</p>
          <p style="font-size: 12px; margin-top: 8px;">Your caregiver will add important memories for you</p>
        </div>
      `;
      return;
    }

    // Show only first 3 memories on dashboard
    const displayMemories = memories.slice(0, 3);

    grid.innerHTML = displayMemories.map((memory) => {
      const title = (memory.title || "Memory").trim();

      // Create initials from title if no image
      const initials = title.split(/\s+/)
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "SC";

      return `
        <div class="memory-item" onclick="window.location.href='/patient/memory'">
          <div class="memory-image ${memory.imageUrl ? "has-image" : ""}"
               ${memory.imageUrl ? `style="background-image: url('${memory.imageUrl}')"` : ""}>
            ${!memory.imageUrl ? initials : ""}
          </div>
          <div class="memory-content">
            <div class="dashboard-memory-meta">
              <span class="memory-chip">Memory</span>
              <span class="memory-cta">Open board</span>
            </div>
            <h3 class="memory-title">${escapeHtml(title)}</h3>
            ${memory.description ? `
              <p class="memory-description">${escapeHtml(memory.description)}</p>
            ` : ""}

            <div class="memory-footer">
              <span class="memory-cta">${memory.audioUrl ? "Audio available" : "Tap to revisit"}</span>
              ${memory.audioUrl ? `
                <button class="audio-btn" onclick="event.stopPropagation(); playAudio('${memory.audioUrl}')">
                  <span>&#9654;</span> Play Audio
                </button>
              ` : ""}
            </div>
          </div>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("Error loading memories:", err);
    document.getElementById("memoryGrid").innerHTML = `
      <div class="no-memories">
        <div class="no-memories-icon">&#9888;</div>
        <p>Failed to load memories</p>
        <p style="font-size: 12px; margin-top: 8px;">Please try refreshing the page</p>
      </div>
    `;
  }
}

/**
 * Play audio from memory
 * @param {string} url - Audio file URL
 */
function playAudio(url) {
  const audio = new Audio(url);
  audio.play().catch((err) => {
    console.error("Audio playback failed:", err);
    alert("Could not play audio. Please check your browser settings.");
  });
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} - Escaped HTML
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function setDashboardDate() {
  const dateEl = document.getElementById("dashboardDate");
  if (!dateEl) return;

  const today = new Date();
  const formatted = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  dateEl.textContent = formatted;
}
