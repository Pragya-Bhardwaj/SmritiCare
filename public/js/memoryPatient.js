const list = document.getElementById("memoryList");

async function loadMemories() {
  const res = await fetch("/api/memories");
  const data = await res.json();

  list.innerHTML = "";
  data.forEach(m => {
    list.innerHTML += `
      <div>
        <h3>${m.title}</h3>
        <p>${m.description}</p>
      </div>
    `;
  });
}

loadMemories();
