// public/js/reminderForm.js
// Handles reminder creation with calendar sync feedback

class ReminderFormHandler {
  constructor() {
    this.form = document.getElementById("reminderForm");
    this.submitBtn = document.getElementById("submitReminderBtn");
    this.messageInput = document.getElementById("message");
    this.scheduleInput = document.getElementById("schedule");
    this.frequencySelect = document.getElementById("frequency");
    this.categorySelect = document.getElementById("category");
  }

  init() {
    if (!this.form) {
      console.warn("[REMINDER] Form not found");
      return;
    }

    this.form.addEventListener("submit", (e) => this.handleSubmit(e));
  }

  /**
   * Handle form submission
   */
  async handleSubmit(e) {
    e.preventDefault();

    // Validate form
    if (!this.validateForm()) {
      return;
    }

    try {
      this.setLoading(true);
      this.showMessage("Creating reminder...", "info");

      // Prepare data
      const formData = {
        message: this.messageInput.value.trim(),
        schedule: this.scheduleInput.value.trim(),
        frequency: this.frequencySelect.value || "Daily",
        category: this.categorySelect.value || "Other"
      };

      // Submit to backend
      const response = await fetch("/reminder/api/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create reminder");
      }

      // Handle success
      this.handleSuccess(data);
    } catch (error) {
      console.error("[REMINDER] Submit error:", error);
      this.showMessage(error.message || "Failed to create reminder", "error");
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Handle successful reminder creation
   */
  handleSuccess(data) {
    if (data.calendarError) {
      // Calendar sync failed
      this.handleCalendarSyncError(data);
    } else if (data.calendarSynced) {
      // Fully synced
      this.showMessage("✓ Reminder created and synced to calendar", "success");
    } else {
      // Created but not synced
      this.showMessage("✓ Reminder created (not synced to calendar)", "info");
    }

    // Reset form after delay
    setTimeout(() => {
      this.form.reset();
      this.refreshRemindersList();
    }, 1500);
  }

  /**
   * Handle calendar sync errors
   */
  handleCalendarSyncError(data) {
    const errorMessage = data.calendarError || "Calendar sync failed";

    // Check if it's a revocation error
    if (errorMessage.includes("expired") || errorMessage.includes("revoked")) {
      this.showCalendarRevocationAlert(data);
    } else {
      this.showMessage(
        `✓ Reminder created\n⚠️ ${errorMessage}`,
        "warning"
      );
    }
  }

  /**
   * Show revocation alert with reconnect option
   */
  showCalendarRevocationAlert(data) {
    const container = document.getElementById("calendarAlertContainer") || document.body;

    const alert = document.createElement("div");
    alert.className = "alert alert-warning alert-dismissible fade show";
    alert.role = "alert";
    alert.innerHTML = `
      <strong>⚠️ Calendar Connection Expired</strong>
      <p>Your Google Calendar connection has been revoked or expired.</p>
      <p class="mb-2">Reminder has been created locally, but won't sync to your calendar.</p>
      <div>
        <button type="button" class="btn btn-sm btn-warning" onclick="window.calendarManager?.handleConnect()">
          Reconnect Google Calendar
        </button>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;

    if (document.getElementById("calendarAlertContainer")) {
      container.innerHTML = "";
      container.appendChild(alert);
    } else {
      document.body.insertBefore(alert, document.body.firstChild);
    }

    this.showMessage("✓ Reminder created", "success");
  }

  /**
   * Validate form inputs
   */
  validateForm() {
    if (!this.messageInput.value.trim()) {
      this.showMessage("Please enter a reminder message", "error");
      this.messageInput.focus();
      return false;
    }

    if (!this.scheduleInput.value.trim()) {
      this.showMessage("Please enter a time for the reminder", "error");
      this.scheduleInput.focus();
      return false;
    }

    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(this.scheduleInput.value.trim())) {
      this.showMessage("Time must be in HH:MM format (e.g., 09:30)", "error");
      this.scheduleInput.focus();
      return false;
    }

    return true;
  }

  /**
   * Set loading state
   */
  setLoading(isLoading) {
    if (this.submitBtn) {
      this.submitBtn.disabled = isLoading;
      if (isLoading) {
        this.submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';
      } else {
        this.submitBtn.innerHTML = 'Create Reminder';
      }
    }
  }

  /**
   * Show message to user
   */
  showMessage(message, type = "info") {
    const container = document.getElementById("reminderMessage") || 
                      document.querySelector(".reminder-form-container");

    if (!container) {
      alert(message);
      return;
    }

    const msg = document.createElement("div");
    msg.className = `alert alert-${type === "error" ? "danger" : type === "warning" ? "warning" : type === "success" ? "success" : "info"} alert-dismissible fade show`;
    msg.role = "alert";
    msg.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    const existingMsg = container.querySelector(".alert");
    if (existingMsg) {
      existingMsg.remove();
    }

    container.insertBefore(msg, container.firstChild);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      msg.classList.remove("show");
      setTimeout(() => msg.remove(), 150);
    }, 5000);
  }

  /**
   * Refresh reminders list
   */
  async refreshRemindersList() {
    try {
      // Trigger refresh event if you have a reminders list component
      const event = new CustomEvent("remindersUpdated");
      document.dispatchEvent(event);

      // Or reload reminders via fetch
      const response = await fetch("/reminder/api/reminders");
      const data = await response.json();

      if (data.success) {
        // Update your reminders display
        const event = new CustomEvent("remindersLoaded", { detail: data.reminders });
        document.dispatchEvent(event);
      }
    } catch (error) {
      console.error("[REMINDER] Failed to refresh list:", error);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    const handler = new ReminderFormHandler();
    handler.init();
    window.reminderFormHandler = handler;
  });
} else {
  const handler = new ReminderFormHandler();
  handler.init();
  window.reminderFormHandler = handler;
}