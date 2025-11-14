import { supabase } from './supabaseClient.js';

const tierButtons = document.querySelectorAll('.tier-button');
const messageEl = document.getElementById('tier-message');
const loadingOverlay = document.getElementById('loading-overlay');

// Ensure loading overlay is hidden by default (in case it shows before script loads)
if (loadingOverlay) {
  loadingOverlay.classList.remove('active');
}

// Prevent multiple redirects
let isRedirecting = false;

// Check for existing tier IMMEDIATELY on page load (before showing UI)
async function checkExistingTierImmediate() {
  if (isRedirecting) {
    console.log('[upword] Redirect already in progress, skipping...');
    return;
  }
  
  // Check if we just redirected here - if so, don't redirect again immediately
  // But still allow the page to load normally
  const justRedirected = sessionStorage.getItem('justRedirected');
  if (justRedirected) {
    sessionStorage.removeItem('justRedirected');
    console.log('[upword] Just redirected here, skipping immediate check - allowing page to load');
    // Ensure loading overlay is hidden so page is visible
    if (loadingOverlay) {
      loadingOverlay.classList.remove('active');
    }
    // Don't run the check - just allow page to load normally
    return;
  }
  
  try {
    console.log('[upword] Starting session check for tier selection...');
    
    // Use the same session restoration logic as dashboard
    let session = null;
    let sessionResolved = false;
    
    // First, try immediate check
    const immediateCheck = await supabase.auth.getSession();
    if (immediateCheck.data?.session?.user) {
      session = immediateCheck.data.session;
      console.log('[upword] Session found immediately:', session.user.email);
    } else {
      console.log('[upword] No immediate session, waiting for INITIAL_SESSION event...');
      
      // Wait for INITIAL_SESSION event (Supabase fires this when restoring from storage)
      const sessionPromise = new Promise((resolve) => {
        const timeout = setTimeout(() => {
          if (!sessionResolved) {
            sessionResolved = true;
            console.log('[upword] Timeout waiting for session - checking one more time...');
            supabase.auth.getSession().then(({ data: { session: finalSession } }) => {
              resolve(finalSession || null);
            });
          }
        }, 3000); // 3 second timeout
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, authSession) => {
          console.log('[upword] Auth state change event:', event, '- Session:', authSession ? 'present' : 'null');
          
          if (event === 'INITIAL_SESSION') {
            // INITIAL_SESSION might fire with null session - check getSession() instead
            if (!authSession || !authSession.user) {
              console.log('[upword] INITIAL_SESSION fired but session is null, checking getSession()...');
              setTimeout(async () => {
                const { data: { session: checkedSession } } = await supabase.auth.getSession();
                if (checkedSession && checkedSession.user && !sessionResolved) {
                  sessionResolved = true;
                  clearTimeout(timeout);
                  subscription.unsubscribe();
                  console.log('[upword] Session found via getSession() after INITIAL_SESSION:', checkedSession.user.email);
                  resolve(checkedSession);
                } else if (!sessionResolved) {
                  console.log('[upword] Still no session after INITIAL_SESSION event');
                }
              }, 500);
            } else if (authSession && authSession.user && !sessionResolved) {
              sessionResolved = true;
              clearTimeout(timeout);
              subscription.unsubscribe();
              console.log('[upword] Session restored via INITIAL_SESSION event:', authSession.user.email);
              resolve(authSession);
            }
          } else if (event === 'SIGNED_IN') {
            if (authSession && authSession.user && !sessionResolved) {
              sessionResolved = true;
              clearTimeout(timeout);
              subscription.unsubscribe();
              console.log('[upword] Session restored via SIGNED_IN event:', authSession.user.email);
              resolve(authSession);
            }
          } else if (event === 'SIGNED_OUT' && !sessionResolved) {
            sessionResolved = true;
            clearTimeout(timeout);
            subscription.unsubscribe();
            console.log('[upword] User signed out');
            resolve(null);
          }
        });
      });
      
      session = await sessionPromise;
    }
    
    // Check if user is signed in
    if (!session || !session.user) {
      console.log('[upword] No session found - redirecting to auth');
      isRedirecting = true;
      window.location.href = '/auth';
      return;
    }

    const userId = session.user.id;
    console.log('[upword] Checking for existing tier for user:', userId);

    // Check if user has an active subscription
    // Use maybeSingle() to avoid 406 errors when no subscription exists
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 errors

    // Handle errors - 406 or PGRST116 both mean no subscription found
    if (error) {
      // Check if it's a "no rows" error (PGRST116) or "not acceptable" error (406)
      if (error.code === 'PGRST116' || error.message?.includes('406') || error.status === 406) {
        // No subscription found - this is fine, show tier selection page
        console.log('[upword] No subscription found - showing tier selection');
      } else {
        // Other errors - log but still show tier selection page
        console.error('[upword] Error checking subscription:', error);
      }
      // Continue to show tier selection page regardless of error
      return;
    }

    // Allow ALL users to access tier selection page (no redirects)
    // Users with tiers can see their current tier marked, users without tiers can select one
    if (subscription && subscription.status === 'active') {
      const normalizedTier = String(subscription.tier || '').toLowerCase().trim();
      
      // Mark current tier with checkmark
      markCurrentTier(normalizedTier);
      console.log('[upword] User has tier:', normalizedTier, '- showing tier selection page');
    } else {
      // No active subscription - continue loading the tier selection page
      console.log('[upword] No active tier found - showing tier selection');
    }
  } catch (error) {
    console.error('[upword] Error checking existing tier:', error);
    // On error, show tier selection page (safer than blocking or redirecting)
  }
}

