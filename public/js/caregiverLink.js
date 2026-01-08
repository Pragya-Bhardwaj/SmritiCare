async function link() {
  const codeInput = document.getElementById("code");
  const msg = document.getElementById("msg");
  const dashBtn = document.getElementById("dashBtn");
  const linkBtn = document.getElementById("linkBtn");

  msg.innerText = "";
  msg.style.color = "red";

  if (!codeInput.value.trim()) {
    msg.innerText = "Invite code is required";
    return;
  }

  linkBtn.disabled = true;

  try {
   const res = await fetch("/caregiver/link", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "same-origin",   // 👈 THIS IS REQUIRED
  body: JSON.stringify({ code })
});



    const data = await res.json();

    if (!data.success) {
      msg.innerText = data.error || "Invalid invite code";
      linkBtn.disabled = false;
      return;
    }

    msg.style.color = "green";
    msg.innerText = "Linked successfully!";

    dashBtn.disabled = false;
    dashBtn.classList.remove("disabled-btn");

  } catch (err) {
    msg.innerText = "Something went wrong. Try again.";
    linkBtn.disabled = false;
  }
}
