document.addEventListener("DOMContentLoaded", () => {

  /* ---------- MODAL ---------- */
  function openModal(html) {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-box">
        ${html}
        <button class="close-btn">Close</button>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector(".close-btn").onclick = () => modal.remove();
  }

  /* ---------- ADD MEDICATION ---------- */
  const addBtn = document.querySelector(".add-btn");
  if (addBtn) {
    addBtn.onclick = () => {
      openModal(`
        <h3>Add Medication</h3>
        <input id="name" placeholder="Medicine">
        <input id="dose" placeholder="Dose">
        <input id="time" placeholder="Time">
        <input id="notes" placeholder="Notes">
        <button id="saveMed">Save</button>
      `);

      document.getElementById("saveMed").onclick = async () => {
        await fetch("/api/patient/medications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.value,
            dose: dose.value,
            time: time.value,
            notes: notes.value
          })
        });
        location.reload();
      };
    };
  }

});
