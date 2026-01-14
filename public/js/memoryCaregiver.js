const form = document.getElementById("memoryForm");
const grid = document.getElementById("memoryGrid");
const modal = document.getElementById("memoryModal");
const deleteModal = document.getElementById("deleteModal");
let selectedMemoryId = null;

document.addEventListener("DOMContentLoaded", () => {
  loadMemories();
  setupForm();
});

function setupForm() {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('memoryId').value || null;
    const title = document.getElementById('memoryTitle').value.trim();
    if (!title) return alert('Enter a title');

    const fd = new FormData(form);
    // Ensure description is always included (fix for edit not saving description)
    fd.set('description', (document.getElementById('memoryDesc').value || '').trim());

    try {
      const url = id ? `/memory/api/memories/${id}` : '/memory/api/memories';
      const method = id ? 'PUT' : 'POST';

      // Debug: log the keys being sent
      for (let pair of fd.entries()) {
        console.log('FD', pair[0], pair[1]);
      }

      const res = await fetch(url, { method, body: fd, credentials: 'include' });
      if (!res.ok) {
        const text = await res.text();
        console.error('Save failed response:', text);
        throw new Error('Save failed');
      }
      const data = await res.json();

      closeMemoryModal();
      form.reset();

      // If update returned the updated memory, update DOM directly to avoid stale caches
      if (data && data.memory && method === 'PUT') {
        updateCardInDOM(data.memory);
      } else {
        // For new items or if no memory in response, reload list (with nocache param)
        loadMemories();
      }

    } catch (err) {
      console.error(err);
      alert('Failed to save memory');
    }
  });
}

function openAddModal() {
  document.getElementById('modalTitle').innerText = 'Add Memory';
  document.getElementById('memoryId').value = '';
  form.reset();
  modal.classList.remove('hidden');
}

async function openEditModalById(id) {
  try {
    const res = await fetch(`/memory/api/memories`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load');
    const data = await res.json();
    const memory = data.memories.find(m => m._id === id);
    if (!memory) return alert('Not found');

    document.getElementById('modalTitle').innerText = 'Edit Memory';
    document.getElementById('memoryId').value = memory._id;
    document.getElementById('memoryTitle').value = memory.title || '';
    document.getElementById('memoryRelation').value = memory.relation || '';
    document.getElementById('memoryDesc').value = memory.description || '';
    document.getElementById('memoryNotes').value = memory.notes || '';

    // Populate media preview
    const img = document.getElementById('previewImage');
    const audio = document.getElementById('previewAudio');
    if (memory.imageUrl) {
      img.src = memory.imageUrl;
      img.style.display = 'block';
    } else {
      img.src = '';
      img.style.display = 'none';
    }
    if (memory.audioUrl) {
      audio.src = memory.audioUrl;
      audio.style.display = 'block';
    } else {
      audio.src = '';
      audio.style.display = 'none';
    }

    // Open edit modal
    modal.classList.remove('hidden');
  } catch (err) {
    console.error('Open edit failed:', err);
    alert('Could not load memory for editing');
  }
}

function closeMemoryModal() {
  modal.classList.add('hidden');
}

function openDeleteModalById(id) {
  selectedMemoryId = id;
  deleteModal.classList.remove('hidden');
  document.getElementById('confirmDelete').onclick = confirmDelete;
}

async function confirmDelete() {
  if (!selectedMemoryId) return;
  try {
    const res = await fetch(`/memory/api/memories/${selectedMemoryId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    deleteModal.classList.add('hidden');
    loadMemories();
  } catch (err) {
    console.error(err);
    alert('Failed to delete');
  }
}

async function loadMemories() {
  try {
    // Add nocache param to avoid cached results interfering with recent updates
    const res = await fetch(`/memory/api/memories?nocache=${Date.now()}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Load failed');
    const data = await res.json();
    const memories = data.memories || [];

    grid.innerHTML = memories.map(m => createCard(m)).join('');

    // Attach delegated handlers (set once)
    if (!grid._listenersAttached) {
      grid.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
          e.stopPropagation();
          openEditModalById(editBtn.dataset.id);
          return;
        }
        const delBtn = e.target.closest('.delete-btn');
        if (delBtn) {
          e.stopPropagation();
          openDeleteModalById(delBtn.dataset.id);
          return;
        }
      });
      grid._listenersAttached = true;
    }

  } catch (err) {
    console.error(err);
    grid.innerHTML = '<div class="no-memories">Failed to load memories</div>';
  }
}

function createCard(m) {
  return `
    <div class="memory-item" data-id="${m._id}">
      <div class="memory-image ${m.imageUrl ? 'has-image' : ''}" style="${m.imageUrl ? `background-image:url('${m.imageUrl}')` : ''}">
        ${!m.imageUrl ? `<div class="memory-initials">${(m.title||'').split(' ').map(s=>s[0]||'').join('').slice(0,2).toUpperCase()}</div>` : ''}
      </div>
      <div class="memory-content">
        <div class="memory-header">
          <h3 class="memory-title">${escapeHtml(m.title)}</h3>
          <div class="memory-actions">
            <button class="secondary-btn edit-btn" data-id="${m._id}">Edit</button>
            <button class="secondary-btn delete-btn" data-id="${m._id}">Delete</button>
          </div>
        </div>
        ${m.relation ? `<div class="memory-relation">${escapeHtml(m.relation)}</div>` : ''}
        ${m.description ? `<p class="memory-description">${escapeHtml(m.description)}</p>` : ''}
        ${m.notes ? `<p class="memory-notes">${escapeHtml(m.notes)}</p>` : ''}
        ${m.audioUrl ? `<div class="memory-audio"><button class="audio-btn" onclick="event.stopPropagation(); playAudio('${m.audioUrl}')">▶ Play</button></div>` : ''}
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Replace or insert card in DOM after update
function updateCardInDOM(memory) {
  const existing = grid.querySelector(`.memory-item[data-id="${memory._id}"]`);
  const html = createCard(memory);
  if (existing) {
    existing.outerHTML = html;
  } else {
    // prepend new card for new memory
    grid.insertAdjacentHTML('afterbegin', html);
  }
}

// Expose helper for audio in global scope
window.playAudio = function(url) {
  const a = new Audio(url);
  a.play().catch(e => console.error('Audio play error', e));
};
