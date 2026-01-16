// Prevent multiple submissions
let isSubmitting = false;

/* Handle the linking process when caregiver enters invite code */
async function link() {
  // Prevent double-submission
  if (isSubmitting) {
    console.log(" Already submitting, please wait...");
    return;
  }

  // Get DOM elements
  const codeInput = document.getElementById("code");
  const msg = document.getElementById("msg");
  const dashBtn = document.getElementById("dashBtn");
  const linkBtn = document.getElementById("linkBtn");

  // Reset messages
  msg.innerText = "";
  msg.style.color = "red";

  // Get and validate code
  const code = codeInput?.value?.trim();

  if (!code) {
    msg.innerText = "Please enter the invite code";
    return;
  }

  // Validate format (PAT-XXXX)
  if (!/^PAT-\d{4}$/.test(code)) {
    msg.innerText = "Invalid code format. Expected: PAT-XXXX";
    return;
  }

  // Disable button and set loading state
  isSubmitting = true;
  if (linkBtn) {
    linkBtn.disabled = true;
    linkBtn.innerText = "Linking...";
  }

  try {
    console.log(" Attempting to link with code:", code);

    const res = await fetch("/caregiver/link", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      credentials: "include", // Important for session cookies
      body: JSON.stringify({ code })
    });

    // Check HTTP status
    if (!res.ok) {
      const errorText = await res.text();
      console.error(" HTTP Error:", res.status, errorText);
      throw new Error(`Server error: ${res.status}`);
    }

    const data = await res.json();

    if (!data.success) {
      // Show error message
      msg.style.color = "red";
      msg.innerText = data.error || "Invalid invite code";
      console.error(" Link failed:", data.error);

      // Re-enable button
      isSubmitting = false;
      if (linkBtn) {
        linkBtn.disabled = false;
        linkBtn.innerText = "Link Patient";
      }
      return;
    }

    // SUCCESS
    console.log(" Successfully linked to patient");

    msg.style.color = "green";
    msg.innerText = data.message || "Linked successfully!";

    // Enable dashboard button
    if (dashBtn) {
      dashBtn.disabled = false;
      dashBtn.classList.remove("disabled-btn");
    }

    // Keep link button disabled
    if (linkBtn) {
      linkBtn.innerText = "Linked ";
    }

    // NOTE: No auto-redirect — user must click "Go to Dashboard" to navigate.
    // Intentionally not redirecting automatically to give control to the caregiver.

  } catch (err) {
    console.error(" Link error:", err);
    
    msg.style.color = "red";
    msg.innerText = "Something went wrong. Please try again.";

    // Re-enable button
    isSubmitting = false;
    if (linkBtn) {
      linkBtn.disabled = false;
      linkBtn.innerText = "Link Patient";
    }
  }
}

/**
 * Navigate to dashboard (manual button click)
 */
function goToDashboard() {
  window.location.href = "/caregiver/dashboard";
}

/**
 * Allow Enter key to submit
 */
function setupEnterKeyHandler() {
  const codeInput = document.getElementById("code");
  if (codeInput) {
    codeInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        link();
      }
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupEnterKeyHandler);
} else {
  setupEnterKeyHandler();
}