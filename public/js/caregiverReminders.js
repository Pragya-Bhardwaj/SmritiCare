// public/js/caregiverReminders.js
let selectedReminderId = null;
let isEdit = false;
let allReminders = [];

/* INITIALIZATION */
document.addEventListener("DOMContentLoaded", () => {
  loadReminders();
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
    alert("Failed to load reminders");
  }
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

  list.innerHTML = allReminders.map(reminder => `
    <div class="card reminder-card" data-id="${reminder._id}">
      <div>
        <strong class="title">${escapeHtml(reminder.message)}</strong>
        <p class="small time" data-time="${reminder.schedule}">${formatTime(reminder.schedule)}</p>
        <p class="small meta"><span class="classification">${reminder.frequency}</span> • <span class="rtype">${reminder.category}</span></p>
      </div>

      <span class="status ${reminder.isCompleted ? 'done' : 'pending'}">${reminder.isCompleted ? 'Done' : 'Pending'}</span>

      <div class="actions">
        <button class="edit-btn" onclick="openEditModal('${reminder._id}')">Edit</button>
        <button class="delete-btn" onclick="openDeleteModal('${reminder._id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

/* OPEN ADD MODAL */
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

/* OPEN EDIT MODAL */
function openEditModal(reminderId) {
  isEdit = true;
  selectedReminderId = reminderId;

  const reminder = allReminders.find(r => r._id === reminderId);
  if (!reminder) return alert("Reminder not found");

  document.getElementById("modalTitle").innerText = "Edit Reminder";
  document.getElementById("reminderTitle").value = reminder.message;

  // Parse time (24-hour to 12-hour)
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

/* OPEN DELETE MODAL */
function openDeleteModal(reminderId) {
  selectedReminderId = reminderId;
  document.getElementById("deleteModal").classList.remove("hidden");
}

/* CLOSE MODALS */
function closeReminderModal() {
  document.getElementById("reminderModal").classList.add("hidden");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.add("hidden");
}

/* SAVE REMINDER (ADD / EDIT) */
async function saveReminder() {
  const title = document.getElementById("reminderTitle").value.trim();
  const hour = document.getElementById('reminderHour').value;
  const minute = document.getElementById('reminderMinute').value;
  const ampm = document.getElementById('reminderAmPm').value;
  const frequency = document.getElementById('reminderClassification').value;
  const category = document.getElementById('reminderType').value;

  if (!title) {
    alert("Please enter reminder title");
    return;
  }

  // Convert 12-hour to 24-hour format
  let hh = parseInt(hour, 10);
  if (ampm === 'PM' && hh !== 12) hh += 12;
  if (ampm === 'AM' && hh === 12) hh = 0;
  const schedule = `${String(hh).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const payload = {
    message: title,
    schedule,
    frequency,
    category
  };

  try {
    if (isEdit) {
      // UPDATE REMINDER
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
      
      // Update in local array
      const idx = allReminders.findIndex(r => r._id === selectedReminderId);
      if (idx >= 0) {
        allReminders[idx] = data.reminder;
      }

      console.log(" Reminder updated successfully");
    } else {
      // ADD REMINDER
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
      console.log(" Reminder added successfully");
    }

    renderReminders();
    closeReminderModal();

  } catch (err) {
    console.error("Save reminder error:", err);
    alert("Failed to save reminder");
  }
}

/* DELETE REMINDER */
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

    // Remove from local array
    allReminders = allReminders.filter(r => r._id !== selectedReminderId);
    renderReminders();
    closeDeleteModal();
    console.log(" Reminder deleted successfully");

  } catch (err) {
    console.error("Delete reminder error:", err);
    alert("Failed to delete reminder");
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