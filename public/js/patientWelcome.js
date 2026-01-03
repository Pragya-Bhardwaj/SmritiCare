fetch("/pair/invite")
  .then(res => res.json())
  .then(data => {
    document.getElementById("code").innerText = data.code;
  });
