async function link() {
  const code = document.getElementById("code").value;
  const res = await fetch("/caregiver/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });

  const data = await res.json();
  if (data.success) {
    document.getElementById("msg").innerText = "Linked successfully!";
    document.getElementById("dashBtn").disabled = false;
  } else {
    document.getElementById("msg").innerText = data.error;
  }
}
