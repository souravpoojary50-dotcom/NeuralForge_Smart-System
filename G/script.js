/* =============================================
   NATIONAL SCHOLARSHIP PORTAL — script.js
   ============================================= */

"use strict";

/* ── CONSTANTS ─────────────────────────────── */
const DEMO_KEY         = "NSP25";
const LS_KEY           = "nsp_qr_payload";
const AUTOFILL_DELAY   = 80;   // ms between field fills
const EXTRACT_FAKE_MS  = 2200; // simulated extraction time

/* ── DEMO DATA (raw object, encoded as Base64 later) ── */
const DEMO_DATA = {
  fullName       : "Rahul Kumar Sharma",
  phone          : "+91 98765 43210",
  email          : "rahul.sharma@example.com",
  address        : "House No. 42, Neem Gali, Lajpat Nagar, New Delhi – 110024",
  aadhaar        : "1234 5678 9012",
  pan            : "ABCRS1234K",
  voterId        : "DL/04/056/123456",
  drivingLicence : "DL-0420110172345",
  passport       : "J8369854",
  bankName       : "State Bank of India",
  accountNumber  : "00112233445566",
  ifscCode       : "SBIN0001234",
  marks10        : "87.6%",
  marks12        : "91.2%",
  degree         : "B.Tech – Computer Science Engineering (3rd Year)",
  marriageCert   : "N/A",
  additionalDocs : "Income Certificate No. IC-2024-DL-08742"
};

/* ── FIELD MAP (fieldId → data key) ── */
const FIELD_MAP = {
  fullName       : "fullName",
  phone          : "phone",
  email          : "email",
  address        : "address",
  aadhaar        : "aadhaar",
  pan            : "pan",
  voterId        : "voterId",
  drivingLicence : "drivingLicence",
  passport       : "passport",
  bankName       : "bankName",
  accountNumber  : "accountNumber",
  ifscCode       : "ifscCode",
  marks10        : "marks10",
  marks12        : "marks12",
  degree         : "degree",
  marriageCert   : "marriageCert",
  additionalDocs : "additionalDocs"
};

/* ── SECTION → FIELDS mapping (for badge display) ── */
const SECTION_FIELDS = {
  "badge-personal" : ["fullName", "phone", "email", "address"],
  "badge-identity" : ["aadhaar", "pan", "voterId", "drivingLicence", "passport"],
  "badge-bank"     : ["bankName", "accountNumber", "ifscCode"],
  "badge-education": ["marks10", "marks12", "degree"],
  "badge-optional" : ["marriageCert", "additionalDocs"]
};

/* ── DOM REFS ───────────────────────────────── */
const pdfUpload    = document.getElementById("pdfUpload");
const uploadArea   = document.getElementById("uploadArea");
const fileInfo     = document.getElementById("fileInfo");
const fileName     = document.getElementById("fileName");
const fileSize     = document.getElementById("fileSize");
const removeFile   = document.getElementById("removeFile");
const extractKey   = document.getElementById("extractKey");
const extractBtn   = document.getElementById("extractBtn");
const btnText      = extractBtn.querySelector(".btn-text");
const btnLoader    = document.getElementById("btnLoader");
const errorAlert   = document.getElementById("errorAlert");
const successAlert = document.getElementById("successAlert");
const loadDemoBtn  = document.getElementById("loadDemoBtn");
const resetBtn     = document.getElementById("resetBtn");
const appForm      = document.getElementById("applicationForm");
const successModal = document.getElementById("successModal");
const appIdValue   = document.getElementById("appIdValue");
const modalClose   = document.getElementById("modalCloseBtn");

/* ── UTILITY FUNCTIONS ──────────────────────── */

/**
 * Encode an object to Base64 (simulate QR PDF encoding).
 * The "key" is used to add a simple checksum prefix so
 * decoding requires the right key.
 */
function encodeData(obj, key) {
  const json   = JSON.stringify(obj);
  const keyed  = key.toUpperCase() + "::" + json;
  return btoa(unescape(encodeURIComponent(keyed)));
}

/**
 * Decode Base64 back to object; verify the key prefix.
 */
function decodeData(encoded, key) {
  try {
    const raw    = decodeURIComponent(escape(atob(encoded)));
    const prefix = key.toUpperCase() + "::";
    if (!raw.startsWith(prefix)) return null;
    return JSON.parse(raw.slice(prefix.length));
  } catch {
    return null;
  }
}

/** Format bytes to human-readable string */
function formatBytes(bytes) {
  if (bytes < 1024)       return bytes + " B";
  if (bytes < 1048576)    return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(2) + " MB";
}

/** Generate a fake Application ID */
function generateAppId() {
  const chars  = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const year   = new Date().getFullYear();
  let   id     = "NSP" + year + "-";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3) id += "-";
  }
  return id;
}

/** Show alert, hide the other one */
function showAlert(type, message) {
  if (type === "error") {
    errorAlert.textContent   = "❌ " + message;
    errorAlert.style.display = "block";
    successAlert.style.display = "none";
  } else {
    successAlert.textContent   = "✅ " + message;
    successAlert.style.display = "block";
    errorAlert.style.display   = "none";
  }
}

