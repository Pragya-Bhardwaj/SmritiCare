// public/js/profileStatusChecker.js
// Include this script on ALL dashboard pages to show profile completion badge

(async function checkProfileCompletion() {
  try {
    const res = await fetch("/api/profile/status", { credentials: 'include' });
    if (!res.ok) {
      try { await res.json(); } catch(e) { /* non-json response - probably an HTML 404 */ }
      console.warn('Profile status endpoint not available or returned an error:', res.status);
      return;
    }
    const data = await res.json();

    // Toggle the in-page profile badge if present (profile page uses #profileBadge)
    const pageProfileBadge = document.getElementById('profileBadge');
    const usePageBadge = !!pageProfileBadge;
    if (pageProfileBadge) {
      // Ensure the in-page badge uses the standard color and animation
      pageProfileBadge.style.cssText = data.isProfileComplete ? 'display:none;' : 'display:inline; color: #dc2626; font-size: 18px; margin-left: 8px; animation: pulse 2s infinite;';
    }

    const profileLink = document.querySelector('a[href*="/profile"]');
    if (!profileLink) return;

    // Remove existing appended badge if any
    const existingBadge = profileLink.querySelector('.profile-badge');
    if (existingBadge) existingBadge.remove();

    // Only append the link-level badge on pages that do NOT already have an in-page badge
    if (!data.isProfileComplete && !usePageBadge) {
      const badge = document.createElement('span');
      badge.className = 'profile-badge';
      badge.innerHTML = '●';
      badge.style.cssText = 'color: #dc2626; font-size: 18px; margin-left: 8px; ';
      badge.title = 'Complete your profile';

      profileLink.appendChild(badge);

      // Add pulse animation if missing
      if (!document.getElementById('pulseAnimation')) {
        const style = document.createElement('style');
        style.id = 'pulseAnimation';
        style.textContent = `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `;
        document.head.appendChild(style);
      }
    }

  } catch (err) {
    console.error("Profile status check error:", err);
  }
})();