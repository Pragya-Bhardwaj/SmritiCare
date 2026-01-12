// public/js/profileStatusChecker.js
// Include this script on ALL dashboard pages to show profile completion badge

(async function checkProfileCompletion() {
  try {
    const res = await fetch("/api/profile/status");
    const data = await res.json();

    const profileLink = document.querySelector('a[href*="/profile"]');
    
    if (!profileLink) return;

    // Remove existing badge if any
    const existingBadge = profileLink.querySelector('.profile-badge');
    if (existingBadge) existingBadge.remove();

    if (!data.isProfileComplete) {
      const badge = document.createElement('span');
      badge.className = 'profile-badge';
      badge.innerHTML = '●';
      badge.style.cssText = 'color: #ef4444; font-size: 18px; margin-left: 8px; animation: pulse 2s infinite;';
      badge.title = 'Complete your profile';
      
      profileLink.appendChild(badge);

      // Add pulse animation
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