function hideAlerts() {
  errorAlert.style.display   = "none";
  successAlert.style.display = "none";
}

/** Toggle loading state on Extract button */
function setExtracting(active) {
  extractBtn.disabled    = active;
  btnText.style.display  = active ? "none"  : "inline";
  btnLoader.style.display = active ? "inline" : "none";
}

/* ── FILE UPLOAD HANDLING ───────────────────── */

pdfUpload.addEventListener("change", function () {
  const file = pdfUpload.files[0];
  if (!file) return;
  handleFileSelected(file);
});

function handleFileSelected(file) {
  if (file.type !== "application/pdf") {
    showAlert("error", "Only PDF files are accepted. Please choose a valid PDF.");
    pdfUpload.value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showAlert("error", "File size exceeds 5 MB. Please upload a smaller file.");
    pdfUpload.value = "";
    return;
  }
  hideAlerts();
  fileName.textContent     = file.name;
  fileSize.textContent     = formatBytes(file.size);
  fileInfo.style.display   = "flex";
  uploadArea.style.display = "none";
}

removeFile.addEventListener("click", function () {
  pdfUpload.value          = "";
  fileInfo.style.display   = "none";
  uploadArea.style.display = "block";
  hideAlerts();
});

/* Drag & Drop */
uploadArea.addEventListener("dragover", function (e) {
  e.preventDefault();
  uploadArea.classList.add("drag-over");
});

uploadArea.addEventListener("dragleave", function () {
  uploadArea.classList.remove("drag-over");
});

uploadArea.addEventListener("drop", function (e) {
  e.preventDefault();
  uploadArea.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) handleFileSelected(file);
});

/* ── KEY INPUT: uppercase & alphanumeric only ── */
extractKey.addEventListener("input", function () {
  this.value = this.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
});

/* ── VALIDATE KEY ───────────────────────────── */
function validateKey(key) {
  if (!key)                          return { ok: false, msg: "Please enter a 5-character key." };
  if (key.length !== 5)              return { ok: false, msg: "Key must be exactly 5 alphanumeric characters." };
  if (!/^[A-Z0-9]{5}$/.test(key))   return { ok: false, msg: "Key must contain only letters and numbers." };
  return { ok: true };
}

/* ── LOAD DEMO DATA INTO localStorage ─────── */
loadDemoBtn.addEventListener("click", function () {
  const encoded = encodeData(DEMO_DATA, DEMO_KEY);
  localStorage.setItem(LS_KEY, encoded);

  /* Simulate a PDF being present */
  fileInfo.style.display   = "flex";
  uploadArea.style.display = "none";
  fileName.textContent     = "NSP_QR_Document_2024.pdf";
  fileSize.textContent     = "142.3 KB";

  extractKey.value = "";
  hideAlerts();
  showAlert("success", "Demo QR data loaded! Now enter key: NSP25 and click Extract Data.");

  loadDemoBtn.textContent = "✔ Demo Data Loaded";
  loadDemoBtn.disabled    = true;
  setTimeout(() => {
    loadDemoBtn.textContent = "Load Demo Data";
    loadDemoBtn.disabled    = false;
  }, 4000);
});

/* ── EXTRACT & AUTO-FILL ────────────────────── */
extractBtn.addEventListener("click", function () {
  hideAlerts();
  const key    = extractKey.value.trim().toUpperCase();
  const result = validateKey(key);

  if (!result.ok) {
    showAlert("error", result.msg);
    extractKey.focus();
    return;
  }

  /* Check for payload */
  const encoded = localStorage.getItem(LS_KEY);
  if (!encoded) {
    showAlert("error", "No valid QR data found. Please upload a QR PDF or use Demo Mode.");
    return;
  }

  /* Start extraction animation */
  setExtracting(true);
  applyShimmerToAllFields(true);

  setTimeout(function () {
    const data = decodeData(encoded, key);
    setExtracting(false);
    applyShimmerToAllFields(false);

    if (!data) {
      showAlert("error", "Invalid Key! The key you entered does not match the QR data. Please try again.");
      return;
    }

    autoFillForm(data);
    showAlert("success", "Data extracted successfully! All fields have been auto-filled from your QR document.");
    scrollToForm();
  }, EXTRACT_FAKE_MS);
});

/* ── SHIMMER ON ALL INPUTS ─────────────────── */
function applyShimmerToAllFields(on) {
  Object.keys(FIELD_MAP).forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (on) {
      el.classList.add("loading");
      el.value = "";
      el.classList.remove("auto-filled");
    } else {
      el.classList.remove("loading");
    }
  });
}

