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
    <div class="dashboard-reminders-head">
      <div class="dashboard-reminders-copy">
        <p class="patient-card-kicker">Daily routine</p>
        <h2 class="section-title">Today's Reminders</h2>
        <p>Keep track of your day with a clear view of your scheduled reminders.</p>
      </div>
      <a href="/patient/reminders" class="secondary-btn dashboard-reminders-link patient-dashboard-btn patient-dashboard-btn--soft">
        <span class="patient-btn-label">Open reminders</span>
        <span class="patient-btn-icon" aria-hidden="true">-&gt;</span>
      </a>
    </div>
    <div class="dashboard-reminders-list">
      ${reminders.length === 0 ? '<div class="reminders-empty">No reminders for today</div>' : reminders.map(rem => `
        <div class="reminder-item">
          <div class="reminder-time">${formatTime(rem.schedule)}</div>
          <div class="reminder-copy">
            <strong>${escapeHtml(rem.message || "Reminder")}</strong>
            <span>${escapeHtml(formatFrequency(rem.frequency))}</span>
          </div>
          <span class="reminder-frequency">${escapeHtml(formatFrequency(rem.frequency))}</span>
        </div>
      `).join("")}
    </div>
  `;

  const mount = document.getElementById("dashboardReminderMount");
  if (mount) {
    mount.replaceChildren(container);
    return;
  }

  // Fallback for older markup
  const main = document.querySelector(".main");
  const welcome = main && main.querySelector(".welcome");
  if (welcome) {
    welcome.insertAdjacentElement("afterend", container);
  }
}

function formatTime(time) {
  if (!time) return "--:--";
  const parts = time.split(":");
  if (parts.length !== 2) return time;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return time;
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = (h % 12) === 0 ? 12 : (h % 12);
  return `${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatFrequency(frequency) {
  if (!frequency) return "Routine";

  return String(frequency)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
