/* ================================================
   SPECTRE ACADEMY - STUDENT ADMISSION PORTAL
   script.js

   TABLE OF CONTENTS:
   1.  State & Configuration
   2.  LocalStorage: Save & Restore
   3.  Step Navigation (nextStep / prevStep)
   4.  Progress Bar & Step Indicators
   5.  Validation Engine
   6.  Field Validators
   7.  AI Validation Helper
   8.  Review Screen Builder (Step 4)
   9.  Form Submission
   10. Utility Functions
   11. Input Event Listeners
   12. Initialization
================================================ */


/* ================================================
   1. STATE & CONFIGURATION
================================================ */

let currentStep = 1;

let formData = {
  // Step 1: Personal Info
  firstName: '', lastName: '', dob: '', gender: '',
  email: '', phone: '', address: '',
  // Step 2: Education
  prevSchool: '', gradeCompleted: '', yearCompleted: '',
  gpa: '', achievements: '', applyingFor: '',
  // Step 3: Guardian
  guardianName: '', relationship: '', guardianPhone: '',
  guardianEmail: '', guardianOccupation: '', emergencyNote: ''
};

// Required fields per step (used for validation and event binding)
const stepFields = {
  1: ['firstName', 'lastName', 'dob', 'gender', 'email', 'phone', 'address'],
  2: ['prevSchool', 'gradeCompleted', 'yearCompleted', 'gpa', 'applyingFor'],
  3: ['guardianName', 'relationship', 'guardianPhone', 'guardianEmail']
};

// Optional fields per step (collected but not validated)
const optionalFields = {
  1: [],
  2: ['achievements'],
  3: ['guardianOccupation', 'emergencyNote']
};

const STORAGE_KEY = 'spectre_admission_data';
const STEP_KEY    = 'spectre_admission_step';
const LEGACY_STORAGE_KEY = 'westbrook_admission_data';
const LEGACY_STEP_KEY    = 'westbrook_admission_step';


/* ================================================
   2. LOCALSTORAGE: SAVE & RESTORE
================================================ */

function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    localStorage.setItem(STEP_KEY, String(currentStep));
  } catch (e) {
    console.warn('LocalStorage not available:', e);
  }
}

function restoreFromLocalStorage() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    const savedStep = localStorage.getItem(STEP_KEY) || localStorage.getItem(LEGACY_STEP_KEY);
    if (!savedData) return;

    const parsed = JSON.parse(savedData);
    Object.assign(formData, parsed);

    // Re-populate every form field from saved data
    Object.keys(formData).forEach(function(key) {
      const el = document.getElementById(key);
      if (el && formData[key]) el.value = formData[key];
    });

    // Restore step — clamp to 1–3; step 4 must be rebuilt from data
    if (savedStep) {
      const step = parseInt(savedStep, 10);
      if (step >= 1 && step <= 3) currentStep = step;
    }

    console.log('Form data restored from LocalStorage ✓');
  } catch (e) {
    console.warn('Could not restore from LocalStorage:', e);
  }
}

function clearLocalStorage() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STEP_KEY);
}


/* ================================================
   3. STEP NAVIGATION
================================================ */

function nextStep(stepNum) {
  collectStepData(stepNum);

  const isValid = validateStep(stepNum);
  if (!isValid) {
    runAISuggestions(stepNum);
    return;
  }

  saveToLocalStorage();

  if (stepNum === 3) buildReviewScreen();

  showStep(stepNum + 1);

  // Run AI on the next step after animation settles
  if (stepNum + 1 <= 3) {
    setTimeout(function() { runAISuggestions(stepNum + 1); }, 400);
  }
}

function prevStep(stepNum) {
  collectStepData(stepNum);
  saveToLocalStorage();
  showStep(stepNum - 1);
}

/**
 * goToStep — Used by Review screen Edit buttons to jump directly
 * to a specific step. Saves step-4 state and navigates cleanly
 * without the double-showStep bug that existed in the old inline onclick.
 * FIX #5: Replaced the broken `prevStep(4); showStep(n)` pattern.
 * FIX #6: updateProgress is called inside showStep, so it always fires.
 */
function goToStep(targetStep) {
  // Persist whatever state step 4 has before leaving
  saveToLocalStorage();
  showStep(targetStep);
}

/**
 * showStep — Central function: hides all steps, shows the target.
 * Always updates progress bar, dots, and sidebar.
 */
