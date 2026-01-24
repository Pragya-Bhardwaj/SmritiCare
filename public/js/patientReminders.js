// public/js/patientReminders.js
let allReminders = [];
let currentCategory = "All";

/* INITIALIZATION */
document.addEventListener('DOMContentLoaded', () => {
  loadReminders();
  setupCategoryTabs();
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

/* RENDER REMINDERS */
function renderReminders() {
  const list = document.querySelector('.reminders-list');
  if (!list) return;

  // Filter by category if needed
  let filtered = allReminders;
  if (currentCategory !== 'All') {
    filtered = allReminders.filter(r => r.category === currentCategory);
  }

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px; color: #999;">
        <p>No reminders yet</p>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map(reminder => `
    <div class="card reminder-card ${reminder.isCompleted ? 'done' : ''}" data-id="${reminder._id}" data-status="${reminder.isCompleted ? 'done' : 'pending'}">
      <div class="reminder-content">
        <h3>${escapeHtml(reminder.message)}</h3>
        <p>${formatTime(reminder.schedule)} • ${reminder.frequency}</p>
      </div>
      <div class="reminder-action">
        <input 
          type="checkbox" 
          class="reminder-toggle" 
          aria-label="Mark as done"
          ${reminder.isCompleted ? 'checked' : ''}
          onchange="toggleReminderStatus('${reminder._id}', this.checked)"
        >
      </div>
    </div>
  `).join('');

  // Re-attach checkbox listeners
  attachCheckboxListeners();
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

/* ATTACH CHECKBOX LISTENERS */
function attachCheckboxListeners() {
  const cards = document.querySelectorAll('.reminder-card');

  cards.forEach(card => {
    const checkbox = card.querySelector('.reminder-toggle');
    if (!checkbox) return;

    // Initialize visual state
    if (checkbox.checked) {
      card.classList.add('done');
    } else {
      card.classList.remove('done');
    }

    // Listener for toggle (handled inline with onchange)
  });
}

/* TOGGLE REMINDER COMPLETION STATUS */
async function toggleReminderStatus(reminderId, isCompleted) {
  try {
    const res = await fetch(`/reminder/api/reminders/${reminderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isCompleted })
    });

    if (!res.ok) {
      const data = await res.json();
      console.error("Failed to update reminder:", data.message);
      
      // Revert the checkbox
      const reminder = allReminders.find(r => r._id === reminderId);
      if (reminder) {
        const checkbox = document.querySelector(`[data-id="${reminderId}"] .reminder-toggle`);
        if (checkbox) checkbox.checked = reminder.isCompleted;
      }
      return;
    }

    const data = await res.json();
    
    // Update in local array
    const idx = allReminders.findIndex(r => r._id === reminderId);
    if (idx >= 0) {
      allReminders[idx] = data.reminder;
    }

    // Update visual state
    const card = document.querySelector(`[data-id="${reminderId}"]`);
    if (card) {
      if (isCompleted) {
        card.classList.add('done');
        card.dataset.status = 'done';
      } else {
        card.classList.remove('done');
        card.dataset.status = 'pending';
      }
    }

    console.log(" Reminder status updated");

  } catch (err) {
    console.error("Toggle reminder error:", err);
    
    // Revert the checkbox on error
    const reminder = allReminders.find(r => r._id === reminderId);
    if (reminder) {
      const checkbox = document.querySelector(`[data-id="${reminderId}"] .reminder-toggle`);
      if (checkbox) checkbox.checked = reminder.isCompleted;
    }
  }
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