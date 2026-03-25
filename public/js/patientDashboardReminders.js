// patientDashboardReminders.js
// Loads reminders for patient dashboard and displays them

document.addEventListener("DOMContentLoaded", async () => {
  await loadPatientReminders();
});

async function loadPatientReminders() {
  try {
    const res = await fetch("/reminder/api/reminders", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    const reminders = data.reminders || [];
    renderPatientDashboardReminders(reminders);
  } catch (err) {
    // Optionally show error
  }
}

function renderPatientDashboardReminders(reminders) {
  const container = document.createElement("section");
  container.className = "card reminders-card";
  container.innerHTML = `
    <h2 class="section-title">Today's Reminders</h2>
    <div class="dashboard-reminders-list">
      ${reminders.length === 0 ? '<div style="color:#999;padding:20px;">No reminders for today</div>' : reminders.map(rem => `
        <div class="reminder-item">
          <strong>${escapeHtml(rem.message)}</strong>
          <span>${formatTime(rem.schedule)} • ${rem.frequency}</span>
        </div>
      `).join('')}
    </div>
  `;
  // Insert after welcome section
  const main = document.querySelector(".main");
  const welcome = main.querySelector(".welcome");
  if (welcome) welcome.insertAdjacentElement("afterend", container);
}

function formatTime(time) {
  if (!time) return "--:--";
  const parts = time.split(":");
  if (parts.length !== 2) return time;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return time;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hh = ((h % 12) === 0) ? 12 : (h % 12);
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
