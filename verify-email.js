import { supabase } from './supabaseClient.js';

const resendBtn = document.getElementById('resend-btn');
const messageEl = document.getElementById('verification-message');
const resendStatusEl = document.getElementById('resend-status');
const emailDisplayEl = document.getElementById('email-display');

let resendCooldown = 0;
let resendCooldownInterval = null;

function showMessage(type, text) {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
}

function hideMessage() {
  messageEl.style.display = 'none';
}

function updateResendStatus(text, isError = false) {
  resendStatusEl.textContent = text;
  resendStatusEl.style.display = 'block';
  resendStatusEl.style.color = isError ? '#ffd9e1' : 'var(--text-muted)';
}

function hideResendStatus() {
  resendStatusEl.style.display = 'none';
}

function setResendCooldown(seconds) {
  resendCooldown = seconds;
  resendBtn.disabled = true;
  
  if (resendCooldownInterval) {
    clearInterval(resendCooldownInterval);
  }
  
  resendCooldownInterval = setInterval(() => {
    resendCooldown--;
    if (resendCooldown <= 0) {
      resendBtn.disabled = false;
      resendBtn.textContent = 'Resend Verification Email';
      clearInterval(resendCooldownInterval);
      hideResendStatus();
    } else {
      resendBtn.textContent = `Resend in ${resendCooldown}s`;
    }
  }, 1000);
}

// Get email from URL params or session
async function getEmail() {
  const urlParams = new URLSearchParams(window.location.search);
  const emailFromUrl = urlParams.get('email');
  
  if (emailFromUrl) {
    return emailFromUrl;
  }
  
  // Try to get from session
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      return session.user.email;
    }
  } catch (error) {
    console.warn('[upword] Could not get email from session:', error);
  }
  
  return 'your email address';
}

// Check if email is already verified
async function checkVerificationStatus() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      if (session.user.email_confirmed_at) {
        showMessage('success', 'Your email has been verified! Redirecting...');
        setTimeout(() => {
          window.location.replace('/select-tier');
        }, 2000);
        return true;
      }
    }
  } catch (error) {
    console.warn('[upword] Could not check verification status:', error);
  }
  return false;
}

// Handle email verification from URL hash
async function handleEmailVerification() {
  const hash = window.location.hash;
  if (!hash) return;
  
  // Parse hash parameters (format: #access_token=...&type=...)
  const hashParams = new URLSearchParams(hash.substring(1));
  const accessToken = hashParams.get('access_token');
  const type = hashParams.get('type');
  const tokenHash = hashParams.get('token_hash');
  
  if (type === 'signup' && (accessToken || tokenHash)) {
    try {
      showMessage('info', 'Verifying your email...');
      
      // If we have an access_token, we can set the session directly
      if (accessToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || ''
        });
        
        if (error) {
          throw error;
        }
        
        if (data.session) {
          showMessage('success', 'Email verified successfully! Redirecting...');
          setTimeout(() => {
            window.location.replace('/select-tier');
          }, 2000);
        }
      } else if (tokenHash) {
        // Alternative method using token_hash
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'signup'
        });
        
        if (error) {
          throw error;
        }
        
        if (data.session) {
          showMessage('success', 'Email verified successfully! Redirecting...');
          setTimeout(() => {
            window.location.replace('/select-tier');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('[upword] Email verification error:', error);
      showMessage('error', error.message || 'Failed to verify email. The link may have expired.');
    }
  }
}

// Resend verification email
resendBtn.addEventListener('click', async () => {
  hideMessage();
  hideResendStatus();
  resendBtn.disabled = true;
  resendBtn.innerHTML = '<span class="spinner"></span> Sending...';
  
  try {
    const email = await getEmail();
    
    if (!email || email === 'your email address') {
      throw new Error('Email address not found. Please sign up again.');
    }
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    });
    
    if (error) {
      throw error;
    }
    
    showMessage('success', 'Verification email sent! Please check your inbox.');
    updateResendStatus('Email sent successfully. Check your inbox and spam folder.');
    setResendCooldown(60); // 60 second cooldown
  } catch (error) {
    console.error('[upword] Resend verification error:', error);
    showMessage('error', error.message || 'Failed to resend verification email.');
    updateResendStatus(error.message || 'Failed to send email. Please try again.', true);
    resendBtn.disabled = false;
    resendBtn.textContent = 'Resend Verification Email';
  }
});

// Initialize page
(async function() {
  // Get and display email
  const email = await getEmail();
  emailDisplayEl.textContent = email;
  
  // Check if already verified
  const isVerified = await checkVerificationStatus();
  if (isVerified) {
    return;
  }
  
  // Handle email verification from URL
  await handleEmailVerification();
  
  // Set up periodic check for verification
  const checkInterval = setInterval(async () => {
    const verified = await checkVerificationStatus();
    if (verified) {
      clearInterval(checkInterval);
    }
  }, 3000); // Check every 3 seconds
  
  // Clean up interval on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(checkInterval);
    if (resendCooldownInterval) {
      clearInterval(resendCooldownInterval);
    }
  });
})();