// Run check immediately when script loads
checkExistingTierImmediate();

// Add close button functionality
document.addEventListener('DOMContentLoaded', () => {
  const closeButton = document.getElementById('close-tier-page');
  if (closeButton) {
    closeButton.addEventListener('click', async () => {
      try {
        // Check if user has a tier - if yes, go to dashboard, otherwise go to landing page
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
          const userId = session.user.id;
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('tier, status')
            .eq('user_id', userId)
            .maybeSingle(); // Use maybeSingle() to avoid 406 errors
          
          if (subscription && subscription.status === 'active') {
            // User has a tier - go to dashboard
            window.location.href = '/dashboard';
          } else {
            // User signed in but no tier - go to landing page
            window.location.href = '/';
          }
        } else {
          // Not signed in - go to landing page
          window.location.href = '/';
        }
      } catch (error) {
        console.error('[upword] Error checking tier for close button:', error);
        // On error, go to landing page
        window.location.href = '/';
      }
    });
  }
});

function showMessage(type, text) {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
}

function hideMessage() {
  messageEl.style.display = 'none';
}

function showLoading() {
  loadingOverlay.classList.add('active');
}

function hideLoading() {
  loadingOverlay.classList.remove('active');
}

// Mark the current tier with a checkmark
function markCurrentTier(currentTier) {
  // Remove checkmarks from all buttons first
  tierButtons.forEach(btn => {
    btn.classList.remove('current-tier');
    const checkmark = btn.querySelector('.tier-checkmark');
    if (checkmark) {
      checkmark.remove();
    }
    // Reset button text
    const tier = btn.getAttribute('data-tier');
    if (tier === 'tier1') {
      btn.textContent = 'Select Free Plan';
    } else if (tier === 'tier2') {
      btn.textContent = 'Select Monthly Plan';
    } else if (tier === 'tier3') {
      btn.textContent = 'Select Lifetime Plan';
    }
  });

  // Find the button for the current tier
  const currentTierBtn = document.querySelector(`[data-tier="${currentTier}"]`);
  if (currentTierBtn) {
    currentTierBtn.classList.add('current-tier');
    
    // Add checkmark icon
    const checkmark = document.createElement('span');
    checkmark.className = 'tier-checkmark';
    checkmark.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    
    // Update button text
    if (currentTier === 'tier1') {
      currentTierBtn.textContent = 'Current Plan';
    } else if (currentTier === 'tier2') {
      currentTierBtn.textContent = 'Current Plan';
    } else if (currentTier === 'tier3') {
      currentTierBtn.textContent = 'Current Plan';
    }
    
    // Insert checkmark at the beginning
    currentTierBtn.insertBefore(checkmark, currentTierBtn.firstChild);
  }
}

async function selectTier(tier) {
  showLoading();
  hideMessage();

  try {
    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('You must be signed in to select a tier.');
    }

    const userId = session.user.id;

    if (tier === 'tier1') {
      // Free tier - create subscription via API (includes referral tracking)
      // Get referral code from localStorage if available
      const referralCode = window.referralTracker?.getReferralCode() || null;
      
      const response = await fetch('/api/create-tier1-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: userId,
          referralCode: referralCode
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create subscription');
      }

      showMessage('success', 'Free plan selected! Redirecting to dashboard...');
      setTimeout(() => {
        window.location.replace('/dashboard'); // Use replace to avoid back button issues
      }, 1500);
    } else {
      // Paid tiers - redirect to Stripe checkout
      // Get referral code from localStorage if available
      const referralCode = window.referralTracker?.getReferralCode() || null;
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          tier: tier,
          userId: userId,
          referralCode: referralCode
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create checkout session');
      }

      const { checkoutUrl } = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = checkoutUrl;
    }
  } catch (error) {
    console.error('[upword] Tier selection error:', error);
    showMessage('error', error.message || 'Failed to select tier. Please try again.');
    hideLoading();
  }
}

// Check and mark current tier on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Ensure loading overlay is hidden when page loads
  if (loadingOverlay) {
    loadingOverlay.classList.remove('active');
  }
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      const userId = session.user.id;
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('tier, status')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle() to avoid 406 errors
      
      if (subscription && subscription.status === 'active') {
        const normalizedTier = String(subscription.tier || '').toLowerCase().trim();
        markCurrentTier(normalizedTier);
      }
    }
  } catch (error) {
    console.error('[upword] Error checking tier for checkmark:', error);
  }
});

// Add event listeners to tier buttons
tierButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tier = btn.getAttribute('data-tier');
    selectTier(tier);
  });
});

// This function is now called immediately when script loads (above)
// Keeping this for reference but the immediate check happens first

