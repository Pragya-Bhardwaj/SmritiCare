// public/js/patientProfile.js

let currentProfileData = null;

/* ================= LOAD PROFILE DATA ================= */
async function loadProfile() {
  try {
    const res = await fetch("/api/profile");
    const data = await res.json();

    if (data.error) {
      alert("Failed to load profile");
      return;
    }

    currentProfileData = data;

    // Set user basic info
    document.getElementById("userName").innerText = data.user.name;
    document.getElementById("userEmail").innerText = data.user.email;
    document.getElementById("name").value = data.user.name;
    document.getElementById("email").value = data.user.email;

    // Set avatar initial
    const initial = data.user.name.charAt(0).toUpperCase();
    document.getElementById("avatarInitial").innerText = initial;

    // Populate profile fields
    if (data.profile) {
      const profile = data.profile;

      document.getElementById("phone").value = profile.phone || "";
      document.getElementById("gender").value = profile.gender || "";
      document.getElementById("dateOfBirth").value = profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : "";
      document.getElementById("bloodGroup").value = profile.bloodGroup || "";
      document.getElementById("medicalCondition").value = profile.medicalCondition || "";

      // Emergency contact
      if (profile.emergencyContact) {
        document.getElementById("emergencyName").value = profile.emergencyContact.name || "";
        document.getElementById("emergencyPhone").value = profile.emergencyContact.phone || "";
        document.getElementById("emergencyRelation").value = profile.emergencyContact.relation || "";
      }

      // Address
      if (profile.address) {
        document.getElementById("street").value = profile.address.street || "";
        document.getElementById("city").value = profile.address.city || "";
        document.getElementById("state").value = profile.address.state || "";
        document.getElementById("pincode").value = profile.address.pincode || "";
      }

      // Profile image
      if (profile.profileImage) {
        document.getElementById("avatarImage").src = profile.profileImage;
        document.getElementById("avatarImage").style.display = "block";
        document.getElementById("avatarInitial").style.display = "none";
      }
    }

    // Load caregiver details if linked
    if (data.linkedUser && data.linkedProfile) {
      displayCaregiverDetails(data.linkedUser, data.linkedProfile);
    }

  } catch (err) {
    console.error("Load profile error:", err);
    alert("Failed to load profile data");
  }
}

/* ================= DISPLAY CAREGIVER DETAILS ================= */
function displayCaregiverDetails(linkedUser, linkedProfile) {
  const container = document.getElementById("caregiverDetails");

  container.innerHTML = `
    <div class="info-row">
      <span class="info-label">Name</span>
      <span class="info-value">${linkedUser.name}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Email</span>
      <span class="info-value">${linkedUser.email}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Phone</span>
      <span class="info-value">${linkedProfile.phone || "Not provided"}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Gender</span>
      <span class="info-value">${linkedProfile.gender || "Not provided"}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Relation</span>
      <span class="info-value">${linkedProfile.relationToPatient || "Not provided"}</span>
    </div>
  `;
}

/* ================= SAVE PROFILE ================= */
document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = {
    phone: document.getElementById("phone").value.trim(),
    gender: document.getElementById("gender").value,
    dateOfBirth: document.getElementById("dateOfBirth").value,
    bloodGroup: document.getElementById("bloodGroup").value,
    medicalCondition: document.getElementById("medicalCondition").value.trim(),
    emergencyContact: {
      name: document.getElementById("emergencyName").value.trim(),
      phone: document.getElementById("emergencyPhone").value.trim(),
      relation: document.getElementById("emergencyRelation").value.trim()
    },
    address: {
      street: document.getElementById("street").value.trim(),
      city: document.getElementById("city").value.trim(),
      state: document.getElementById("state").value.trim(),
      pincode: document.getElementById("pincode").value.trim()
    }
  };

  // Add profile image if exists
  const avatarImage = document.getElementById("avatarImage");
  if (avatarImage.src && avatarImage.style.display !== "none") {
    formData.profileImage = avatarImage.src;
  }

  try {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    const data = await res.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    alert("Profile updated successfully!");
    
    // Refresh profile status
    checkProfileStatus();

  } catch (err) {
    console.error("Update profile error:", err);
    alert("Failed to update profile");
  }
});

/* ================= HANDLE PROFILE IMAGE UPLOAD ================= */
document.getElementById("profileImageInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith("image/")) {
    alert("Please select an image file");
    return;
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    alert("Image size should be less than 2MB");
    return;
  }

  const reader = new FileReader();

  reader.onload = (event) => {
    const avatarImage = document.getElementById("avatarImage");
    const avatarInitial = document.getElementById("avatarInitial");

    avatarImage.src = event.target.result;
    avatarImage.style.display = "block";
    avatarInitial.style.display = "none";
  };

  reader.readAsDataURL(file);
});

/* ================= CHECK PROFILE STATUS ================= */
async function checkProfileStatus() {
  try {
    const res = await fetch("/api/profile/status");
    const data = await res.json();

    const badge = document.getElementById("profileBadge");
    
    if (!data.isProfileComplete) {
      badge.style.display = "inline";
      badge.title = "Complete your profile";
    } else {
      badge.style.display = "none";
    }

  } catch (err) {
    console.error("Profile status check error:", err);
  }
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", () => {
  loadProfile();
  checkProfileStatus();
});