// public/js/patientMedication.js

document.addEventListener("DOMContentLoaded", () => {
  loadMedications();
});

async function loadMedications() {
  const container = document.getElementById("medicationRows");
  if (container) {
    container.innerHTML = `
      <div class="table-row">
        <div class="col" style="grid-column: 1 / -1; color: #999;">Loading medications...</div>
      </div>
    `;
  }

  try {
    const res = await fetch("/medication/api/medications", {
      credentials: "include"
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const meds = data.medications || [];
    renderMedications(meds);

  } catch (err) {
    console.error("Failed to load medications:", err);
    if (container) {
      container.innerHTML = `
        <div class="table-row">
          <div class="col" style="grid-column: 1 / -1; color: #999;">Failed to load medications</div>
        </div>
      `;
    }
  }
}

function renderMedications(meds) {
  const container = document.getElementById("medicationRows");
  if (!container) return;

  if (!meds.length) {
    container.innerHTML = `
      <div class="table-row">
        <div class="col" style="grid-column: 1 / -1; color: #999;">No medications yet</div>
      </div>
    `;
    return;
  }

  container.innerHTML = meds.map(m => {
    const time = Array.isArray(m.times) && m.times.length
      ? m.times.map(t => formatTime(t)).join(", ")
      : "--:--";
    return `
      <div class="table-row">
        <div class="col"><strong>${escapeHtml(m.name || "")}</strong></div>
        <div class="col"><span class="badge badge-blue">${escapeHtml(m.dosage || "")}</span></div>
        <div class="col">${time}</div>
        <div class="col">${escapeHtml(m.notes || "-")}</div>
      </div>
    `;
  }).join("");
}

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
