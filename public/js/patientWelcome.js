// State management
let pollingInterval = null;
let linkCheckCount = 0;
const MAX_POLL_ATTEMPTS = 200; // 10 minutes (200 * 3 seconds)

/**
 * Load and display the patient's invite code
 */
async function loadInviteCode() {
  try {
    const codeElement = document.getElementById("inviteCode");
    
    // Show loading state
    if (codeElement) {
      codeElement.innerText = "Loading...";
    }

    // ✅ FIXED: Use correct endpoint
    const res = await fetch("/patient/invite-code", {
      method: "GET",
      credentials: "include",
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) {
      let errText = res.statusText;
      try { errText = await res.text(); } catch (e) { /* ignore */ }
      console.warn("Invite code fetch returned non-OK:", res.status, errText);
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();

    if (data.code) {
      if (codeElement) {
        codeElement.innerText = data.code;
      }
      console.log("✅ Invite code loaded:", data.code);
    } else {
      if (codeElement) {
        codeElement.innerText = "CODE ERROR";
      }
      console.error("❌ No invite code in response");
    }

  } catch (err) {
    console.error("Failed to load invite code:", err);
    const codeElement = document.getElementById("inviteCode");
    if (codeElement) {
      codeElement.innerText = "ERROR";
    }
    
    // Show error message to user
    const statusElement = document.getElementById("statusText");
    if (statusElement) {
      statusElement.innerText = "Failed to load invite code. Please refresh the page.";
      statusElement.style.color = "red";
    }
  }
}

/**
 * Check if caregiver has linked using the invite code
 */
async function checkLinkStatus() {
  try {
    linkCheckCount++;

    const res = await fetch("/patient/link-status", {
      method: "GET",
      credentials: "include",
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) {
      console.warn(`Link status check failed: HTTP ${res.status}`);
      return;
    }

    const data = await res.json();

    if (data.linked) {
      // ✅ Caregiver has linked!
      console.log("✅ Caregiver linked successfully!");

      // Stop polling
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }

      // Enable dashboard button
      const dashBtn = document.getElementById("dashboardBtn");
      if (dashBtn) {
        dashBtn.disabled = false;
        dashBtn.classList.remove("disabled-btn");
      }

      // Update status text
      const statusElement = document.getElementById("statusText");
      if (statusElement) {
        statusElement.innerText = "✅ Caregiver linked successfully! You can now access your dashboard.";
        statusElement.style.color = "green";
      }

      // Hide waiting message
      const waitingElement = document.getElementById("waiting");
      if (waitingElement) {
        waitingElement.innerText = "";
      }
    } else {
      // Still waiting
      console.log(`Waiting for link... (attempt ${linkCheckCount}/${MAX_POLL_ATTEMPTS})`);
    }

    // Stop polling after max attempts
    if (linkCheckCount >= MAX_POLL_ATTEMPTS) {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }

      const statusElement = document.getElementById("statusText");
      if (statusElement) {
        statusElement.innerText = "Polling stopped. Please refresh the page to continue waiting.";
        statusElement.style.color = "orange";
      }
    }

  } catch (err) {
    console.error("Link status check error:", err);
  }
}

/**
 * Navigate to patient dashboard
 */
function goPatientDashboard() {
  window.location.href = "/patient/dashboard";
}

/**
 * Regenerate invite code (user-initiated)
 */
async function regenerateInviteCode() {
  try {
    const btn = document.getElementById("regenerateBtn");
    if (btn) {
      btn.disabled = true;
      btn.innerText = "Regenerating...";
    }

    const res = await fetch("/patient/invite-code/regenerate", {
      method: "POST",
      credentials: "include",
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) {
      let txt = res.statusText;
      try { txt = await res.text(); } catch (e) { /* ignore */ }
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }

    const data = await res.json();

    const codeElement = document.getElementById("inviteCode");
    if (codeElement && data.code) {
      codeElement.innerText = data.code;
    }

    if (btn) {
      btn.disabled = false;
      btn.innerText = "Regenerate Code";
    }

    const statusElement = document.getElementById("statusText");
    if (statusElement) {
      statusElement.innerText = "New invite code generated.";
      statusElement.style.color = "green";
    }

    console.log("✅ Invite regenerated:", data.code);
  } catch (err) {
    console.error("Failed to regenerate invite code:", err);
    const btn = document.getElementById("regenerateBtn");
    if (btn) {
      btn.disabled = false;
      btn.innerText = "Regenerate Code";
    }
    const statusElement = document.getElementById("statusText");
    if (statusElement) {
      statusElement.innerText = "Failed to regenerate invite code.";
      statusElement.style.color = "red";
    }
  }
}

/**
 * Initialize the page
 */
function init() {
  console.log("🚀 Patient welcome page initialized");

  // Load invite code
  loadInviteCode();

  // Wire up regenerate button
  const regenBtn = document.getElementById("regenerateBtn");
  if (regenBtn) {
    regenBtn.addEventListener("click", regenerateInviteCode);
  }

  // Start polling for link status every 3 seconds
  pollingInterval = setInterval(checkLinkStatus, 3000);

  // Also check immediately
  checkLinkStatus();
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}


