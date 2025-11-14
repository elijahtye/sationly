import { supabase } from './supabaseClient.js';

const tierButtons = document.querySelectorAll('.tier-button');
const messageEl = document.getElementById('tier-message');
const loadingOverlay = document.getElementById('loading-overlay');

// Prevent multiple redirects
let isRedirecting = false;

// Check for existing tier IMMEDIATELY on page load (before showing UI)
async function checkExistingTierImmediate() {
  if (isRedirecting) {
    console.log('[upword] Redirect already in progress, skipping...');
    return;
  }
  
  // Check if we just redirected here - if so, don't redirect again immediately
  const justRedirected = sessionStorage.getItem('justRedirected');
  if (justRedirected) {
    sessionStorage.removeItem('justRedirected');
    console.log('[upword] Just redirected here, skipping immediate check');
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
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[upword] Error checking subscription:', error);
      // If there's an error, show the tier selection page anyway (don't redirect)
      return;
    }

    // Only redirect to dashboard if user has tier3 (highest tier)
    // Tier1 and tier2 users should be able to stay and upgrade
    if (subscription && subscription.status === 'active') {
      const normalizedTier = String(subscription.tier || '').toLowerCase().trim();
      
      if (normalizedTier === 'tier3') {
        // User has tier3 (highest tier) - redirect to dashboard
        console.log('[upword] User has tier3 (highest tier) - redirecting to dashboard');
        isRedirecting = true;
        window.location.href = '/dashboard';
        return;
      } else {
        // User has tier1 or tier2 - allow them to stay and upgrade
        console.log('[upword] User has', normalizedTier, '- allowing access to tier selection page for upgrade');
        return;
      }
    }

    // No active subscription - continue loading the tier selection page
    console.log('[upword] No active tier found - showing tier selection');
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
            .single();
          
          if (subscription && subscription.status === 'active') {
            // User has a tier - go to dashboard
            window.location.href = '/dashboard';
          } else {
            // User signed in but no tier - go to landing page
            window.location.href = '/';
          }
        } else {
          // Not signed in - go to landing page
          window.location.href = 'index.html';
        }
      } catch (error) {
        console.error('[upword] Error checking tier for close button:', error);
        // On error, go to landing page
        window.location.href = 'index.html';
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

// Add event listeners to tier buttons
tierButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tier = btn.getAttribute('data-tier');
    selectTier(tier);
  });
});

// This function is now called immediately when script loads (above)
// Keeping this for reference but the immediate check happens first

