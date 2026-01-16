let selectedCard = null;
let isEdit = false;

/* OPEN */

function openAddModal() {
  isEdit = false;
  selectedCard = null;

  document.getElementById("modalTitle").innerText = "Add Medication";
  document.getElementById("medName").value = "";
  document.getElementById('medHour').value = '09';
  document.getElementById('medMinute').value = '00';
  document.getElementById('medAmPm').value = 'AM';
  document.getElementById("medDose").value = "";
  document.getElementById("medNotes").value = "";

  document.getElementById("medModal").classList.remove("hidden");
}

function openEditModal(btn) {
  isEdit = true;
  selectedCard = btn.closest(".medication-card");

  document.getElementById("modalTitle").innerText = "Edit Medication";
  document.getElementById("medName").value =
    selectedCard.querySelector(".title").innerText;

  // populate dosage
  const doseEl = selectedCard.querySelector('.dose');
  document.getElementById('medDose').value = doseEl ? doseEl.innerText : '';

  // populate notes
  const notesEl = selectedCard.querySelector('.notes');
  document.getElementById('medNotes').value = notesEl ? notesEl.innerText : '';

  // populate time selects from data-time
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
      document.getElementById('medHour').value = String(hh).padStart(2,'0');
      document.getElementById('medMinute').value = mm;
      document.getElementById('medAmPm').value = ampm;
    }
  }

  document.getElementById("medModal").classList.remove("hidden");
}

function openDeleteModal(btn) {
  selectedCard = btn.closest(".medication-card");
  document.getElementById("deleteModal").classList.remove("hidden");
}

/* CLOSE */

function closeMedModal() {
  document.getElementById("medModal").classList.add("hidden");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.add("hidden");
}

/* SAVE */

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

function saveMedication() {
  const name = document.getElementById("medName").value.trim();
  const hour = document.getElementById('medHour').value;
  const minute = document.getElementById('medMinute').value;
  const ampm = document.getElementById('medAmPm').value;
  const dose = document.getElementById("medDose").value.trim();
  const notes = document.getElementById("medNotes").value.trim();

  if (!name) return alert("Enter medication name");

  // convert to 24-hour HH:MM
  let hh = parseInt(hour, 10);
  if (ampm === 'PM' && hh !== 12) hh += 12;
  if (ampm === 'AM' && hh === 12) hh = 0;
  const time = `${String(hh).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;

  if (isEdit && selectedCard) {
    selectedCard.querySelector(".title").innerText = name;
    const doseEl = selectedCard.querySelector('.dose');
    if (doseEl) doseEl.innerText = dose;
    const notesEl = selectedCard.querySelector('.notes');
    if (notesEl) notesEl.innerText = notes;
    const timeEl = selectedCard.querySelector('.time');
    if (timeEl) {
      timeEl.setAttribute('data-time', time);
      timeEl.innerText = formatTime(time);
    }
  } else {
    const card = document.createElement("div");
    card.className = "card medication-card";

    card.innerHTML = `
      <div>
        <strong class="title">${name}</strong>
        <p class="small meta"><span class="dose">${dose}</span> • <span class="time" data-time="${time}">${formatTime(time)}</span></p>
        <p class="small notes">${notes}</p>
      </div>

      <span class="status pending">Pending</span>

      <div class="actions">
        <button class="edit-btn" onclick="openEditModal(this)">Edit</button>
        <button class="delete-btn" onclick="openDeleteModal(this)">Delete</button>
      </div>
    `;

    document.getElementById("medicationList").appendChild(card);
  }

  closeMedModal();
}

/* DELETE */

function confirmDelete() {
  if (selectedCard) selectedCard.remove();
  closeDeleteModal();
}
