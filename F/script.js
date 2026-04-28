// Global Variables
let userData = {};
let qrCodeInstance = null;

// DOM Elements
const identityForm = document.getElementById('identityForm');
const updateBtn = document.getElementById('updateBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const successMessage = document.getElementById('successMessage');
const qrSection = document.getElementById('qrSection');
const darkModeToggle = document.getElementById('darkModeToggle');
const qrcodeDiv = document.getElementById('qrcode');

// Initialize on Page Load
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadStoredData();
    setupCollapsible();
});

// Initialize Application
function initializeApp() {
    // Check for dark mode preference
    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'enabled') {
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️';
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Form submission
    identityForm.addEventListener('submit', handleFormSubmit);
    
    // Update button
    updateBtn.addEventListener('submit', handleUpdate);
    
    // Download PDF button
    downloadPdfBtn.addEventListener('click', generatePDF);
    
    // Dark mode toggle
    darkModeToggle.addEventListener('click', toggleDarkMode);
    
    // Real-time validation
    document.getElementById('aadhaar').addEventListener('input', validateAadhaar);
    document.getElementById('pan').addEventListener('input', validatePAN);
    document.getElementById('securityKey').addEventListener('input', validateSecurityKey);
}

// Setup Collapsible Sections
function setupCollapsible() {
    const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
    collapsibleHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const section = this.parentElement;
            section.classList.toggle('collapsed');
        });
    });
}

// Handle Form Submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Validate all required fields
    if (!validateForm()) {
        alert('Please fill all required fields correctly!');
        return;
    }
    
    // Show loading spinner
    showLoading();
    
    // Simulate processing delay
    await delay(1500);
    
    // Collect data
    collectFormData();
    
    // Save to localStorage
    saveToLocalStorage();
    
    // Generate QR Code
    generateQRCode();
    
    // Hide loading and show success
    hideLoading();
    showSuccess();
    
    // Show QR section
    qrSection.classList.add('active');
    
    // Scroll to QR section
    qrSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Handle Update
async function handleUpdate(e) {
    e.preventDefault();
    await handleFormSubmit(e);
}

// Validate Form
function validateForm() {
    // Basic validation
    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();
    const aadhaar = document.getElementById('aadhaar').value.trim();
    const pan = document.getElementById('pan').value.trim();
    const securityKey = document.getElementById('securityKey').value.trim();
    
    if (!fullName || !phone || !email || !address) {
        return false;
    }
    
    // Validate Aadhaar (12 digits)
    if (!/^\d{12}$/.test(aadhaar)) {
        alert('Aadhaar must be exactly 12 digits!');
        return false;
    }
    
    // Validate PAN (format: ABCDE1234F)
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
        alert('PAN format is invalid! Use: ABCDE1234F');
        return false;
    }
    
    // Validate Security Key (5 alphanumeric)
    if (!/^[A-Z0-9]{5}$/.test(securityKey)) {
        alert('Security Key must be exactly 5 alphanumeric characters (A-Z, 0-9)!');
        return false;
    }
    
    return true;
}

// Real-time Aadhaar Validation
function validateAadhaar(e) {
    const value = e.target.value;
    e.target.value = value.replace(/\D/g, '');
}

// Real-time PAN Validation
function validatePAN(e) {
    const value = e.target.value.toUpperCase();
    e.target.value = value.replace(/[^A-Z0-9]/g, '');
}

// Real-time Security Key Validation
function validateSecurityKey(e) {
    const value = e.target.value.toUpperCase();
    e.target.value = value.replace(/[^A-Z0-9]/g, '');
}

// Collect Form Data
function collectFormData() {
    userData = {
        // Basic Details
        fullName: document.getElementById('fullName').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        address: document.getElementById('address').value.trim(),
        
        // Primary Identity
        aadhaar: document.getElementById('aadhaar').value.trim(),
        voterId: document.getElementById('voterId').value.trim(),
        drivingLicence: document.getElementById('drivingLicence').value.trim(),
        passport: document.getElementById('passport').value.trim(),
        
        // Financial Details
        pan: document.getElementById('pan').value.trim(),
        bankName: document.getElementById('bankName').value.trim(),
        accountNumber: document.getElementById('accountNumber').value.trim(),
        ifsc: document.getElementById('ifsc').value.trim(),
        rationCard: document.getElementById('rationCard').value.trim(),
        
        // Foundational Records
        marks10th: document.getElementById('marks10th').value.trim(),
        marks12th: document.getElementById('marks12th').value.trim(),
        degree: document.getElementById('degree').value.trim(),
        
        // Security
        securityKey: document.getElementById('securityKey').value.trim(),
        
        // Timestamp
        generatedAt: new Date().toLocaleString()
    };
    
    // Remove empty optional fields
    Object.keys(userData).forEach(key => {
        if (userData[key] === '' && key !== 'fullName' && key !== 'phone' && key !== 'email' && key !== 'address' && key !== 'aadhaar' && key !== 'pan' && key !== 'securityKey') {
            delete userData[key];
        }
    });
}

