function openEditModal() {
  document.getElementById("editName").value =
    document.getElementById("cgName").innerText;
  document.getElementById("editEmail").value =
    document.getElementById("cgEmail").innerText;

  document.getElementById("profileModal").classList.remove("hidden");
}

function closeProfileModal() {
  document.getElementById("profileModal").classList.add("hidden");
}

function saveProfile() {
  document.getElementById("cgName").innerText =
    document.getElementById("editName").value;

  document.getElementById("cgEmail").innerText =
    document.getElementById("editEmail").value;

  closeProfileModal();
}
