// public/js/caregiverProfile.js

let currentProfileData = null;

function validatePhoneParts(countryCode, number) {
  // Returns { valid: boolean, error: string|null }
  if (!countryCode || typeof countryCode !== 'string' || countryCode.trim() === '') {
    return { valid: false, error: 'Please include country code (e.g., +91).' };
  }
  const cc = countryCode.trim();
  if (!cc.startsWith('+')) {
    return { valid: false, error: 'Country code must start with + (e.g., +91).' };
  }
  const ccDigits = cc.replace(/[^\d]/g, '');
  if (ccDigits.length < 1 || ccDigits.length > 3) {
    return { valid: false, error: 'Country code should be 1 to 3 digits.' };
  }

  if (!number || typeof number !== 'string' || number.trim() === '') {
    return { valid: false, error: 'Please enter a 10-digit phone number.' };
  }
  const num = number.replace(/[^\d]/g, '');
  if (num.length !== 10) {
    return { valid: false, error: 'Phone number must be exactly 10 digits.' };
  }
  if (/^0{10}$/.test(num)) {
    return { valid: false, error: 'Phone number cannot be all zeros.' };
  }

  return { valid: true, error: null };
}

function parsePhoneToParts(phone) {
  if (!phone || typeof phone !== 'string') return { country: '', number: '' };
  const trimmed = phone.trim();
  const compact = trimmed.replace(/[^\d+]/g, '');
  const m = compact.match(/^\+?(\d{1,3})(\d{10})$/);
  if (m) return { country: '+' + m[1], number: m[2] };
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const c = parts[0].startsWith('+') ? parts[0] : '+' + parts[0];
    const n = parts[1].replace(/[^\d]/g, '');
    return { country: c, number: n };
  }
  return { country: '', number: '' };
}

/* LOAD PROFILE DATA */
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

      const phoneParts = parsePhoneToParts(profile.phone || "");
      document.getElementById("phoneCountryCode").value = phoneParts.country;
      document.getElementById("phoneNumber").value = phoneParts.number;
      document.getElementById("gender").value = profile.gender || "";
      document.getElementById("dateOfBirth").value = profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : "";
      document.getElementById("relationToPatient").value = profile.relationToPatient || "";

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

    // Load patient details if linked
    if (data.linkedUser && data.linkedProfile) {
      displayPatientDetails(data.linkedUser, data.linkedProfile);
    }

  } catch (err) {
    console.error("Load profile error:", err);
    alert("Failed to load profile data");
  }
}

/* DISPLAY PATIENT DETAILS */
function displayPatientDetails(linkedUser, linkedProfile) {
  const container = document.getElementById("patientDetails");

  const age = linkedProfile.dateOfBirth ? calculateAge(linkedProfile.dateOfBirth) : "Not provided";

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
      <span class="info-label">Age</span>
      <span class="info-value">${age}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Blood Group</span>
      <span class="info-value">${linkedProfile.bloodGroup || "Not provided"}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Medical Condition</span>
      <span class="info-value">${linkedProfile.medicalCondition || "Not provided"}</span>
    </div>
    ${linkedProfile.emergencyContact && linkedProfile.emergencyContact.name ? `
      <div class="info-row">
        <span class="info-label">Emergency Contact</span>
        <span class="info-value">${linkedProfile.emergencyContact.name} (${linkedProfile.emergencyContact.phone || "N/A"})</span>
      </div>
    ` : ''}
  `;
}

/* CALCULATE AGE */
function calculateAge(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age + " years";
}

/* SAVE PROFILE */
document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const cc = document.getElementById("phoneCountryCode").value.trim();
  const num = document.getElementById("phoneNumber").value.trim();
  const phoneErrorEl = document.getElementById("phoneError");

  const validation = validatePhoneParts(cc, num);
  if (!validation.valid) {
    if (phoneErrorEl) phoneErrorEl.innerText = validation.error;
    // focus the specific field
    if (validation.error.toLowerCase().includes('country')) {
      document.getElementById("phoneCountryCode").focus();
    } else {
      document.getElementById("phoneNumber").focus();
    }
    return;
  } else {
    if (phoneErrorEl) phoneErrorEl.innerText = '';
  }

  const formData = {
    phone: `${cc} ${num}`,
    gender: document.getElementById("gender").value,
    dateOfBirth: document.getElementById("dateOfBirth").value,
    relationToPatient: document.getElementById("relationToPatient").value.trim(),
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

/* HANDLE PROFILE IMAGE UPLOAD */
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

/* CHECK PROFILE STATUS */
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

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
  loadProfile();
  checkProfileStatus();

  // Live validation for phone fields
  const ccEl = document.getElementById("phoneCountryCode");
  const numEl = document.getElementById("phoneNumber");
  const phoneErrorEl = document.getElementById("phoneError");

  if (ccEl && numEl && phoneErrorEl) {
    const liveValidate = () => {
      const v = validatePhoneParts(ccEl.value, numEl.value);
      phoneErrorEl.innerText = v.valid ? '' : v.error;
    };

    ccEl.addEventListener('input', liveValidate);
    numEl.addEventListener('input', liveValidate);
  }
});