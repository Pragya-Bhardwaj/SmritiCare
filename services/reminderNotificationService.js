const nodemailer = require("nodemailer");
const User = require("../models/User");
const {
  EMAIL_LOGO_CID,
  getEmailLogoAttachment,
  escapeHtml,
  buildEmailLayout
} = require("../utils/emailTheme");

const CHECK_INTERVAL_MS = 5 * 60 * 60 * 1000;
const DEFAULT_SITE_URL = `http://localhost:${process.env.PORT || 3000}`;
const SITE_URL = (process.env.APP_BASE_URL || process.env.APP_URL || DEFAULT_SITE_URL).trim().replace(/\/$/, "");

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
  const brandVisualMarkup = logoSrc
    ? `<div class="brand-mark" style="width: 56px; height: 56px; border-radius: 18px; overflow: hidden; background-color: rgba(255, 255, 255, 0.92); padding: 10px; box-sizing: border-box; box-shadow: 0 12px 28px rgba(57, 72, 118, 0.14);">
         <img src="${logoSrc}" alt="SmritiCare logo" style="display: block; width: 100%; height: 100%; object-fit: contain;" />
       </div>`
    : `<div class="brand-mark" style="width: 56px; height: 56px; border-radius: 18px; background-color: rgba(255, 255, 255, 0.88); color: #171b33; font-size: 20px; font-weight: 800; text-align: center; line-height: 56px; box-shadow: 0 12px 28px rgba(57, 72, 118, 0.14);">
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
              background-color: #11192b !important;
            }

            .card {
              background: #18213a !important;
              border-color: #2d3c60 !important;
            }

            .title {
              color: #f4f7ff !important;
            }

            .muted {
              color: #c1cbe4 !important;
            }

            .detail-table {
              background-color: #202c4a !important;
              border-color: #314064 !important;
            }

            .detail-cell {
              color: #dbe4fb !important;
              border-bottom-color: #314064 !important;
            }

            .detail-cell-last {
              color: #dbe4fb !important;
            }

            .link-text {
              color: #9ec9ff !important;
            }

            .cta-btn {
              background-color: #f4f7ff !important;
              color: #171b33 !important;
              border-color: #f4f7ff !important;
            }

            .footer {
              color: #9daad0 !important;
            }

            .brand-mark {
              background-color: rgba(255, 255, 255, 0.92) !important;
            }

            .brand-sub {
              color: #b7c5e8 !important;
            }

            .brand-chip {
              background-color: #dfe6fb !important;
              border-color: #dfe6fb !important;
              color: #171b33 !important;
            }

            .hero-panel {
              background: #1d2741 !important;
              border-color: #314064 !important;
            }

            .eyebrow {
              color: #98aacd !important;
            }

            .cta-text {
              color: #171b33 !important;
            }
          }

          [data-ogsc] .bg-main {
            background-color: #11192b !important;
          }

          [data-ogsc] .card {
            background: #18213a !important;
            border-color: #2d3c60 !important;
          }

          [data-ogsc] .title {
            color: #f4f7ff !important;
          }

          [data-ogsc] .muted {
            color: #c1cbe4 !important;
          }

          [data-ogsc] .detail-table {
            background-color: #202c4a !important;
            border-color: #314064 !important;
          }

          [data-ogsc] .detail-cell {
            color: #dbe4fb !important;
            border-bottom-color: #314064 !important;
          }

          [data-ogsc] .detail-cell-last {
            color: #dbe4fb !important;
          }

          [data-ogsc] .link-text {
            color: #9ec9ff !important;
          }

          [data-ogsc] .cta-btn {
            background-color: #f4f7ff !important;
            color: #171b33 !important;
            border-color: #f4f7ff !important;
          }

          [data-ogsc] .footer {
            color: #9daad0 !important;
          }

          [data-ogsc] .brand-mark {
            background-color: rgba(255, 255, 255, 0.92) !important;
          }

          [data-ogsc] .brand-sub {
            color: #b7c5e8 !important;
          }

          [data-ogsc] .brand-chip {
            background-color: #dfe6fb !important;
            border-color: #dfe6fb !important;
            color: #171b33 !important;
          }

          [data-ogsc] .hero-panel {
            background: #1d2741 !important;
            border-color: #314064 !important;
          }

          [data-ogsc] .eyebrow {
            color: #98aacd !important;
          }

          [data-ogsc] .cta-text {
            color: #171b33 !important;
          }
        </style>
      </head>
      <body class="bg-main" style="margin: 0; padding: 0; background-color: #dbe3fb; font-family: 'Segoe UI', Arial, sans-serif;">
        <table role="presentation" class="bg-main" style="width: 100%; border-collapse: collapse; background-color: #dbe3fb; padding: 28px 14px;">
          <tr>
            <td align="center">
              <table role="presentation" class="card" style="width: 100%; max-width: 680px; border-collapse: collapse; background: linear-gradient(135deg, #fcfdff 0%, #eef3ff 56%, #fff8ea 100%); border: 1px solid #e5ebf7; border-radius: 32px; overflow: hidden; box-shadow: 0 26px 70px rgba(63, 78, 122, 0.18);">
                <tr>
                  <td style="padding: 28px 32px 18px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="width: 72px; vertical-align: middle;">
                          ${brandVisualMarkup}
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0; color: #1d2340; font-size: 23px; font-weight: 800; letter-spacing: -0.03em;">SmritiCare</p>
                          <p class="brand-sub" style="margin: 5px 0 0; font-size: 14px; color: #7280a0;">Bring every care detail into one calm flow</p>
                        </td>
                        <td style="width: 132px; vertical-align: middle;" align="right">
                          <span class="brand-chip" style="display: inline-block; background: #171b33; color: #ffffff; border: 1px solid #171b33; border-radius: 999px; padding: 10px 16px; font-size: 11px; font-weight: 800; letter-spacing: 0.12em;">
                            CARE CHECK-IN
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 32px 18px;">
                    <div class="hero-panel" style="background: rgba(255, 255, 255, 0.72); border: 1px solid #e5ebf7; border-radius: 30px; padding: 28px;">
                      <p class="eyebrow" style="margin: 0 0 16px; color: #6d7ca1; font-size: 12px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;">Open SmritiCare</p>
                      <h2 class="title" style="margin: 0; color: #1d2340; font-size: 34px; line-height: 1.06; letter-spacing: -0.06em;">${heading}</h2>
                      <p class="muted" style="margin: 14px 0 0; color: #66738f; font-size: 16px; line-height: 1.65;">
                        "${detailTitle}"<br />
                        ${detailBody}
                      </p>
                      <table role="presentation" class="detail-table" style="width: 100%; border-collapse: collapse; margin-top: 22px; background: linear-gradient(180deg, #ffffff 0%, #eff4ff 100%); border: 1px solid #d6e1fb; border-radius: 24px;">
                        <tr>
                          <td class="detail-cell" style="padding: 16px 18px; border-bottom: 1px solid #d6e1fb; color: #56627f; font-size: 14px; line-height: 1.65;">
                            <strong style="color: #1d2340;">Message</strong><br />
                            <span style="color: #66738f;">${detailBody}</span>
                          </td>
                        </tr>
                        <tr>
                          <td class="detail-cell-last" style="padding: 16px 18px; color: #56627f; font-size: 14px; line-height: 1.65;">
                            <strong style="color: #1d2340;">Continue at</strong><br />
                            <a class="link-text" href="${siteUrl}" style="color: #28315d; text-decoration: none; word-break: break-all;">${siteUrl}</a>
                          </td>
                        </tr>
                      </table>
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 18px;">
                        <tr>
                          <td style="padding: 0;">
                            <a class="cta-btn" href="${siteUrl}" style="display: inline-block; background-color: #171b33; color: #ffffff; border: 1px solid #171b33; text-decoration: none; font-weight: 800; font-size: 14px; padding: 14px 24px; border-radius: 999px; box-shadow: 0 16px 28px rgba(23, 27, 51, 0.18);">
                              <span class="cta-text">Open SmritiCare</span>
                            </a>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 32px 32px;">
                    <p class="footer" style="margin: 0; color: #7f8ba5; font-size: 12px; line-height: 1.6;">
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
