// public/js/patientReminders.js
let allReminders = [];
let currentCategory = "All";
const MISSED_GRACE_MINUTES = 30;
const BROWSER_NOTIFICATION_CHECK_MS = 30 * 1000;
let browserNotificationTimer = null;

/* INITIALIZATION */
document.addEventListener('DOMContentLoaded', async () => {
  await initializeBrowserNotifications();
  await loadReminders();
  setupCategoryTabs();
  startBrowserNotificationWatcher();
  checkGoogleCalendarStatus();
  handleCalendarUrlParams();
// Google Calendar banner logic (same as caregiver)
function handleCalendarUrlParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("calendarConnected") === "true") {
    showToast("✅ Google Calendar connected! Reminders will now sync automatically.", "success");
    window.history.replaceState({}, "", window.location.pathname);
  }
  if (params.get("calendarError") === "true") {
    showToast("❌ Failed to connect Google Calendar. Please try again.", "error");
    window.history.replaceState({}, "", window.location.pathname);
  }
}

async function checkGoogleCalendarStatus() {
  try {
    const res = await fetch("/auth/google/status", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    renderGcalBanner(data.googleCalendarConnected);
  } catch (err) {
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
      <a href="/auth/google/connect?target=patient" class="gcal-connect-btn">
        <svg width="16" height="16" viewBox="0 0 48 48">
          <path fill="#4285F4" d="M43.6 20H24v8h11.3C33.5 32.5 29.2 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.8l5.7-5.7C33.8 7.1 29.1 5 24 5 13.5 5 5 13.5 5 24s8.5 19 19 19c10.9 0 18.5-7.6 18.5-18.5 0-1.2-.1-2.4-.4-3.5z"/>
        </svg>
        Connect Google Calendar
      </a>`;
  }
}

function showToast(message, type = "success") {
  const toast = document.querySelector(".gcal-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `gcal-toast ${type} show`;
  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}
});

/* LOAD REMINDERS FROM SERVER */
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
  }
}

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
      const dueKey = `smriticare:notify:due:${reminder._id}:${dueDateKey}:${reminder.schedule}`;
      if (!hasLocalNotificationKey(dueKey)) {
        showBrowserNotification(
          "Reminder Time",
          `${reminder.message} at ${formatTime(reminder.schedule)}`,
          `due-${reminder._id}-${dueDateKey}`
        );
        setLocalNotificationKey(dueKey);
      }
    }

    if (reminder.category === "Medicine") {
      const missedAtMinutes = (reminderMinutes + MISSED_GRACE_MINUTES) % (24 * 60);
      if (currentMinutes === missedAtMinutes) {
        const missedKey = `smriticare:notify:missed:${reminder._id}:${missedDateKey}:${reminder.schedule}`;
        if (!hasLocalNotificationKey(missedKey)) {
          showBrowserNotification(
            "Medication Missed",
            `${reminder.message} appears to be missed.`,
            `missed-${reminder._id}-${missedDateKey}`
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

/* RENDER REMINDERS */
function renderReminders() {
  const list = document.getElementById('remindersList');
  if (!list) return;

  // Filter by category if needed
  let filtered = allReminders;
  if (currentCategory !== 'All') {
    filtered = allReminders.filter(r => r.category === currentCategory);
  }

  // Segregate reminders by category
  const categories = ['Medicine', 'Meal', 'Appointment', 'Hygiene', 'Other'];
  let html = '';
  if (currentCategory === 'All') {
    categories.forEach(cat => {
      const catReminders = allReminders.filter(r => r.category === cat);
      if (catReminders.length > 0) {
        html += `<div class="reminder-category-title">${cat}</div>`;
        html += catReminders.map(reminder => `
          <div class="card reminder-card ${reminder.isCompleted ? 'done' : ''}" data-id="${reminder._id}" data-status="${reminder.isCompleted ? 'done' : 'pending'}">
            <div class="reminder-content">
              <h3>${escapeHtml(reminder.message)}</h3>
              <p>${formatTime(reminder.schedule)} • ${reminder.frequency}</p>
            </div>
          </div>
        `).join('');
      }
    });
    if (!html) {
      html = `<div class="card" style="text-align: center; padding: 40px; color: #999;"><p>No reminders yet</p></div>`;
    }
  } else {
    if (filtered.length === 0) {
      html = `<div class="card" style="text-align: center; padding: 40px; color: #999;"><p>No reminders yet</p></div>`;
    } else {
      html = filtered.map(reminder => `
        <div class="card reminder-card ${reminder.isCompleted ? 'done' : ''}" data-id="${reminder._id}" data-status="${reminder.isCompleted ? 'done' : 'pending'}">
          <div class="reminder-content">
            <h3>${escapeHtml(reminder.message)}</h3>
            <p>${formatTime(reminder.schedule)} • ${reminder.frequency}</p>
          </div>
        </div>
      `).join('');
    }
  }
  list.innerHTML = html;
// Setup sync button for patient
function setupSyncButton() {
  const btn = document.getElementById('syncCalendarBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Syncing...';
    try {
      // Call backend to trigger calendar sync for patient
      const res = await fetch('/reminder/api/reminders/calendar/auth-url', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to get calendar auth URL');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Unable to sync calendar.');
      }
    } catch (err) {
      alert('Sync failed.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sync Google Calendar';
    }
  });
}

}

/* SETUP CATEGORY TABS */
function setupCategoryTabs() {
  const tabs = document.querySelectorAll('.filter-tabs .tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Update current category and re-render
      currentCategory = tab.textContent.trim();
      renderReminders();
    });
  });
}

/* UTILITY FUNCTIONS */
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
