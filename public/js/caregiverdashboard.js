/**
 * caregiverDashboard.js
 * Handles sidebar navigation for caregiver pages
 */

document.addEventListener("DOMContentLoaded", () => {

  // Load caregiver name into topbar
  loadCaregiverName();

  const sidebarLinks = document.querySelectorAll(".sidebar nav a");

  if (!sidebarLinks.length) return;

  const currentPath = window.location.pathname;

  sidebarLinks.forEach(link => {
    const href = link.getAttribute("href");

    // Highlight active page
    if (href === currentPath) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }

    // Safe navigation on click
    link.addEventListener("click", (e) => {
      if (!href || href === "#") {
        e.preventDefault();
        return;
      }

      // Prevent reload if already on same page
      if (href === currentPath) {
        e.preventDefault();
        return;
      }

      window.location.href = href;
    });
  });

});

async function loadCaregiverName() {
  try {
    const res = await fetch('/api/profile', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    if (data.user && data.user.name) {
      const el = document.getElementById('caregiverName');
      if (el) el.textContent = data.user.name;

      // Ensure strong title remains 'Caregiver'
      const strongEl = document.querySelector('.user div strong');
      if (strongEl) strongEl.textContent = 'Caregiver';
    }
  } catch (err) {
    console.error('Failed to load caregiver name:', err);
  }
}