// Show/hide extra fields based on frequency (global scope for modal)
function handleFrequencyChange() {
  const freq = document.getElementById("reminderClassification").value;
  document.getElementById("weeklyOptions").style.display = freq === "Weekly" ? "block" : "none";
  document.getElementById("monthlyOptions").style.display = freq === "Monthly" ? "block" : "none";
  document.getElementById("yearlyOptions").style.display = freq === "Yearly" ? "block" : "none";
  document.getElementById("onceOptions").style.display = freq === "Once" ? "block" : "none";
}
// public/js/caregiverReminders.js
let selectedReminderId = null;
let isEdit = false;
let allReminders = [];
const MISSED_GRACE_MINUTES = 30;
const BROWSER_NOTIFICATION_CHECK_MS = 30 * 1000;
let browserNotificationTimer = null;
let isSavingReminder = false;

/* INITIALIZATION */
document.addEventListener("DOMContentLoaded", async () => {
  await initializeBrowserNotifications();
  await loadReminders();
  startBrowserNotificationWatcher();
  checkGoogleCalendarStatus();
  handleCalendarUrlParams();
  setupGoogleCalendarToggle();
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

function setupGoogleCalendarToggle() {
  const actionDiv = document.getElementById("gcalAction");
  if (!actionDiv) return;

  actionDiv.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-gcal-action]");
    if (!actionButton) return;

    const action = actionButton.getAttribute("data-gcal-action");

    if (action === "connect") {
      window.location.href = "/auth/google/connect";
      return;
    }

    if (action === "disconnect") {
      actionButton.disabled = true;
      try {
        const res = await fetch("/reminder/api/reminders/calendar/disconnect", {
          method: "POST",
          credentials: "include"
        });
        const data = await res.json();

        if (data.success) {
          showToast("Google Calendar disconnected.", "success");
          checkGoogleCalendarStatus();
        } else {
          showToast(data.message || "Failed to disconnect Google Calendar.", "error");
        }
      } catch (err) {
        showToast("Error disconnecting Google Calendar.", "error");
      } finally {
        actionButton.disabled = false;
      }
    }
  });
}

