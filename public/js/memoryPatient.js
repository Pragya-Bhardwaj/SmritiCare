const list = document.getElementById("memoryList");

async function loadMemories() {
  const res = await fetch("/memory/api/memories");
  const data = await res.json();

  const memories = data.memories || [];
  list.innerHTML = "";
  memories.forEach(m => {
    list.innerHTML += `
      <div>
        <h3>${m.title}</h3>
        <p>${m.description}</p>
      </div>
    `;
  });
}

loadMemories();