/* ── AUTO-FILL FORM ─────────────────────────── */
function autoFillForm(data) {
  const fieldIds = Object.keys(FIELD_MAP);
  fieldIds.forEach(function (id, index) {
    setTimeout(function () {
      const el    = document.getElementById(id);
      const key   = FIELD_MAP[id];
      if (!el) return;
      const val = data[key] || "";
      if (val) {
        el.value = val;
        el.classList.add("auto-filled");
        el.classList.remove("loading");
      }
    }, index * AUTOFILL_DELAY);
  });

  /* Show section badges after all fields filled */
  setTimeout(function () {
    Object.keys(SECTION_FIELDS).forEach(function (badgeId) {
      const badge = document.getElementById(badgeId);
      if (badge) badge.style.display = "inline-block";
    });
  }, fieldIds.length * AUTOFILL_DELAY + 200);
}

/* ── SCROLL TO FORM ─────────────────────────── */
function scrollToForm() {
  const sec = document.getElementById("sec-personal");
  if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ── RESET FORM ─────────────────────────────── */
resetBtn.addEventListener("click", function () {
  /* Reset all field values and classes */
  Object.keys(FIELD_MAP).forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = "";
    el.classList.remove("auto-filled", "loading");
  });

  /* Hide all section badges */
  Object.keys(SECTION_FIELDS).forEach(function (badgeId) {
    const badge = document.getElementById(badgeId);
    if (badge) badge.style.display = "none";
  });

  /* Reset upload area */
  pdfUpload.value          = "";
  fileInfo.style.display   = "none";
  uploadArea.style.display = "block";
  extractKey.value         = "";
  hideAlerts();

  /* Clear localStorage */
  localStorage.removeItem(LS_KEY);

  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ── FORM SUBMISSION ─────────────────────────── */
appForm.addEventListener("submit", function (e) {
  e.preventDefault();

  /* Basic required field check */
  const requiredIds = ["fullName", "phone", "email", "address", "aadhaar", "pan", "bankName", "accountNumber", "ifscCode", "marks10", "marks12", "degree"];
  let   allFilled   = true;
  let   firstEmpty  = null;

  requiredIds.forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!el.value.trim()) {
      allFilled = false;
      el.style.borderColor = "#e74c3c";
      if (!firstEmpty) firstEmpty = el;
    } else {
      el.style.borderColor = "";
    }
  });

  if (!allFilled) {
    showAlert("error", "Please fill all mandatory fields (marked with *) before submitting.");
    if (firstEmpty) firstEmpty.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  /* Show success modal */
  appIdValue.textContent  = generateAppId();
  successModal.style.display = "flex";
  document.body.style.overflow = "hidden";
});

/* ── MODAL CLOSE ─────────────────────────────── */
modalClose.addEventListener("click", function () {
  successModal.style.display   = "none";
  document.body.style.overflow = "";

  /* Full reset after successful submission */
  Object.keys(FIELD_MAP).forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = "";
    el.classList.remove("auto-filled", "loading");
    el.style.borderColor = "";
  });

  Object.keys(SECTION_FIELDS).forEach(function (badgeId) {
    const badge = document.getElementById(badgeId);
    if (badge) badge.style.display = "none";
  });

  pdfUpload.value          = "";
  fileInfo.style.display   = "none";
  uploadArea.style.display = "block";
  extractKey.value         = "";
  hideAlerts();
  localStorage.removeItem(LS_KEY);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ── CLOSE MODAL ON OVERLAY CLICK ──────────── */
successModal.addEventListener("click", function (e) {
  if (e.target === successModal) {
    modalClose.click();
  }
});

/* ── AADHAAR AUTO-FORMAT (XXXX XXXX XXXX) ─── */
document.getElementById("aadhaar").addEventListener("input", function () {
  let val = this.value.replace(/\D/g, "").slice(0, 12);
  val = val.replace(/(\d{4})(?=\d)/g, "$1 ");
  if (!this.classList.contains("auto-filled")) {
    this.value = val;
  }
});

/* ── PAN AUTO-UPPERCASE ─────────────────────── */
document.getElementById("pan").addEventListener("input", function () {
  if (!this.classList.contains("auto-filled")) {
    this.value = this.value.toUpperCase();
  }
});

/* ── IFSC AUTO-UPPERCASE ─────────────────────── */
document.getElementById("ifscCode").addEventListener("input", function () {
  if (!this.classList.contains("auto-filled")) {
    this.value = this.value.toUpperCase();
  }
});

/* ── PHONE NUMBER FORMAT ─────────────────────── */
document.getElementById("phone").addEventListener("input", function () {
  if (this.classList.contains("auto-filled")) return;
  let val = this.value.replace(/[^\d+\s-]/g, "");
  this.value = val;
});

/* ── CLEAR RED BORDER ON FOCUS ──────────────── */
document.querySelectorAll(".form-group input, .form-group textarea").forEach(function (el) {
  el.addEventListener("focus", function () {
    this.style.borderColor = "";
  });
});

/* ── ON PAGE LOAD: Check if data exists in LS ── */
(function initOnLoad() {
  const existing = localStorage.getItem(LS_KEY);
  if (existing) {
    fileName.textContent     = "NSP_QR_Document_2024.pdf";
    fileSize.textContent     = "Saved from previous session";
    fileInfo.style.display   = "flex";
    uploadArea.style.display = "none";
    showAlert("success", "A previous QR data session was found. Enter your key to extract data.");
  }
})();
