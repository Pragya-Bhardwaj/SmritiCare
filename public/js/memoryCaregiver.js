const form = document.getElementById("memoryForm");
const grid = document.getElementById("memoryGrid");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = memoryTitle.value;
  const description = memoryDesc.value;

  await fetch("/api/memories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description }),
  });

  form.reset();
  loadMemories();
});

async function loadMemories() {
  const res = await fetch("/api/memories");
  const data = await res.json();

  grid.innerHTML = "";

  data.forEach((m) => {
    grid.innerHTML += `
      <div class="memory-card">
        <div class="memory-content">
          <h3>${m.title}</h3>
          <p>${m.description}</p>
        </div>
      </div>
    `;
  });
}

loadMemories();
