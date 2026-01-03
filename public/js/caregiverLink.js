function link() {
  fetch("/pair/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: document.getElementById("code").value })
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById("msg").innerText =
      data.success ? "Linked successfully!" : "Invalid code";
    if (data.success) {
      setTimeout(() => location.href = "/caregiver/dashboard", 1000);
    }
  });
}
