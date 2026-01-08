async function link() {
  const codeInput = document.getElementById("code");
  const msg = document.getElementById("msg");
  const dashBtn = document.getElementById("dashBtn");

  msg.innerText = "";
  msg.style.color = "red";

  if (!codeInput.value.trim()) {
    msg.innerText = "Invite code is required";
    return;
  }

  const res = await fetch("/caregiver/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: codeInput.value.trim() })
  });

  const data = await res.json();

  if (!data.success) {
    msg.innerText = data.error || "Invalid invite code";
    return;
  }

  msg.style.color = "green";
  msg.innerText = "Linked successfully!";

  dashBtn.disabled = false;
  dashBtn.classList.remove("disabled-btn");
}