function showStep(targetStep) {
  document.querySelectorAll('.form-step').forEach(function(el) {
    el.classList.remove('active');
  });

  const targetId = (targetStep === 'success') ? 'stepSuccess' : 'step' + targetStep;
  const target   = document.getElementById(targetId);

  if (target) {
    target.classList.add('active');
    if (targetStep !== 'success') currentStep = targetStep;
  }

  // FIX #7 & #8: updateProgress and updateStepIndicators are called ONLY here.
  // submitApplication() and startOver() no longer call them directly.
  updateProgress(targetStep);
  updateStepIndicators(targetStep);
  updateSidebar(targetStep);

  const formPanel = document.querySelector('.form-panel');
  if (formPanel) formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


/* ================================================
   4. PROGRESS BAR & STEP INDICATORS
================================================ */

function updateProgress(step) {
  const fill  = document.getElementById('progressFill');
  const label = document.getElementById('progressLabel');
  if (!fill || !label) return;

  const percentages = { 1: 25, 2: 50, 3: 75, 4: 100, success: 100 };
  const labels = {
    1: 'Step 1 of 4 — 25%',
    2: 'Step 2 of 4 — 50%',
    3: 'Step 3 of 4 — 75%',
    4: 'Step 4 of 4 — 100%',
    success: 'Submitted — 100%'
  };

  const pct = percentages[step] || 25;
  fill.style.width  = pct + '%';
  label.textContent = labels[step] || '';

  const wrapper = fill.closest('[role="progressbar"]');
  if (wrapper) wrapper.setAttribute('aria-valuenow', pct);
}

function updateStepIndicators(activeStep) {
  const dots       = document.querySelectorAll('.step-dot');
  const connectors = document.querySelectorAll('.step-connector');

  // FIX #11: Guard against non-numeric activeStep (e.g. 'success')
  const numericStep = (typeof activeStep === 'number') ? activeStep : 5;

  dots.forEach(function(dot, index) {
    const stepNum = index + 1;
    dot.classList.remove('active', 'completed');

    if (stepNum < numericStep) {
      dot.classList.add('completed');
    } else if (stepNum === numericStep) {
      dot.classList.add('active');
    }
  });

  connectors.forEach(function(conn, index) {
    conn.classList.toggle('done', (index + 1) < numericStep);
  });
}

/**
 * updateSidebar — Updates sidebar step states.
 * FIX #10: Uses data-original attribute to restore original step numbers
 * (e.g. "01") after they were overwritten with "✓", so going back to
 * an earlier step correctly un-checks the sidebar item.
 */
function updateSidebar(activeStep) {
  const numericStep = (typeof activeStep === 'number') ? activeStep : 5;

  document.querySelectorAll('.side-step').forEach(function(el) {
    const stepNum   = parseInt(el.getAttribute('data-step'), 10);
    const numEl     = el.querySelector('.side-step-num');
    const original  = numEl ? numEl.getAttribute('data-original') : null;

    el.classList.remove('active', 'completed');

    if (stepNum === numericStep) {
      el.classList.add('active');
      // Restore original label (un-check if previously checked)
      if (numEl && original) numEl.textContent = original;
    } else if (stepNum < numericStep) {
      el.classList.add('completed');
      if (numEl) numEl.textContent = '✓';
    } else {
      // Future step — restore original label
      if (numEl && original) numEl.textContent = original;
    }
  });
}


/* ================================================
   5. VALIDATION ENGINE
================================================ */

function validateStep(stepNum) {
  const fields = stepFields[stepNum] || [];
  let allValid = true;
  fields.forEach(function(fieldId) {
    if (!validateField(fieldId)) allValid = false;
  });
  return allValid;
}

function validateField(fieldId) {
  const el      = document.getElementById(fieldId);
  const errorEl = document.getElementById('err-' + fieldId);
  if (!el) return true;

  const value  = el.value.trim();
  const result = runFieldValidator(fieldId, value);

  if (result.valid) {
    el.classList.remove('invalid');
    el.classList.add('valid');
    if (errorEl) errorEl.textContent = '';
  } else {
    el.classList.add('invalid');
    el.classList.remove('valid');
    if (errorEl) {
      errorEl.textContent = result.message;
      // Re-trigger shake animation
      errorEl.classList.remove('visible');
      void errorEl.offsetWidth; // Force reflow
      errorEl.classList.add('visible');
    }
  }

  return result.valid;
}


/* ================================================
   6. FIELD VALIDATORS
   Returns: { valid: boolean, message: string }

   FIXES applied here:
   #1  — Removed dead `age` variable (only `ageCheck` is used)
   #2  — isNaN check moved before any use of the Date object
   #3  — `case 'yearCompleted'` wrapped in a block to allow `const`
   #4  — Removed unreachable `value.length < 1` check on gpa
================================================ */

function runFieldValidator(fieldId, value) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phoneRegex = /^[+]?[\d\s\-().]{10,20}$/;
  const currentYear = new Date().getFullYear();

  switch (fieldId) {

    case 'firstName':
    case 'lastName': {
      const label = fieldId === 'firstName' ? 'First' : 'Last';
      if (!value)            return { valid: false, message: `${label} name is required.` };
      if (value.length < 2)  return { valid: false, message: `${label} name must be at least 2 characters.` };
      if (!/^[a-zA-Z\s'-]+$/.test(value)) return { valid: false, message: `${label} name should only contain letters.` };
      return { valid: true, message: '' };
    }

    case 'dob': {
      // FIX #2: Validate isNaN first, before using the Date object
      if (!value) return { valid: false, message: 'Date of birth is required.' };
      const dob = new Date(value);
      if (isNaN(dob.getTime())) return { valid: false, message: 'Please enter a valid date.' };
      const today = new Date();
      const ageCheck = today.getFullYear() - dob.getFullYear() - (
        today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0
      );
      // FIX #1: Removed dead `age` variable; only `ageCheck` is needed
      if (ageCheck < 10) return { valid: false, message: 'Applicant must be at least 10 years old.' };
      if (ageCheck > 25) return { valid: false, message: 'Please verify your date of birth.' };
      return { valid: true, message: '' };
    }

    case 'gender':
    case 'gradeCompleted':
    case 'applyingFor':
    case 'relationship':
      if (!value) return { valid: false, message: 'Please make a selection.' };
      return { valid: true, message: '' };

    case 'email':
    case 'guardianEmail':
      if (!value)                  return { valid: false, message: 'Email address is required.' };
      if (!emailRegex.test(value)) return { valid: false, message: 'Please enter a valid email address (e.g. name@domain.com).' };
      return { valid: true, message: '' };

    case 'phone':
    case 'guardianPhone':
      if (!value)                  return { valid: false, message: 'Phone number is required.' };
      if (!phoneRegex.test(value)) return { valid: false, message: 'Please enter a valid phone number (e.g. +234 812 345 6789).' };
      return { valid: true, message: '' };

    case 'address':
      if (!value)            return { valid: false, message: 'Home address is required.' };
      if (value.length < 15) return { valid: false, message: 'Please enter a more complete address (at least 15 characters).' };
      return { valid: true, message: '' };

    case 'prevSchool':
      if (!value)           return { valid: false, message: 'Previous school name is required.' };
      if (value.length < 5) return { valid: false, message: 'Please enter the full school name.' };
      return { valid: true, message: '' };

    // FIX #3: Wrapped in a block { } to allow `const yr` inside a case clause
    case 'yearCompleted': {
      if (!value) return { valid: false, message: 'Year of completion is required.' };
      const yr = parseInt(value, 10);
      if (isNaN(yr) || yr < 2000 || yr > currentYear) {
        return { valid: false, message: `Please enter a valid year between 2000 and ${currentYear}.` };
      }
      return { valid: true, message: '' };
    }

    case 'gpa':
      // FIX #4: Removed unreachable `value.length < 1` check — !value already catches empty
      if (!value) return { valid: false, message: 'Please enter your academic result or GPA.' };
      return { valid: true, message: '' };

    case 'guardianName':
      if (!value)            return { valid: false, message: "Guardian's full name is required." };
      if (value.length < 5)  return { valid: false, message: 'Please enter the full name.' };
      if (!/^[a-zA-Z\s'.,-]+$/.test(value)) return { valid: false, message: 'Name should only contain letters.' };
      return { valid: true, message: '' };

    default:
      if (!value) return { valid: false, message: 'This field is required.' };
      return { valid: true, message: '' };
  }
}


/* ================================================
   7. AI VALIDATION HELPER
================================================ */

function runAISuggestions(stepNum) {
  const outputEl = document.getElementById('aiOutput' + stepNum);
  if (!outputEl) return;

  collectStepData(stepNum);

  const suggestions = [];

  // ---- STEP 1 ----
  if (stepNum === 1) {
    if (formData.firstName && formData.firstName !== capitaliseWords(formData.firstName)) {
      suggestions.push({ icon: '✏️', title: 'Capitalise Your First Name',
        message: `Consider writing it as "${capitaliseWords(formData.firstName)}" — names are usually title-cased.` });
    }

    if (formData.lastName && formData.lastName !== capitaliseWords(formData.lastName)) {
      suggestions.push({ icon: '✏️', title: 'Capitalise Your Last Name',
        message: `Consider writing it as "${capitaliseWords(formData.lastName)}".` });
    }

    if (formData.firstName && formData.firstName.trim().length === 1) {
      suggestions.push({ icon: '⚠️', title: 'Very Short First Name',
        message: 'Your first name is only one character. Please enter your full legal first name.' });
    }

    if (formData.phone && !formData.phone.startsWith('+')) {
      suggestions.push({ icon: '📞', title: 'Add Country Code to Phone',
        message: `Consider adding your country code, e.g. "+234 ${formData.phone}".` });
    }

    if (formData.address && formData.address.split(',').length < 2) {
      suggestions.push({ icon: '📍', title: 'Incomplete Address',
        message: 'A complete address usually includes street, city, state, and country, separated by commas.' });
    }

    if (formData.email) {
      const domain = formData.email.split('@')[1] || '';
      if (domain === 'gmail' || domain === 'yahoo' || domain === 'hotmail') {
        suggestions.push({ icon: '📧', title: 'Check Email Domain',
          message: `"${formData.email}" may be missing ".com". Did you mean "${formData.email}.com"?` });
      }
    }
  }

  // ---- STEP 2 ----
  if (stepNum === 2) {
    if (formData.prevSchool && formData.prevSchool !== capitaliseWords(formData.prevSchool)) {
      suggestions.push({ icon: '✏️', title: 'Capitalise School Name',
        message: `Consider writing it as "${capitaliseWords(formData.prevSchool)}".` });
    }

    if (formData.yearCompleted) {
      const yr = parseInt(formData.yearCompleted, 10);
      if (yr > new Date().getFullYear()) {
        suggestions.push({ icon: '📅', title: 'Future Year Detected',
          message: `You entered ${yr}, which is in the future. Enter the expected year of completion if still enrolled.` });
      }
    }

    if (formData.gpa) {
      const gpaStr       = formData.gpa.toLowerCase().trim();
      const hasNumber    = /\d/.test(gpaStr);
      const isJustAlpha  = /^[a-z]+$/.test(gpaStr);
      if (!hasNumber && !isJustAlpha) {
        suggestions.push({ icon: '📊', title: 'Clarify GPA Format',
          message: 'Common formats include "4.5/5.0", "85%", "A1", or "Distinction".' });
      }
    }

    if (formData.achievements && formData.achievements.trim().length > 0 && formData.achievements.trim().length < 15) {
      suggestions.push({ icon: '🏆', title: 'Expand Your Achievements',
        message: 'Your achievements section is very brief. One or two sentences about an award or role can strengthen your application.' });
    }
  }

  // ---- STEP 3 ----
  if (stepNum === 3) {
    if (formData.guardianName && formData.guardianName.trim().split(/\s+/).length < 2) {
      suggestions.push({ icon: '👤', title: 'Enter Full Guardian Name',
        message: "Please provide the guardian's full name (first and last) for official records." });
    }

    if (formData.guardianPhone && formData.phone && formData.guardianPhone === formData.phone) {
      suggestions.push({ icon: '⚠️', title: 'Phone Numbers Match',
        message: "The guardian's phone matches the student's. Please double-check this is correct." });
    }

    if (formData.guardianEmail && formData.email &&
        formData.guardianEmail.toLowerCase() === formData.email.toLowerCase()) {
      suggestions.push({ icon: '⚠️', title: 'Email Addresses Match',
        message: "The guardian's email is the same as the student's. Consider using a different address." });
    }

    if (formData.guardianPhone && !formData.guardianPhone.startsWith('+')) {
      suggestions.push({ icon: '📞', title: 'Add Country Code',
        message: 'Consider adding the country code to the guardian\'s phone number (e.g. "+234 ...").' });
    }
  }

  // ---- RENDER ----
  const fields     = stepFields[stepNum] || [];
  const hasAnyData = fields.some(function(f) { return formData[f] && formData[f].trim(); });

  if (suggestions.length === 0) {
    outputEl.innerHTML = hasAnyData
      ? '<div class="ai-all-good"><span>✅</span><span>Everything looks good! No issues detected.</span></div>'
      : '<p class="ai-idle">Fill in the fields above — the assistant will check your entries and suggest improvements.</p>';
  } else {
    outputEl.innerHTML = suggestions.map(function(s, i) {
      return `<div class="ai-suggestion" style="animation-delay:${i * 0.08}s">
        <span class="ai-suggestion-icon">${s.icon}</span>
        <p class="ai-suggestion-text"><strong>${s.title}</strong>${s.message}</p>
      </div>`;
    }).join('');
  }
}


/* ================================================
   8. REVIEW SCREEN BUILDER
   FIX #5 (continued): Edit buttons now call goToStep(n)
   instead of the old broken `prevStep(4); showStep(n)`.
================================================ */

function buildReviewScreen() {
  const container = document.getElementById('reviewContainer');
  if (!container) return;

  const sections = [
    {
      title: '01 · Personal Information', step: 1,
      fields: [
        { label: 'First Name',   key: 'firstName' },
        { label: 'Last Name',    key: 'lastName' },
        { label: 'Date of Birth',key: 'dob', format: 'date' },
        { label: 'Gender',       key: 'gender' },
        { label: 'Email',        key: 'email',   full: true },
        { label: 'Phone',        key: 'phone' },
        { label: 'Home Address', key: 'address', full: true }
      ]
    },
    {
      title: '02 · Education Details', step: 2,
      fields: [
        { label: 'Previous School', key: 'prevSchool',     full: true },
        { label: 'Grade Completed', key: 'gradeCompleted' },
        { label: 'Year Completed',  key: 'yearCompleted' },
        { label: 'GPA / Score',     key: 'gpa' },
        { label: 'Applying For',    key: 'applyingFor' },
        { label: 'Achievements',    key: 'achievements',   full: true }
      ]
    },
    {
      title: '03 · Guardian Information', step: 3,
      fields: [
        { label: 'Guardian Name', key: 'guardianName',       full: true },
        { label: 'Relationship',  key: 'relationship' },
        { label: 'Phone',         key: 'guardianPhone' },
        { label: 'Email',         key: 'guardianEmail',      full: true },
        { label: 'Occupation',    key: 'guardianOccupation' },
        { label: 'Emergency Note',key: 'emergencyNote',      full: true }
      ]
    }
  ];

  container.innerHTML = sections.map(function(section) {
    const fieldsHtml = section.fields.map(function(field) {
      let val = formData[field.key] || '';
      if (field.format === 'date' && val) val = formatDateForDisplay(val);

      const isEmpty   = !val;
      const fullClass = field.full ? ' full' : '';

      return `<div class="review-field${fullClass}">
        <div class="review-field-label">${field.label}</div>
        <div class="review-field-value${isEmpty ? ' empty' : ''}">
          ${isEmpty ? '— not provided —' : escapeHtml(val)}
        </div>
      </div>`;
    }).join('');

    return `<div class="review-section">
      <div class="review-section-header">
        <span class="review-section-title">${section.title}</span>
        <button class="review-edit-btn" type="button" onclick="goToStep(${section.step})">✏ Edit</button>
      </div>
      <div class="review-fields">${fieldsHtml}</div>
    </div>`;
  }).join('');
}


/* ================================================
   9. FORM SUBMISSION
   FIX #7: Removed the redundant updateProgress('success')
   call — showStep('success') already calls it internally.
================================================ */

function submitApplication() {
  const checkbox = document.getElementById('declarationCheck');
  const errorEl  = document.getElementById('err-declaration');

  if (!checkbox || !checkbox.checked) {
    if (errorEl) errorEl.textContent = 'You must confirm the declaration before submitting.';
    const box = document.querySelector('.declaration-box');
    if (box) box.style.borderColor = 'var(--error)';
    return;
  }

  if (errorEl) errorEl.textContent = '';

  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.textContent = 'Submitting…';
    submitBtn.disabled = true;
  }

  setTimeout(function() {
    const refEl = document.getElementById('referenceNumber');
    if (refEl) refEl.textContent = generateReferenceNumber();

    // showStep handles updateProgress internally — no duplicate call needed
    showStep('success');
    clearLocalStorage();
  }, 1200);
}

/**
 * startOver — Resets the entire form.
 * FIX #8: Removed redundant updateProgress(1) call — showStep(1) handles it.
 */
function startOver() {
  Object.keys(formData).forEach(function(key) { formData[key] = ''; });

  document.querySelectorAll('.form-input').forEach(function(el) {
    el.value = '';
    el.classList.remove('valid', 'invalid');
  });

  const checkbox = document.getElementById('declarationCheck');
  if (checkbox) checkbox.checked = false;

  const decBox = document.querySelector('.declaration-box');
  if (decBox) decBox.style.borderColor = '';

  ['1', '2', '3'].forEach(function(n) {
    const el = document.getElementById('aiOutput' + n);
    if (el) el.innerHTML = '<p class="ai-idle">Fill in the fields above — the assistant will check your entries and suggest improvements.</p>';
  });

  clearLocalStorage();
  currentStep = 1;
  showStep(1);
}


/* ================================================
   10. UTILITY FUNCTIONS
================================================ */

function collectStepData(stepNum) {
  const allFields = (stepFields[stepNum] || []).concat(optionalFields[stepNum] || []);
  allFields.forEach(function(id) {
    const el = document.getElementById(id);
    if (el) formData[id] = el.value.trim();
  });
}

function generateReferenceNumber() {
  const year   = new Date().getFullYear();
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WBA-${year}-${suffix}`;
}

function capitaliseWords(str) {
  return str.toLowerCase().replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}

function formatDateForDisplay(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1] || ''} ${parts[0]}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function debounce(fn, delay) {
  let timer;
  return function() {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}


/* ================================================
   11. INPUT EVENT LISTENERS
   FIX #9: Text/email/tel/number/textarea/date fields
   use only the `input` event. `<select>` elements use
   only `change` (they don't fire `input`).
   This prevents double-validation + double LocalStorage
   writes on every blur of a text field.
================================================ */

function attachLiveValidation() {
  const debouncedAI = {
    1: debounce(function() { runAISuggestions(1); }, 800),
    2: debounce(function() { runAISuggestions(2); }, 800),
    3: debounce(function() { runAISuggestions(3); }, 800)
  };

  function bindField(id, stepNum) {
    const el = document.getElementById(id);
    if (!el) return;

    // Selects fire 'change'; all other inputs fire 'input'
    const eventName = (el.tagName === 'SELECT') ? 'change' : 'input';

    el.addEventListener(eventName, function() {
      collectStepData(stepNum);
      validateField(id);
      saveToLocalStorage();
      debouncedAI[stepNum]();
    });
  }

  // Bind required + optional fields for each step
  [1, 2, 3].forEach(function(step) {
    (stepFields[step] || []).concat(optionalFields[step] || []).forEach(function(id) {
      bindField(id, step);
    });
  });

  // Declaration checkbox — clear error state on check
  const checkbox = document.getElementById('declarationCheck');
  if (checkbox) {
    checkbox.addEventListener('change', function() {
      const errorEl = document.getElementById('err-declaration');
      const decBox  = document.querySelector('.declaration-box');
      if (this.checked) {
        if (errorEl) errorEl.textContent = '';
        if (decBox)  decBox.style.borderColor = '';
      }
    });
  }
}


/* ================================================
   12. INITIALIZATION
   FIX #19: Sets yearCompleted.max dynamically to
   current year, keeping it in sync with the validator.
================================================ */
document.addEventListener('DOMContentLoaded', function() {
  // Sync yearCompleted max attribute with current year
  const yearInput = document.getElementById('yearCompleted');
  if (yearInput) yearInput.setAttribute('max', String(new Date().getFullYear()));

  // Restore any saved form data
  restoreFromLocalStorage();

  // Show the correct starting step
  showStep(currentStep);

  // Wire up live validation
  attachLiveValidation();

  // If restoring mid-form, run AI on the current step
  if (Object.values(formData).some(function(v) { return v; })) {
    runAISuggestions(currentStep);
  }
});

