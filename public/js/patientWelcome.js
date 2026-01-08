fetch("/pair/invite")
  .then(res => res.json())
  .then(data => {
    document.getElementById("code").innerText = data.code;
  });
async function goPatientDashboard() {
  window.location.href = "/patient/dashboard";
}

setInterval(async () => {
  const res = await fetch("/patient/link-status");
  const data = await res.json();

  if (data.linked) {
    const btn = document.getElementById("dashBtn");
    btn.disabled = false;
    btn.classList.remove("disabled-btn");
    document.getElementById("waiting").innerText = "";
  }
}, 3000);
