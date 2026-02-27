// utils/googleCalendar.js
const { google } = require("googleapis");

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Get an authenticated OAuth2 client for a user
 */
function getAuthClientForUser(tokens) {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

/**
 * Generate the Google OAuth URL for a user to connect their calendar
 */
function getAuthUrl(userId) {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // ensures refresh_token is always returned
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state: userId // pass userId so we know who connected after redirect
  });
}

/**
 * Exchange auth code for tokens
 */
async function exchangeCodeForTokens(code) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Build a Google Calendar event object from a reminder
 */
function buildCalendarEvent(reminder, caregiverName, patientName) {
  const [hours, minutes] = reminder.schedule.split(":").map(Number);

  // Use today's date as the start, set to the reminder time
  const now = new Date();
  const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 min duration

  // Build recurrence rule
  const recurrenceMap = {
    Daily: "RRULE:FREQ=DAILY",
    Weekly: "RRULE:FREQ=WEEKLY",
    Monthly: "RRULE:FREQ=MONTHLY",
    Once: null
  };
  const recurrence = recurrenceMap[reminder.frequency];

  const event = {
    summary: `[${reminder.category}] ${reminder.message}`,
    description: [
      `Reminder for: ${patientName}`,
      `Set by caregiver: ${caregiverName}`,
      `Category: ${reminder.category}`,
      `Frequency: ${reminder.frequency}`,
      `Time: ${reminder.schedule}`,
      ``,
      `Managed by SmritiCare`
    ].join("\n"),
    start: {
      dateTime: startTime.toISOString(),
      timeZone: "Asia/Kolkata" // adjust to your timezone
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: "Asia/Kolkata"
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 10 }
      ]
    }
  };

  if (recurrence) {
    event.recurrence = [recurrence];
  }

  return event;
}

/**
 * Create a Google Calendar event for a user
 * Returns the created event's Google Calendar ID
 */
async function createCalendarEvent(userTokens, reminder, caregiverName, patientName) {
  const auth = getAuthClientForUser(userTokens);
  const calendar = google.calendar({ version: "v3", auth });

  const event = buildCalendarEvent(reminder, caregiverName, patientName);

  const response = await calendar.events.insert({
    calendarId: "primary",
    resource: event
  });

  return response.data.id; // Google Calendar event ID
}

/**
 * Update an existing Google Calendar event
 */
async function updateCalendarEvent(userTokens, googleEventId, reminder, caregiverName, patientName) {
  const auth = getAuthClientForUser(userTokens);
  const calendar = google.calendar({ version: "v3", auth });

  const event = buildCalendarEvent(reminder, caregiverName, patientName);

  await calendar.events.update({
    calendarId: "primary",
    eventId: googleEventId,
    resource: event
  });
}

/**
 * Delete a Google Calendar event
 */
async function deleteCalendarEvent(userTokens, googleEventId) {
  const auth = getAuthClientForUser(userTokens);
  const calendar = google.calendar({ version: "v3", auth });

  await calendar.events.delete({
    calendarId: "primary",
    eventId: googleEventId
  });
}

module.exports = {
  getAuthUrl,
  exchangeCodeForTokens,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
};