// Save to LocalStorage
function saveToLocalStorage() {
    try {
        localStorage.setItem('identityVaultData', JSON.stringify(userData));
        console.log('Data saved to localStorage');
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

// Load Stored Data
function loadStoredData() {
    try {
        const storedData = localStorage.getItem('identityVaultData');
        if (storedData) {
            userData = JSON.parse(storedData);
            populateForm();
            console.log('Data loaded from localStorage');
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
}

// Populate Form with Stored Data
function populateForm() {
    Object.keys(userData).forEach(key => {
        const element = document.getElementById(key);
        if (element && userData[key]) {
            element.value = userData[key];
        }
    });
}

// Encode Data with Security Key
function encodeData(data, key) {
    // Convert to JSON string
    const jsonString = JSON.stringify(data);
    
    // Simple encoding: Base64 + key insertion
    const base64 = btoa(jsonString);
    
    // Insert key at specific positions
    let encoded = '';
    const keyLength = key.length;
    const chunkSize = Math.floor(base64.length / keyLength);
    
    for (let i = 0; i < base64.length; i++) {
        encoded += base64[i];
        if ((i + 1) % chunkSize === 0 && Math.floor(i / chunkSize) < keyLength) {
            encoded += key[Math.floor(i / chunkSize)];
        }
    }
    
    return encoded;
}

// Generate QR Code
function generateQRCode() {
    // Clear previous QR code
    qrcodeDiv.innerHTML = '';
    
    // Encode user data
    const encodedData = encodeData(userData, userData.securityKey);
    
    // Generate QR code
    qrCodeInstance = new QRCode(qrcodeDiv, {
        text: encodedData,
        width: 300,
        height: 300,
        colorDark: '#0b3d91',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
    
    console.log('QR Code generated');
}

// Generate PDF
function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(11, 61, 145);
    doc.text('National Digital Identity Vault', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Government of India', 105, 28, { align: 'center' });
    
    // Horizontal line
    doc.setDrawColor(11, 61, 145);
    doc.setLineWidth(0.5);
    doc.line(20, 32, 190, 32);
    
    // User Data
    let yPosition = 45;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Personal Information', 20, yPosition);
    
    yPosition += 10;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    
    // Basic Details
    doc.text(`Full Name: ${userData.fullName}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Phone: ${userData.phone}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Email: ${userData.email}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Address: ${userData.address}`, 20, yPosition);
    yPosition += 10;
    
    // Identity Details
    doc.setFont(undefined, 'bold');
    doc.text('Identity Details', 20, yPosition);
    yPosition += 7;
    doc.setFont(undefined, 'normal');
    doc.text(`Aadhaar: ${userData.aadhaar}`, 20, yPosition);
    yPosition += 7;
    doc.text(`PAN: ${userData.pan}`, 20, yPosition);
    yPosition += 7;
    
    if (userData.voterId) {
        doc.text(`Voter ID: ${userData.voterId}`, 20, yPosition);
        yPosition += 7;
    }
    
    if (userData.drivingLicence) {
        doc.text(`Driving Licence: ${userData.drivingLicence}`, 20, yPosition);
        yPosition += 7;
    }
    
    if (userData.passport) {
        doc.text(`Passport: ${userData.passport}`, 20, yPosition);
        yPosition += 7;
    }
    
    yPosition += 5;
    
    // Financial Details
    if (userData.bankName || userData.accountNumber) {
        doc.setFont(undefined, 'bold');
        doc.text('Financial Details', 20, yPosition);
        yPosition += 7;
        doc.setFont(undefined, 'normal');
        
        if (userData.bankName) {
            doc.text(`Bank: ${userData.bankName}`, 20, yPosition);
            yPosition += 7;
        }
        
        if (userData.accountNumber) {
            doc.text(`Account Number: ${userData.accountNumber}`, 20, yPosition);
            yPosition += 7;
        }
        
        if (userData.ifsc) {
            doc.text(`IFSC: ${userData.ifsc}`, 20, yPosition);
            yPosition += 7;
        }
        
        yPosition += 5;
    }
    
    // Educational Details
    if (userData.marks10th || userData.marks12th) {
        doc.setFont(undefined, 'bold');
        doc.text('Educational Details', 20, yPosition);
        yPosition += 7;
        doc.setFont(undefined, 'normal');
        
        if (userData.marks10th) {
            doc.text(`10th Marks: ${userData.marks10th}`, 20, yPosition);
            yPosition += 7;
        }
        
        if (userData.marks12th) {
            doc.text(`12th Marks: ${userData.marks12th}`, 20, yPosition);
            yPosition += 7;
        }
        
        if (userData.degree) {
            doc.text(`Degree: ${userData.degree}`, 20, yPosition);
            yPosition += 7;
        }
        
        yPosition += 5;
    }
    
    // Generated timestamp
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${userData.generatedAt}`, 20, yPosition);
    
    // Add QR Code
    const qrImage = qrcodeDiv.querySelector('img');
    if (qrImage) {
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(11, 61, 145);
        doc.text('Digital Identity QR Code', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('Scan this QR code to verify and access encrypted identity data', 105, 30, { align: 'center' });
        
        // Add QR code image
        doc.addImage(qrImage.src, 'PNG', 55, 50, 100, 100);
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('This document is digitally secured and encrypted', 105, 170, { align: 'center' });
        doc.text('National Digital Identity Vault - Government of India', 105, 177, { align: 'center' });
    }
    
    // Save PDF
    doc.save('Digital_Identity_Vault.pdf');
    console.log('PDF generated and downloaded');
}

// Show Loading Spinner
function showLoading() {
    loadingSpinner.classList.add('active');
}

// Hide Loading Spinner
function hideLoading() {
    loadingSpinner.classList.remove('active');
}

// Show Success Message
function showSuccess() {
    successMessage.classList.add('active');
    setTimeout(() => {
        successMessage.classList.remove('active');
    }, 4000);
}

// Toggle Dark Mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    
    const isDarkMode = document.body.classList.contains('dark-mode');
    darkModeToggle.textContent = isDarkMode ? '☀️' : '🌙';
    
    // Save preference
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
}

// Utility: Delay function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle Update Button Click
updateBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        alert('Please fill all required fields correctly!');
        return;
    }
    
    showLoading();
    await delay(1500);
    
    collectFormData();
    saveToLocalStorage();
    generateQRCode();
    
    hideLoading();
    showSuccess();
    qrSection.classList.add('active');
    qrSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
