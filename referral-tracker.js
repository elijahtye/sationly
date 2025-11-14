/**
 * Referral Tracking System
 * Tracks influencer referral links and stores them for purchase attribution
 */

// Valid influencer codes (add more as needed)
const VALID_REFERRAL_CODES = ['elijahtye'];

/**
 * Store referral code in localStorage (persists across sessions)
 * @param {string} code - The referral code (e.g., 'elijahtye')
 */
function setReferralCode(code) {
  if (!code || typeof code !== 'string') return;
  
  const normalizedCode = code.toLowerCase().trim();
  
  // Only store if it's a valid referral code
  if (VALID_REFERRAL_CODES.includes(normalizedCode)) {
    localStorage.setItem('sationly_referral_code', normalizedCode);
    localStorage.setItem('sationly_referral_timestamp', Date.now().toString());
    console.log('[referral] Stored referral code:', normalizedCode);
    return true;
  }
  
  console.warn('[referral] Invalid referral code:', code);
  return false;
}

/**
 * Get stored referral code
 * @returns {string|null} The referral code or null if not set
 */
function getReferralCode() {
  const code = localStorage.getItem('sationly_referral_code');
  const timestamp = localStorage.getItem('sationly_referral_timestamp');
  
  // Check if referral is still valid (30 days)
  if (code && timestamp) {
    const age = Date.now() - parseInt(timestamp, 10);
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    
    if (age < thirtyDays) {
      return code;
    } else {
      // Expired, remove it
      clearReferralCode();
      return null;
    }
  }
  
  return null;
}

/**
 * Clear stored referral code
 */
function clearReferralCode() {
  localStorage.removeItem('sationly_referral_code');
  localStorage.removeItem('sationly_referral_timestamp');
}

/**
 * Check URL for referral code and store it
 * Called on page load
 */
function checkUrlForReferral() {
  const path = window.location.pathname;
  
  // Check if path is a referral link (e.g., /elijahtye)
  const pathParts = path.split('/').filter(p => p);
  
  if (pathParts.length === 1) {
    const potentialCode = pathParts[0].toLowerCase();
    
    if (VALID_REFERRAL_CODES.includes(potentialCode)) {
      setReferralCode(potentialCode);
      // Redirect to home page after storing referral
      if (path !== '/') {
        window.history.replaceState({}, '', '/');
      }
      return potentialCode;
    }
  }
  
  return null;
}

// Auto-check on load
if (typeof window !== 'undefined') {
  // Check URL immediately
  checkUrlForReferral();
  
  // Also check on DOMContentLoaded in case script loads early
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkUrlForReferral);
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.referralTracker = {
    setReferralCode,
    getReferralCode,
    clearReferralCode,
    checkUrlForReferral
  };
}