function renderGcalBanner(isConnected) {
  const actionDiv  = document.getElementById("gcalAction");
  const statusText = document.getElementById("gcalStatusText");
  if (!actionDiv) return;

  if (isConnected) {
    statusText.textContent = "Reminders are syncing to your Google Calendar automatically";
    actionDiv.innerHTML = `
      <button type="button" class="gcal-connect-btn is-disconnect" data-gcal-action="disconnect">
        Unsync Google Calendar
      </button>`;
  } else {
    statusText.textContent = "Connect once to auto-sync all reminders to your Google Calendar";
    actionDiv.innerHTML = `
      <button type="button" class="gcal-connect-btn" data-gcal-action="connect">
        Sync Google Calendar
      </button>`;
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
/* BROWSER NOTIFICATIONS */
async function initializeBrowserNotifications() {
  if (!("Notification" in window)) {
    return;
  }

  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch (err) {
      console.error("Notification permission request failed:", err);
    }
  }
}

function startBrowserNotificationWatcher() {
  if (!("Notification" in window)) return;

  if (browserNotificationTimer) {
    clearInterval(browserNotificationTimer);
  }

  browserNotificationTimer = setInterval(
    checkReminderNotifications,
    BROWSER_NOTIFICATION_CHECK_MS
  );

  checkReminderNotifications();
}

function checkReminderNotifications() {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dueDateKey = toDateKey(now);
  const missedRef = new Date(now.getTime() - MISSED_GRACE_MINUTES * 60 * 1000);
  const missedDateKey = toDateKey(missedRef);

  for (const reminder of allReminders) {
    if (reminder.isCompleted) continue;

    const reminderMinutes = parseMinutes(reminder.schedule);
    if (reminderMinutes === null) continue;

    if (currentMinutes === reminderMinutes) {
      const dueKey = `smriticare:cg:notify:due:${reminder._id}:${dueDateKey}:${reminder.schedule}`;
      if (!hasLocalNotificationKey(dueKey)) {
        showBrowserNotification(
          "Reminder Time",
          `${reminder.message} at ${formatTime(reminder.schedule)}`,
          `cg-due-${reminder._id}-${dueDateKey}`
        );
        setLocalNotificationKey(dueKey);
      }
    }

    if (reminder.category === "Medicine") {
      const missedAtMinutes = (reminderMinutes + MISSED_GRACE_MINUTES) % (24 * 60);
      if (currentMinutes === missedAtMinutes) {
        const missedKey = `smriticare:cg:notify:missed:${reminder._id}:${missedDateKey}:${reminder.schedule}`;
        if (!hasLocalNotificationKey(missedKey)) {
          showBrowserNotification(
            "Medication Missed",
            `${reminder.message} appears to be missed.`,
            `cg-missed-${reminder._id}-${missedDateKey}`
          );
          setLocalNotificationKey(missedKey);
        }
      }
    }
  }
}

function showBrowserNotification(title, body, tag) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const notification = new Notification(title, {
      body,
      tag
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (err) {
    console.error("Browser notification failed:", err);
  }
}

function hasLocalNotificationKey(key) {
  try {
    return localStorage.getItem(key) === "1";
  } catch (err) {
    return false;
  }
}

function setLocalNotificationKey(key) {
  try {
    localStorage.setItem(key, "1");
  } catch (err) {
    // Ignore storage errors.
  }
}

function parseMinutes(hhmm) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [hRaw, mRaw] = hhmm.split(':');
  const h = parseInt(hRaw, 10);
  const m = parseInt(mRaw, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* RENDER REMINDERS ON PAGE */
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

  // Reset all extra fields
  document.getElementById("weeklyOptions").style.display = "none";
  document.getElementById("monthlyOptions").style.display = "none";
  document.getElementById("yearlyOptions").style.display = "none";
  document.getElementById("onceOptions").style.display = "none";
  document.getElementById("reminderWeekDay").value = "Monday";
  document.getElementById("reminderMonthDate").value = "";
  document.getElementById("reminderYearMonth").value = "01";
  document.getElementById("reminderYearDate").value = "1";
  document.getElementById("reminderOnceDate").value = "";

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

  // Show/hide extra fields based on frequency
  handleFrequencyChange();
  // Set extra fields if present (for edit)
  if (reminder.frequency === "Weekly" && reminder.weekDay) {
    document.getElementById("reminderWeekDay").value = reminder.weekDay;
  }
  if (reminder.frequency === "Monthly" && reminder.monthDate) {
    document.getElementById("reminderMonthDate").value = reminder.monthDate;
  }
  if (reminder.frequency === "Yearly" && reminder.yearMonth && reminder.yearDate) {
    document.getElementById("reminderYearMonth").value = reminder.yearMonth;
    document.getElementById("reminderYearDate").value = reminder.yearDate;
  }
  if (reminder.frequency === "Once" && reminder.onceDate) {
    document.getElementById("reminderOnceDate").value = reminder.onceDate;
  }

  document.getElementById("reminderModal").classList.remove("hidden");
// Show/hide extra fields based on frequency
function handleFrequencyChange() {
  const freq = document.getElementById("reminderClassification").value;
  document.getElementById("weeklyOptions").style.display = freq === "Weekly" ? "block" : "none";
  document.getElementById("monthlyOptions").style.display = freq === "Monthly" ? "block" : "none";
  document.getElementById("yearlyOptions").style.display = freq === "Yearly" ? "block" : "none";
  document.getElementById("onceOptions").style.display = freq === "Once" ? "block" : "none";
}
}

function openDeleteModal(reminderId) {
  selectedReminderId = reminderId;
  document.getElementById("deleteModal").classList.remove("hidden");
}

function closeReminderModal() {
  document.getElementById("reminderModal").classList.add("hidden");
  setReminderSavingState(false);
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.add("hidden");
}

/* ─────────────────────────────────────────
   SAVE REMINDER (ADD / EDIT)
───────────────────────────────────────── */
async function saveReminder() {
  if (isSavingReminder) return;

  const title      = document.getElementById("reminderTitle").value.trim();
  const hour       = document.getElementById('reminderHour').value;
  const minute     = document.getElementById('reminderMinute').value;
  const ampm       = document.getElementById('reminderAmPm').value;
  const frequency  = document.getElementById('reminderClassification').value;
  const category   = document.getElementById('reminderType').value;

  // Extra fields
  const weekDay    = document.getElementById("reminderWeekDay").value;
  const monthDate  = document.getElementById("reminderMonthDate").value;
  const yearMonth  = document.getElementById("reminderYearMonth").value;
  const yearDate   = document.getElementById("reminderYearDate").value;
  const onceDate   = document.getElementById("reminderOnceDate").value;

  if (!title) {
    alert("Please enter reminder title");
    return;
  }

  // Convert 12-hour to 24-hour
  let hh = parseInt(hour, 10);
  if (ampm === 'PM' && hh !== 12) hh += 12;
  if (ampm === 'AM' && hh === 12) hh = 0;
  const schedule = `${String(hh).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  // Build payload
  const payload = { message: title, schedule, frequency, category };
  if (frequency === "Weekly") payload.weekDay = weekDay;
  if (frequency === "Monthly") payload.monthDate = monthDate;
  if (frequency === "Yearly") {
    payload.yearMonth = yearMonth;
    payload.yearDate = yearDate;
  }
  if (frequency === "Once") payload.onceDate = onceDate;

  isSavingReminder = true;
  setReminderSavingState(true);

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
  } finally {
    isSavingReminder = false;
    setReminderSavingState(false);
  }
}

function setReminderSavingState(isSaving) {
  const saveBtn = document.getElementById("saveReminderBtn");
  if (!saveBtn) return;

  saveBtn.disabled = isSaving;
  saveBtn.textContent = isSaving ? "Saving..." : "Save";
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
