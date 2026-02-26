const nodemailer = require("nodemailer");
const User = require("../models/User");
const fs = require("fs");
const path = require("path");

const CHECK_INTERVAL_MS = 5 * 60 * 60 * 1000;
const DEFAULT_SITE_URL = `http://localhost:${process.env.PORT || 3000}`;
const SITE_URL = (process.env.APP_BASE_URL || DEFAULT_SITE_URL).trim();

const emailConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const transporter = emailConfigured
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })
  : null;

let intervalRef = null;
let inFlight = false;
const EMAIL_LOGO_CID = "smriticare-logo";
const ENGAGEMENT_MESSAGES = [
  {
    title: "Just a quick check-in from us 💛",
    body: "Take a moment to open SmritiCare and stay connected."
  },
  {
    title: "A small pause today can make a big difference",
    body: "Tap below and spend a minute with SmritiCare."
  },
  {
    title: "We're thinking of you 😊",
    body: "Drop in for a quick visit and keep everything on track."
  },
  {
    title: "It only takes a few seconds.",
    body: "Open SmritiCare now and continue where you left off."
  },
  {
    title: "Your quick check-in matters more than you think.",
    body: "Tap below and stay connected."
  },
  {
    title: "Let's keep things running smoothly 💙",
    body: "Open SmritiCare for a quick moment."
  },
  {
    title: "A gentle reminder for today.",
    body: "Visit SmritiCare and keep everything moving forward."
  },
  {
    title: "Consistency makes everything easier.",
    body: "Take a quick moment with SmritiCare now."
  },
  {
    title: "We saved your place.",
    body: "Come back and continue with SmritiCare."
  },
  {
    title: "Just 30 seconds of your time.",
    body: "Tap below and open SmritiCare."
  }
];

function getEmailLogoAttachment() {
  const imageDir = path.join(__dirname, "../public/images");
  const candidates = [
    "email-logo.png",
    "email-logo.jpg",
    "email-logo.jpeg",
    "email-logo.webp",
    "email-logo.svg",
    "smriticare-logo.png",
    "smriticare-logo.jpg",
    "smriticare-logo.jpeg",
    "smriticare-logo.webp",
    "smriticare-logo.svg"
  ];

  for (const name of candidates) {
    const fullPath = path.join(imageDir, name);
    if (fs.existsSync(fullPath)) {
      return {
        filename: name,
        path: fullPath,
        cid: EMAIL_LOGO_CID
      };
    }
  }

  return null;
}

function pickRandomMessage() {
  const index = Math.floor(Math.random() * ENGAGEMENT_MESSAGES.length);
  return ENGAGEMENT_MESSAGES[index];
}

async function getRecipients() {
  const users = await User.find({
    isEmailVerified: true,
    linked: true
  }).select("email");

  const recipients = new Set();
  for (const user of users) {
    if (user?.email) {
      recipients.add(user.email);
    }
  }

  return Array.from(recipients);
}

