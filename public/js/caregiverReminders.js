let selectedCard = null;
let isEdit = false;

/* ================= OPEN MODALS ================= */

function openAddModal() {
  isEdit = false;
  selectedCard = null;

  document.getElementById("modalTitle").innerText = "Add Reminder";
  document.getElementById("reminderTitle").value = "";
  document.getElementById('reminderHour').value = '09';
  document.getElementById('reminderMinute').value = '00';
  document.getElementById('reminderAmPm').value = 'AM';
  document.getElementById("reminderClassification").value = "Daily";
  document.getElementById("reminderType").value = "Medicine";

  document.getElementById("reminderModal").classList.remove("hidden");
}

function openEditModal(btn) {
  isEdit = true;
  selectedCard = btn.closest(".reminder-card");

  document.getElementById("modalTitle").innerText = "Edit Reminder";
  document.getElementById("reminderTitle").value =
    selectedCard.querySelector(".title").innerText;

  // populate time (use data-time if present) and set hour/minute/ampm selects
  const timeEl = selectedCard.querySelector('.time');
  if (timeEl) {
    const t = timeEl.getAttribute('data-time') || '';
    if (t) {
      const parts = t.split(':');
      let hh = parseInt(parts[0], 10);
      const mm = parts[1] || '00';
      let ampm = 'AM';
      if (hh >= 12) { ampm = 'PM'; if (hh > 12) hh = hh - 12; }
      if (hh === 0) hh = 12;
      document.getElementById('reminderHour').value = String(hh).padStart(2,'0');
      document.getElementById('reminderMinute').value = mm;
      document.getElementById('reminderAmPm').value = ampm;
    } else {
      document.getElementById('reminderHour').value = '09';
      document.getElementById('reminderMinute').value = '00';
      document.getElementById('reminderAmPm').value = 'AM';
    }
  }

  // populate classification and type
  const cls = selectedCard.querySelector('.classification');
  const rt = selectedCard.querySelector('.rtype');
  document.getElementById('reminderClassification').value = cls ? cls.innerText : 'Daily';
  document.getElementById('reminderType').value = rt ? rt.innerText : 'Medicine';

  document.getElementById("reminderModal").classList.remove("hidden");
}

function openDeleteModal(btn) {
  selectedCard = btn.closest(".reminder-card");
  document.getElementById("deleteModal").classList.remove("hidden");
}

/* ================= CLOSE MODALS ================= */

function closeReminderModal() {
  document.getElementById("reminderModal").classList.add("hidden");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.add("hidden");
}

/* ================= SAVE (ADD / EDIT) ================= */

function formatTime(t) {
  if (!t) return "--:--";
  const parts = t.split(':');
  if (parts.length !== 2) return t;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return t;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hh = ((h % 12) === 0) ? 12 : (h % 12);
  return `${String(hh).padStart(2,'0')}:${String(m).padStart(2,'0')} ${suffix}`;
}

function saveReminder() {
  const title = document.getElementById("reminderTitle").value.trim();
  const hour = document.getElementById('reminderHour').value;
  const minute = document.getElementById('reminderMinute').value;
  const ampm = document.getElementById('reminderAmPm').value;
  const classification = document.getElementById('reminderClassification').value;
  const rtype = document.getElementById('reminderType').value;

  // convert selected 12-hour time to 24-hour string HH:MM
  let hh = parseInt(hour, 10);
  if (ampm === 'PM' && hh !== 12) hh += 12;
  if (ampm === 'AM' && hh === 12) hh = 0;
  const time = `${String(hh).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;

  if (!title) return alert("Please enter reminder title");

  if (isEdit && selectedCard) {
    selectedCard.querySelector(".title").innerText = title;
    const timeEl = selectedCard.querySelector('.time');
    if (timeEl) {
      timeEl.setAttribute('data-time', time || '');
      timeEl.innerText = formatTime(time);
    }
    const cls = selectedCard.querySelector('.classification');
    const rt = selectedCard.querySelector('.rtype');
    if (cls) cls.innerText = classification;
    if (rt) rt.innerText = rtype;
  } else {
    const card = document.createElement("div");
    card.className = "card reminder-card";

    card.innerHTML = `
      <div>
        <strong class="title">${title}</strong>
        <p class="small time" data-time="${time}">${formatTime(time)}</p>
        <p class="small meta"><span class="classification">${classification}</span> • <span class="rtype">${rtype}</span></p>
      </div>

      <span class="status pending">Pending</span>

      <div class="actions">
        <button class="edit-btn" onclick="openEditModal(this)">Edit</button>
        <button class="delete-btn" onclick="openDeleteModal(this)">Delete</button>
      </div>
    `;

    document.getElementById("reminderList").appendChild(card);
  }

  closeReminderModal();
}

/* ================= DELETE ================= */

function confirmDelete() {
  if (selectedCard) selectedCard.remove();
  closeDeleteModal();
}
