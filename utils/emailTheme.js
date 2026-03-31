const fs = require("fs");
const path = require("path");

const EMAIL_LOGO_CID = "smriticare-logo";

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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildBrandVisualMarkup(logoSrc) {
  if (logoSrc) {
    return `
      <div class="brand-mark" style="width: 58px; height: 58px; border-radius: 20px; overflow: hidden; background-color: rgba(255, 255, 255, 0.94); padding: 10px; box-sizing: border-box; box-shadow: 0 14px 30px rgba(57, 72, 118, 0.14);">
        <img src="${escapeHtml(logoSrc)}" alt="SmritiCare logo" style="display: block; width: 100%; height: 100%; object-fit: contain;" />
      </div>
    `;
  }

  return `
    <div class="brand-mark" style="width: 58px; height: 58px; border-radius: 20px; background-color: rgba(255, 255, 255, 0.92); color: #171b33; font-size: 20px; font-weight: 800; text-align: center; line-height: 58px; box-shadow: 0 14px 30px rgba(57, 72, 118, 0.14);">
      SC
    </div>
  `;
}

function buildEmailLayout({
  title,
  previewText,
  badge,
  eyebrow,
  intro,
  bodyHtml,
  ctaLabel,
  ctaHref,
  footerText,
  footerMeta,
  logoSrc
}) {
  const safeTitle = escapeHtml(title);
  const safePreviewText = escapeHtml(previewText || title);
  const safeBadge = badge ? escapeHtml(badge) : "";
  const safeEyebrow = eyebrow ? escapeHtml(eyebrow) : "";
  const safeIntro = intro ? escapeHtml(intro) : "";
  const safeFooterText = escapeHtml(footerText || "");
  const safeFooterMeta = footerMeta ? escapeHtml(footerMeta) : "";
  const safeCtaLabel = ctaLabel ? escapeHtml(ctaLabel) : "";
  const safeCtaHref = ctaHref ? escapeHtml(ctaHref) : "";
  const brandVisualMarkup = buildBrandVisualMarkup(logoSrc);
  const badgeMarkup = safeBadge
    ? `
        <span class="email-badge" style="display: inline-block; background: #171b33; color: #ffffff; border: 1px solid #171b33; border-radius: 999px; padding: 10px 16px; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;">
          ${safeBadge}
        </span>
      `
    : "";
  const eyebrowMarkup = safeEyebrow
    ? `
        <p class="email-eyebrow" style="margin: 0 0 14px; color: #6d7ca1; font-size: 12px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;">
          ${safeEyebrow}
        </p>
      `
    : "";
  const introMarkup = safeIntro
    ? `
        <p class="email-copy" style="margin: 14px 0 0; color: #66738f; font-size: 16px; line-height: 1.7;">
          ${safeIntro}
        </p>
      `
    : "";
  const ctaMarkup = safeCtaLabel && safeCtaHref
    ? `
        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 22px;">
          <tr>
            <td align="left" style="padding: 0;">
              <a href="${safeCtaHref}" class="email-button" style="display: inline-block; background-color: #171b33; color: #ffffff; border: 1px solid #171b33; text-decoration: none; font-weight: 800; font-size: 14px; line-height: 1; padding: 15px 24px; border-radius: 999px; box-shadow: 0 18px 32px rgba(23, 27, 51, 0.18);">
                ${safeCtaLabel}
              </a>
            </td>
          </tr>
        </table>
      `
    : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <title>${safeTitle}</title>
        <style>
          @media only screen and (max-width: 640px) {
            .email-shell {
              border-radius: 28px !important;
            }

            .email-pad {
              padding-left: 20px !important;
              padding-right: 20px !important;
            }

            .email-stack {
              display: block !important;
              width: 100% !important;
              text-align: left !important;
            }

            .email-badge-wrap {
              padding-top: 14px !important;
            }

            .email-title {
              font-size: 31px !important;
            }

            .email-grid-col {
              display: block !important;
              width: 100% !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
            }
          }

          @media (prefers-color-scheme: dark) {
            body,
            .email-bg {
              background-color: #12192b !important;
            }

            .email-shell {
              background: linear-gradient(160deg, #161f35 0%, #1d2741 58%, #2a2c42 100%) !important;
              border-color: #33415f !important;
            }

            .email-panel,
            .email-soft-card,
            .brand-mark {
              background: rgba(24, 33, 58, 0.92) !important;
              border-color: #32415f !important;
            }

            .email-title,
            .email-strong {
              color: #f5f7ff !important;
            }

            .email-copy,
            .email-meta,
            .email-footer,
            .email-footer-sub {
              color: #c2cce5 !important;
            }

            .email-eyebrow,
            .email-label {
              color: #9fb2dc !important;
            }

            .email-soft-card {
              background: #202c4a !important;
            }

            .email-link {
              color: #a8d0ff !important;
            }

            .email-note {
              background: #1f2944 !important;
              border-color: #33527d !important;
            }

            .email-warm-card {
              background: #2a2434 !important;
              border-color: #51435f !important;
            }

            .email-button {
              background-color: #f4f7ff !important;
              border-color: #f4f7ff !important;
              color: #171b33 !important;
            }

            .email-badge {
              background-color: #f4f7ff !important;
              border-color: #f4f7ff !important;
              color: #171b33 !important;
            }
          }

          [data-ogsc] .email-bg {
            background-color: #12192b !important;
          }

          [data-ogsc] .email-shell {
            background: linear-gradient(160deg, #161f35 0%, #1d2741 58%, #2a2c42 100%) !important;
            border-color: #33415f !important;
          }

          [data-ogsc] .email-panel,
          [data-ogsc] .email-soft-card,
          [data-ogsc] .brand-mark {
            background: rgba(24, 33, 58, 0.92) !important;
            border-color: #32415f !important;
          }

          [data-ogsc] .email-title,
          [data-ogsc] .email-strong {
            color: #f5f7ff !important;
          }

          [data-ogsc] .email-copy,
          [data-ogsc] .email-meta,
          [data-ogsc] .email-footer,
          [data-ogsc] .email-footer-sub {
            color: #c2cce5 !important;
          }

          [data-ogsc] .email-eyebrow,
          [data-ogsc] .email-label {
            color: #9fb2dc !important;
          }

          [data-ogsc] .email-soft-card {
            background: #202c4a !important;
          }

          [data-ogsc] .email-link {
            color: #a8d0ff !important;
          }

          [data-ogsc] .email-note {
            background: #1f2944 !important;
            border-color: #33527d !important;
          }

          [data-ogsc] .email-warm-card {
            background: #2a2434 !important;
            border-color: #51435f !important;
          }

          [data-ogsc] .email-button {
            background-color: #f4f7ff !important;
            border-color: #f4f7ff !important;
            color: #171b33 !important;
          }

          [data-ogsc] .email-badge {
            background-color: #f4f7ff !important;
            border-color: #f4f7ff !important;
            color: #171b33 !important;
          }
        </style>
      </head>
      <body class="email-bg" style="margin: 0; padding: 0; background-color: #dbe3fb; font-family: 'Segoe UI', Arial, sans-serif;">
        <div style="display: none; overflow: hidden; line-height: 1px; opacity: 0; max-height: 0; max-width: 0;">
          ${safePreviewText}
        </div>
        <table role="presentation" class="email-bg" style="width: 100%; border-collapse: collapse; background: radial-gradient(circle at top right, rgba(255, 226, 157, 0.45), transparent 34%), linear-gradient(180deg, #dbe3fb 0%, #edf1ff 52%, #e8ecfb 100%);">
          <tr>
            <td align="center" style="padding: 28px 12px;">
              <table role="presentation" class="email-shell" style="width: 100%; max-width: 700px; border-collapse: collapse; background: linear-gradient(145deg, rgba(255, 255, 255, 0.96) 0%, rgba(241, 245, 255, 0.96) 58%, rgba(255, 247, 230, 0.98) 100%); border: 1px solid #dfe6f6; border-radius: 36px; overflow: hidden; box-shadow: 0 28px 72px rgba(57, 72, 118, 0.16);">
                <tr>
                  <td class="email-pad" style="padding: 30px 34px 18px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td class="email-stack" style="width: 74px; vertical-align: middle;">
                          ${brandVisualMarkup}
                        </td>
                        <td class="email-stack" style="vertical-align: middle;">
                          <p class="email-strong" style="margin: 0; color: #1d2340; font-size: 24px; font-weight: 800; letter-spacing: -0.03em;">SmritiCare</p>
                          <p class="email-meta" style="margin: 5px 0 0; font-size: 14px; color: #7280a0; line-height: 1.5;">Bring every care detail into one calm flow</p>
                        </td>
                        <td class="email-stack email-badge-wrap" align="right" style="width: 156px; vertical-align: middle;">
                          ${badgeMarkup}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="email-pad" style="padding: 0 34px 18px;">
                    <div class="email-panel" style="background: rgba(255, 255, 255, 0.72); border: 1px solid #e5ebf7; border-radius: 30px; padding: 28px;">
                      ${eyebrowMarkup}
                      <h1 class="email-title" style="margin: 0; color: #1d2340; font-size: 38px; line-height: 1.04; letter-spacing: -0.06em;">
                        ${safeTitle}
                      </h1>
                      ${introMarkup}
                      ${bodyHtml || ""}
                      ${ctaMarkup}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="email-pad" style="padding: 0 34px 30px;">
                    <p class="email-footer" style="margin: 0; color: #6f7c99; font-size: 12px; line-height: 1.7;">
                      ${safeFooterText}
                    </p>
                    ${safeFooterMeta ? `<p class="email-footer-sub" style="margin: 6px 0 0; color: #8a96b1; font-size: 12px; line-height: 1.7;">${safeFooterMeta}</p>` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

module.exports = {
  EMAIL_LOGO_CID,
  getEmailLogoAttachment,
  escapeHtml,
  buildEmailLayout
};