function buildClickEmail({ logoSrc, siteUrl, message }) {
  const subject = `SmritiCare Check-In: ${message.title}`;
  const heading = "Quick SmritiCare Check-In";
  const detailTitle = message.title;
  const detailBody = message.body;
  const badgeBg = "#eff6ff";
  const badgeColor = "#1d4ed8";
  const infoBorder = "#93c5fd";
  const brandVisualMarkup = logoSrc
    ? `<div class="brand-mark" style="width: 46px; height: 46px; border-radius: 999px; overflow: hidden; background-color: #ffffff; border: 2px solid rgba(255, 255, 255, 0.34);">
         <img src="${logoSrc}" alt="SmritiCare logo" style="display: block; width: 100%; height: 100%; object-fit: cover;" />
       </div>`
    : `<div class="brand-mark" style="width: 46px; height: 46px; border-radius: 999px; background-color: rgba(255, 255, 255, 0.22); color: #ffffff; font-size: 18px; font-weight: 700; text-align: center; line-height: 46px;">
         SC
       </div>`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <title>${heading}</title>
        <style>
          @media (prefers-color-scheme: dark) {
            body,
            .bg-main {
              background-color: #0b1220 !important;
            }

            .card {
              background-color: #0f172a !important;
              border-color: #334155 !important;
            }

            .title {
              color: #f8fafc !important;
            }

            .muted {
              color: #cbd5e1 !important;
            }

            .detail-table {
              background-color: #111827 !important;
              border-color: #334155 !important;
            }

            .detail-cell {
              color: #e2e8f0 !important;
              border-bottom-color: #334155 !important;
            }

            .detail-cell-last {
              color: #e2e8f0 !important;
            }

            .badge {
              background-color: #10243f !important;
              color: #bfdbfe !important;
              border-color: #1d4ed8 !important;
            }

            .cta-btn {
              background-color: #1d4ed8 !important;
              color: #ffffff !important;
              border-color: #3b82f6 !important;
            }

            .footer {
              color: #94a3b8 !important;
            }

            .brand-mark {
              background-color: #1e3a8a !important;
            }

            .brand-sub {
              color: #dbeafe !important;
            }

            .brand-chip {
              background-color: #1e40af !important;
              border-color: #3b82f6 !important;
              color: #dbeafe !important;
            }
          }

          [data-ogsc] .bg-main {
            background-color: #0b1220 !important;
          }

          [data-ogsc] .card {
            background-color: #0f172a !important;
            border-color: #334155 !important;
          }

          [data-ogsc] .title {
            color: #f8fafc !important;
          }

          [data-ogsc] .muted {
            color: #cbd5e1 !important;
          }

          [data-ogsc] .detail-table {
            background-color: #111827 !important;
            border-color: #334155 !important;
          }

          [data-ogsc] .detail-cell {
            color: #e2e8f0 !important;
            border-bottom-color: #334155 !important;
          }

          [data-ogsc] .detail-cell-last {
            color: #e2e8f0 !important;
          }

          [data-ogsc] .badge {
            background-color: #10243f !important;
            color: #bfdbfe !important;
            border-color: #1d4ed8 !important;
          }

          [data-ogsc] .cta-btn {
            background-color: #1d4ed8 !important;
            color: #ffffff !important;
            border-color: #3b82f6 !important;
          }

          [data-ogsc] .footer {
            color: #94a3b8 !important;
          }

          [data-ogsc] .brand-mark {
            background-color: #3f4d74 !important;
          }

          [data-ogsc] .brand-sub {
            color: #dbeafe !important;
          }

          [data-ogsc] .brand-chip {
            background-color: #1e40af !important;
            border-color: #3b82f6 !important;
            color: #dbeafe !important;
          }
        </style>
      </head>
      <body class="bg-main" style="margin: 0; padding: 0; background-color: #f4f7fb; font-family: Arial, sans-serif;">
        <table role="presentation" class="bg-main" style="width: 100%; border-collapse: collapse; background-color: #f4f7fb; padding: 24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" class="card" style="width: 100%; max-width: 620px; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden;">
                <tr>
                  <td style="padding: 18px 24px; background: linear-gradient(135deg, #1e3a8a, #1d4ed8); color: #ffffff;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="width: 54px; vertical-align: middle;">
                          ${brandVisualMarkup}
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0; font-size: 19px; font-weight: 700; letter-spacing: 0.2px;">SmritiCare</p>
                          <p class="brand-sub" style="margin: 4px 0 0; font-size: 13px; color: #dbeafe;">Patient support check-in service</p>
                        </td>
                        <td style="width: 96px; vertical-align: middle;" align="right">
                          <span class="brand-chip" style="display: inline-block; background: rgba(255, 255, 255, 0.18); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.28); border-radius: 999px; padding: 6px 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.8px;">
                            CHECK-IN
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 22px 24px 10px;">
                    <span class="badge" style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${infoBorder}; border-radius: 999px; padding: 6px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;">
                      Open SmritiCare
                    </span>
                    <h2 class="title" style="margin: 14px 0 0; color: #0f172a; font-size: 22px;">${heading}</h2>
                    <p class="muted" style="margin: 10px 0 0; color: #475569; font-size: 15px; line-height: 1.55;">
                      "${detailTitle}"<br />
                      ${detailBody}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 24px 14px;">
                    <table role="presentation" class="detail-table" style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
                      <tr>
                        <td class="detail-cell" style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 14px;">
                          <strong>Message:</strong> "${detailTitle}"<br />
                          <span style="color: #6b7280;">${detailBody}</span>
                        </td>
                      </tr>
                      <tr>
                        <td class="detail-cell-last" style="padding: 14px 16px; color: #334155; font-size: 14px;">
                          <strong>Link:</strong> <a href="${siteUrl}" style="color: #1d4ed8; text-decoration: none; word-break: break-all;">${siteUrl}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 24px 16px;">
                    <a class="cta-btn" href="${siteUrl}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; border: 1px solid #1e40af; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 18px; border-radius: 10px;">
                      Open SmritiCare
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 24px 20px;">
                    <p class="footer" style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                      This is an automated check-in from SmritiCare. Please do not reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `${heading}\n\n"${detailTitle}"\n${detailBody}\n\nOpen SmritiCare: ${siteUrl}\n\nAutomated notification from SmritiCare.`;

  return { subject, html, text };
}

async function sendNotificationEmail(to, logoAttachment, logoSrc) {
  if (!transporter) return false;

  const message = pickRandomMessage();
  const { subject, html, text } = buildClickEmail({
    logoSrc,
    siteUrl: SITE_URL,
    message
  });

  await transporter.sendMail({
    from: `"SmritiCare" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
    attachments: logoAttachment ? [logoAttachment] : undefined
  });

  return true;
}

async function sendClickNotificationEmails() {
  const recipients = await getRecipients();
  if (!recipients.length) return 0;

  const logoAttachment = getEmailLogoAttachment();
  const logoSrc = logoAttachment ? `cid:${EMAIL_LOGO_CID}` : null;

  let sentCount = 0;
  const results = await Promise.allSettled(
    recipients.map((to) => sendNotificationEmail(to, logoAttachment, logoSrc))
  );

  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    if (result.status === "fulfilled" && result.value) {
      sentCount += 1;
      continue;
    }

    console.error("Click notification email error:", {
      to: recipients[i],
      error: result.status === "rejected" ? result.reason : "not sent"
    });
  }

  return sentCount;
}

async function notificationTick() {
  if (inFlight) return;
  inFlight = true;

  try {
    if (!emailConfigured) return;

    const sentCount = await sendClickNotificationEmails();
    if (sentCount) {
      console.log(`Click notification emails sent: count=${sentCount}`);
    }
  } catch (err) {
    console.error("Click notification service error:", err);
  } finally {
    inFlight = false;
  }
}

function startReminderNotificationService() {
  if (intervalRef) return;

  if (!emailConfigured) {
    console.warn(
      "Click notification emails disabled: EMAIL_USER/EMAIL_PASS not configured."
    );
    return;
  }

  intervalRef = setInterval(notificationTick, CHECK_INTERVAL_MS);
  console.log(
    `Click notification service started (interval=${CHECK_INTERVAL_MS}ms, first send after 5 hours, siteUrl=${SITE_URL})`
  );
}

module.exports = {
  startReminderNotificationService
};
