// public/js/caregiverReminders.js
let selectedReminderId = null;
let isEdit = false;
let allReminders = [];

/* INITIALIZATION */
document.addEventListener("DOMContentLoaded", () => {
  loadReminders();
  checkGoogleCalendarStatus();
  handleCalendarUrlParams();
});

/* ─────────────────────────────────────────
   GOOGLE CALENDAR STATUS
───────────────────────────────────────── */

// Check if the URL has ?calendarConnected=true or ?calendarError=true
// (Google redirects back here after OAuth)
function handleCalendarUrlParams() {
  const params = new URLSearchParams(window.location.search);

  if (params.get("calendarConnected") === "true") {
    showToast("✅ Google Calendar connected! Reminders will now sync automatically.", "success");
    // Clean the URL
    window.history.replaceState({}, "", window.location.pathname);
  }

  if (params.get("calendarError") === "true") {
    showToast("❌ Failed to connect Google Calendar. Please try again.", "error");
    window.history.replaceState({}, "", window.location.pathname);
  }
}

// Ask the server whether this caregiver has connected Google Calendar
async function checkGoogleCalendarStatus() {
  try {
    const res = await fetch("/auth/google/status", { credentials: "include" });
    if (!res.ok) return;

    const data = await res.json();
    renderGcalBanner(data.googleCalendarConnected);

  } catch (err) {
    console.error("Could not check Google Calendar status:", err);
    renderGcalBanner(false);
  }
}

function renderGcalBanner(isConnected) {
  const actionDiv  = document.getElementById("gcalAction");
  const statusText = document.getElementById("gcalStatusText");
  if (!actionDiv) return;

  if (isConnected) {
    statusText.textContent = "Reminders are syncing to your Google Calendar automatically";
    actionDiv.innerHTML = `
      <span class="gcal-connected-badge">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="10" fill="#22c55e"/>
          <path d="M6 10l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Connected
      </span>`;
  } else {
    statusText.textContent = "Connect once to auto-sync all reminders to your Google Calendar";
    actionDiv.innerHTML = `
      <a href="/auth/google/connect" class="gcal-connect-btn">
        <svg width="16" height="16" viewBox="0 0 48 48">
          <path fill="#4285F4" d="M43.6 20H24v8h11.3C33.5 32.5 29.2 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.8l5.7-5.7C33.8 7.1 29.1 5 24 5 13.5 5 5 13.5 5 24s8.5 19 19 19c10.9 0 18.5-7.6 18.5-18.5 0-1.2-.1-2.4-.4-3.5z"/>
        </svg>
        Connect Google Calendar
      </a>`;
  }
}

