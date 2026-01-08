fetch("/pair/invite")
  .then(res => res.json())
  .then(data => {
    document.getElementById("code").innerText = data.code;
  });
setInterval(async () => {
  const res = await fetch("/patient/link-status");
  const data = await res.json();

  if (data.linked) {
    document.getElementById("dashBtn").disabled = false;
    document.getElementById("dashBtn").classList.remove("disabled-btn");
    document.getElementById("waiting").innerText = "";
  }
}, 3000);
