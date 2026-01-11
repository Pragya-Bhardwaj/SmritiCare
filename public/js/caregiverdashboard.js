/**
 * caregiverDashboard.js
 * ------------------------
 * Handles sidebar navigation for caregiver pages
 */

document.addEventListener("DOMContentLoaded", () => {

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