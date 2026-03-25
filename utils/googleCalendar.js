// utils/googleCalendar.js
const { google } = require("googleapis");

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getAuthClientForUser(tokens) {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

/**
 * Generate Google OAuth URL
 * @param {string} caregiverId  - always the logged-in caregiver's DB id
 * @param {string} target       - "caregiver" or "patient"
 */
function getAuthUrl(caregiverId, target = "caregiver") {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",  // always get refresh_token
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    // encode both pieces of info into state so callback knows what to do
    state: JSON.stringify({ caregiverId, target })
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
 * Build a Google Calendar event from a reminder
 */
function buildCalendarEvent(reminder, caregiverName, patientName) {
  const [hours, minutes] = reminder.schedule.split(":").map(Number);
  let startTime, endTime, recurrence = null;
  const now = new Date();

  // Handle startTime based on frequency
  if (reminder.frequency === "Once" && reminder.onceDate) {
    // onceDate is YYYY-MM-DD
    const [y, m, d] = reminder.onceDate.split("-").map(Number);
    startTime = new Date(y, m - 1, d, hours, minutes, 0);
  } else if (reminder.frequency === "Monthly" && reminder.monthDate) {
    // monthDate is YYYY-MM-DD, use day
    const [y, m, d] = reminder.monthDate.split("-").map(Number);
    startTime = new Date(now.getFullYear(), now.getMonth(), d, hours, minutes, 0);
    recurrence = `RRULE:FREQ=MONTHLY;BYMONTHDAY=${d}`;
  } else if (reminder.frequency === "Yearly" && reminder.yearMonth && reminder.yearDate) {
    // yearMonth is MM, yearDate is DD
    startTime = new Date(now.getFullYear(), Number(reminder.yearMonth) - 1, Number(reminder.yearDate), hours, minutes, 0);
    recurrence = `RRULE:FREQ=YEARLY;BYMONTH=${reminder.yearMonth};BYMONTHDAY=${reminder.yearDate}`;
  } else if (reminder.frequency === "Weekly" && reminder.weekDay) {
    // weekDay is string
    startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    const weekDayMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
    recurrence = `RRULE:FREQ=WEEKLY;BYDAY=${["SU","MO","TU","WE","TH","FR","SA"][weekDayMap[reminder.weekDay]]}`;
  } else {
    // Daily or fallback
    startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    recurrence = reminder.frequency === "Daily" ? "RRULE:FREQ=DAILY" : null;
  }
  endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 min

  const event = {
    summary: `[${reminder.category}] ${reminder.message}`,
    description: [
      `Reminder for patient : ${patientName}`,
      `Set by caregiver     : ${caregiverName}`,
      `Category             : ${reminder.category}`,
      `Frequency            : ${reminder.frequency}`,
      `Time                 : ${reminder.schedule}`,
      ``,
      `Managed by SmritiCare`
    ].join("\n"),
    start: {
      dateTime: startTime.toISOString(),
      timeZone: "Asia/Kolkata"
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

  if (recurrence) event.recurrence = [recurrence];

  return event;
}

async function createCalendarEvent(userTokens, reminder, caregiverName, patientName) {
  const auth     = getAuthClientForUser(userTokens);
  const calendar = google.calendar({ version: "v3", auth });
  const event    = buildCalendarEvent(reminder, caregiverName, patientName);

  const response = await calendar.events.insert({
    calendarId: "primary",
    resource: event
  });

  return response.data.id;
}

async function updateCalendarEvent(userTokens, googleEventId, reminder, caregiverName, patientName) {
  const auth     = getAuthClientForUser(userTokens);
  const calendar = google.calendar({ version: "v3", auth });
  const event    = buildCalendarEvent(reminder, caregiverName, patientName);

  await calendar.events.update({
    calendarId: "primary",
    eventId:    googleEventId,
    resource:   event
  });
}

async function deleteCalendarEvent(userTokens, googleEventId) {
  const auth     = getAuthClientForUser(userTokens);
  const calendar = google.calendar({ version: "v3", auth });

  await calendar.events.delete({
    calendarId: "primary",
    eventId:    googleEventId
  });
}

module.exports = {
  getAuthUrl,
  exchangeCodeForTokens,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
};
