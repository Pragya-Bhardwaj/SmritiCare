document.addEventListener("DOMContentLoaded", () => {
  loadPatientTips();
});

async function loadPatientTips() {
  const grid = document.getElementById("patientTipsGrid");
  if (!grid) return;

  try {
    const res = await fetch("/selfcare/api/patient-tips", {
      credentials: "include"
    });

    const data = await safeJson(res);
    if (!res.ok) {
      grid.innerHTML = `
        <div class="card" style="text-align: center; color: #94a3b8;">
          <p>Unable to load tips right now.</p>
        </div>
      `;
      return;
    }

    const tips = data.tips || [];
    if (!tips.length) {
      grid.innerHTML = `
        <div class="card" style="text-align: center; color: #94a3b8;">
          <p>No tips added yet.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = tips.map((tip) => `
      <article class="card tip-card">
        <h3>${escapeHtml(tip.title)}</h3>
        <p>${escapeHtml(tip.description)}</p>
        <p class="small tip-meta">${escapeHtml(tip.category || "General")} - ${formatDate(tip.createdAt)}</p>
      </article>
    `).join("");
  } catch (err) {
    console.error("Failed to load self-care tips:", err);
    grid.innerHTML = `
      <div class="card" style="text-align: center; color: #94a3b8;">
        <p>Unable to load tips right now.</p>
      </div>
    `;
  }
}

function formatDate(dateValue) {
  if (!dateValue) return "Just now";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleDateString();
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch (err) {
    return {};
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}