/* ─────────────────────────────────────────
   TOAST NOTIFICATION
───────────────────────────────────────── */
function showToast(message, type = "success") {
  const toast = document.getElementById("gcalToast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = `gcal-toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

/* ─────────────────────────────────────────
   LOAD REMINDERS FROM SERVER
───────────────────────────────────────── */
async function loadReminders() {
  try {
    const res = await fetch("/reminder/api/reminders", { 
      credentials: "include" 
    });

    if (!res.ok) {
      console.error("Failed to load reminders:", res.status);
      return;
    }

    const data = await res.json();
    allReminders = data.reminders || [];
    renderReminders();

  } catch (err) {
    console.error("Load reminders error:", err);
    alert("Failed to load reminders");
  }
}

/* ─────────────────────────────────────────
   RENDER REMINDERS ON PAGE
───────────────────────────────────────── */
function renderReminders() {
  const list = document.getElementById("reminderList");
  if (!list) return;

  if (allReminders.length === 0) {
    list.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px; color: #999;">
        <p>No reminders yet. Add one to get started!</p>
      </div>
    `;
    return;
  }

  list.innerHTML = allReminders.map(reminder => {
    // Show a small calendar icon on the card if it was synced to Google Calendar
    const synced = reminder.googleCalendarEventIds &&
      (reminder.googleCalendarEventIds.caregiver || reminder.googleCalendarEventIds.patient);

    return `
      <div class="card reminder-card" data-id="${reminder._id}">
        <div>
          <strong class="title">${escapeHtml(reminder.message)}</strong>
          <p class="small time" data-time="${reminder.schedule}">${formatTime(reminder.schedule)}</p>
          <p class="small meta">
            <span class="classification">${reminder.frequency}</span> • 
            <span class="rtype">${reminder.category}</span>
            ${synced ? '<span style="color:#4285F4; margin-left:6px; font-size:11px;">📅 Synced</span>' : ''}
          </p>
        </div>

        <span class="status ${reminder.isCompleted ? 'done' : 'pending'}">${reminder.isCompleted ? 'Done' : 'Pending'}</span>

        <div class="actions">
          <button class="edit-btn" onclick="openEditModal('${reminder._id}')">Edit</button>
          <button class="delete-btn" onclick="openDeleteModal('${reminder._id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

/* ─────────────────────────────────────────
   MODAL FUNCTIONS
───────────────────────────────────────── */

function openAddModal() {
  isEdit = false;
  selectedReminderId = null;

  document.getElementById("modalTitle").innerText = "Add Reminder";
  document.getElementById("reminderTitle").value = "";
  document.getElementById('reminderHour').value = '09';
  document.getElementById('reminderMinute').value = '00';
  document.getElementById('reminderAmPm').value = 'AM';
  document.getElementById("reminderClassification").value = "Daily";
  document.getElementById("reminderType").value = "Medicine";

  document.getElementById("reminderModal").classList.remove("hidden");
}

function openEditModal(reminderId) {
  isEdit = true;
  selectedReminderId = reminderId;

  const reminder = allReminders.find(r => r._id === reminderId);
  if (!reminder) return alert("Reminder not found");

  document.getElementById("modalTitle").innerText = "Edit Reminder";
  document.getElementById("reminderTitle").value = reminder.message;

  const timeParts = reminder.schedule.split(':');
  let hh = parseInt(timeParts[0], 10);
  const mm = timeParts[1] || '00';
  let ampm = 'AM';
  if (hh >= 12) { ampm = 'PM'; if (hh > 12) hh = hh - 12; }
  if (hh === 0) hh = 12;

  document.getElementById('reminderHour').value = String(hh).padStart(2, '0');
  document.getElementById('reminderMinute').value = mm;
  document.getElementById('reminderAmPm').value = ampm;
  document.getElementById("reminderClassification").value = reminder.frequency || "Daily";
  document.getElementById("reminderType").value = reminder.category || "Other";

  document.getElementById("reminderModal").classList.remove("hidden");
}

function openDeleteModal(reminderId) {
  selectedReminderId = reminderId;
  document.getElementById("deleteModal").classList.remove("hidden");
}

function closeReminderModal() {
  document.getElementById("reminderModal").classList.add("hidden");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.add("hidden");
}

/* ─────────────────────────────────────────
   SAVE REMINDER (ADD / EDIT)
───────────────────────────────────────── */
async function saveReminder() {
  const title      = document.getElementById("reminderTitle").value.trim();
  const hour       = document.getElementById('reminderHour').value;
  const minute     = document.getElementById('reminderMinute').value;
  const ampm       = document.getElementById('reminderAmPm').value;
  const frequency  = document.getElementById('reminderClassification').value;
  const category   = document.getElementById('reminderType').value;

  if (!title) {
    alert("Please enter reminder title");
    return;
  }

  // Convert 12-hour to 24-hour
  let hh = parseInt(hour, 10);
  if (ampm === 'PM' && hh !== 12) hh += 12;
  if (ampm === 'AM' && hh === 12) hh = 0;
  const schedule = `${String(hh).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const payload = { message: title, schedule, frequency, category };

  try {
    if (isEdit) {
      const res = await fetch(`/reminder/api/reminders/${selectedReminderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Failed to update reminder");
        return;
      }

      const data = await res.json();
      const idx = allReminders.findIndex(r => r._id === selectedReminderId);
      if (idx >= 0) allReminders[idx] = data.reminder;

      if (data.calendarSynced) showToast("✅ Reminder updated and synced to Google Calendar", "success");

    } else {
      const res = await fetch("/reminder/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Failed to add reminder");
        return;
      }

      const data = await res.json();
      allReminders.push(data.reminder);

      if (data.calendarSynced) showToast("✅ Reminder added and synced to Google Calendar", "success");
    }

    renderReminders();
    closeReminderModal();

  } catch (err) {
    console.error("Save reminder error:", err);
    alert("Failed to save reminder");
  }
}

/* ─────────────────────────────────────────
   DELETE REMINDER
───────────────────────────────────────── */
async function confirmDelete() {
  if (!selectedReminderId) return;

  try {
    const res = await fetch(`/reminder/api/reminders/${selectedReminderId}`, {
      method: "DELETE",
      credentials: "include"
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.message || "Failed to delete reminder");
      return;
    }

    allReminders = allReminders.filter(r => r._id !== selectedReminderId);
    renderReminders();
    closeDeleteModal();

  } catch (err) {
    console.error("Delete reminder error:", err);
    alert("Failed to delete reminder");
  }
}

/* ─────────────────────────────────────────
   UTILITY FUNCTIONS
───────────────────────────────────────── */
function formatTime(time) {
  if (!time) return "--:--";
  const parts = time.split(':');
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