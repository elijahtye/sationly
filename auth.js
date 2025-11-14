import { supabase } from './supabaseClient.js';

const authForm = document.getElementById('auth-form');
const submitBtn = document.getElementById('submit-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const messageEl = document.getElementById('auth-message');
const statusEl = document.getElementById('auth-status');

// Prevent multiple redirects
let isRedirecting = false;

function showMessage(type, text) {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
}

function clearMessage() {
  messageEl.textContent = '';
  messageEl.style.display = 'none';
}

function updateStatus(session) {
  if (session?.user) {
    statusEl.textContent = `Signed in as ${session.user.email}`;
    signOutBtn.style.display = '';
    submitBtn.textContent = 'Continue';
  } else {
    statusEl.textContent = 'You are currently signed out.';
    signOutBtn.style.display = 'none';
    submitBtn.textContent = 'Sign In';
  }
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  const formData = new FormData(authForm);
  const email = formData.get('email')?.toString().trim();
  const password = formData.get('password')?.toString();

  if (!email || !password) {
    showMessage('error', 'Email and password are required.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    console.log('[upword] Sign-in successful, session:', data.session ? 'present' : 'missing');
    
    // Immediately redirect - use the session from the sign-in response directly
    if (data.session) {
      // Set redirect flag to prevent onAuthStateChange from interfering
      isRedirecting = true;
      
      // Set a fallback redirect in case the tier check fails or hangs
      const fallbackRedirect = setTimeout(() => {
        console.warn('[upword] Fallback redirect triggered - redirecting to tier selection');
        sessionStorage.setItem('justRedirected', 'true');
        window.location.href = '/select-tier';
      }, 2000); // 2 second fallback
      
      // Redirect immediately - check tier and redirect accordingly
      checkTierAndRedirectWithSession(data.session).then(() => {
        // Clear fallback if redirect succeeded
        clearTimeout(fallbackRedirect);
      }).catch((err) => {
        console.error('[upword] Error in redirect function:', err);
        clearTimeout(fallbackRedirect);
        // Force redirect on error
        sessionStorage.setItem('justRedirected', 'true');
        window.location.href = '/select-tier';
      });
      // Don't await - let redirect happen immediately
    } else {
      // Fallback: wait for auth state change (shouldn't happen normally)
      console.warn('[upword] No session in sign-in response, waiting for auth state change...');
      isRedirecting = true;
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe();
          checkTierAndRedirectWithSession(session);
        }
      });
    }
  } catch (error) {
    console.error('[upword] Sign in error:', error);
    isRedirecting = false; // Reset flag on error
    showMessage('error', error.message || 'Unable to sign in. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
});

async function checkTierAndRedirectWithSession(session) {
  if (isRedirecting) {
    console.log('[upword] Redirect already in progress, skipping...');
    return;
  }
  
  if (!session || !session.user) {
    console.error('[upword] Invalid session provided');
    // Even with invalid session, redirect to tier selection to be safe
    sessionStorage.setItem('justRedirected', 'true');
    window.location.href = '/select-tier';
    return;
  }
  
  try {
    isRedirecting = true;
    
    const userId = session.user.id;
    console.log('[upword] Checking tier for user:', userId);
    
    // Set a timeout fallback to ensure redirect happens even if query hangs
    const redirectTimeout = setTimeout(() => {
      console.warn('[upword] Tier check timeout - redirecting to tier selection');
      sessionStorage.setItem('justRedirected', 'true');
      window.location.href = '/select-tier';
    }, 5000); // 5 second timeout
    
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 errors

    // Clear timeout since we got a response
    clearTimeout(redirectTimeout);

    console.log('[upword] Subscription check result:', { subscription, error, errorCode: error?.code });

    // Handle errors - 406 or PGRST116 both mean no subscription found
    if (error) {
      // Check if it's a "no rows" error (PGRST116) or "not acceptable" error (406)
      if (error.code === 'PGRST116' || error.message?.includes('406') || error.status === 406) {
        // No subscription found - go to tier selection
        console.log('[upword] No subscription found - redirecting to tier selection');
        sessionStorage.setItem('justRedirected', 'true');
        window.location.href = '/select-tier';
        return;
      }
      // Other errors - still redirect to tier selection (safer)
      console.error('[upword] Error checking subscription:', error);
      sessionStorage.setItem('justRedirected', 'true');
      window.location.href = '/select-tier';
      return;
    }
    
    // If no data returned (maybeSingle returns null instead of error)
    if (!subscription) {
      console.log('[upword] No subscription found (null response) - redirecting to tier selection');
      sessionStorage.setItem('justRedirected', 'true');
      window.location.href = '/select-tier';
      return;
    }

    if (subscription && subscription.status === 'active') {
      // User has tier - go to dashboard
      console.log('[upword] User has active tier:', subscription.tier, '- redirecting to dashboard');
      sessionStorage.setItem('justRedirected', 'true');
      window.location.href = '/dashboard';
    } else {
      // No active tier - go to tier selection
      console.log('[upword] No active tier - redirecting to tier selection');
      sessionStorage.setItem('justRedirected', 'true');
      window.location.href = '/select-tier';
    }
  } catch (error) {
    console.error('[upword] Error checking tier after sign-in:', error);
    // On error, go to tier selection (safer)
    sessionStorage.setItem('justRedirected', 'true');
    window.location.href = '/select-tier';
  }
}

// Legacy function for backwards compatibility
async function checkTierAndRedirect() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await checkTierAndRedirectWithSession(session);
  }
}

signOutBtn.addEventListener('click', async () => {
  clearMessage();
  signOutBtn.disabled = true;
  signOutBtn.textContent = 'Signing out…';

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    showMessage('success', 'Signed out successfully.');
  } catch (error) {
    console.error('[upword] Sign out error:', error);
    showMessage('error', error.message || 'Unable to sign out right now.');
  } finally {
    signOutBtn.disabled = false;
    signOutBtn.textContent = 'Sign Out';
    updateStatus(null);
  }
});

async function bootstrapAuthState() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    // If user is already signed in, check tier and redirect accordingly
    if (data.session?.user) {
      console.log('[upword] User already signed in, checking tier...');
      const userId = data.session.user.id;
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('tier, status')
        .eq('user_id', userId)
        .single();
      
      if (subscription && subscription.status === 'active') {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/select-tier';
      }
      return;
    }
    
    updateStatus(data.session);
  } catch (error) {
    console.warn('[upword] Unable to fetch initial auth session:', error);
    statusEl.textContent = 'Unable to determine session state.';
  }
}

supabase.auth.onAuthStateChange(async (_event, session) => {
  // Only handle auth state changes if we're NOT already redirecting (to prevent double redirects)
  if (session?.user && !isRedirecting) {
    console.log('[upword] Auth state changed - user signed in, checking tier...');
    isRedirecting = true;
    
    try {
      const userId = session.user.id;
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('tier, status')
        .eq('user_id', userId)
        .single();
      
      if (subscription && subscription.status === 'active') {
        console.log('[upword] User has tier, redirecting to dashboard');
        window.location.href = '/dashboard';
      } else {
        console.log('[upword] User has no tier, redirecting to tier selection');
        window.location.href = '/select-tier';
      }
    } catch (error) {
      console.error('[upword] Error checking tier:', error);
      window.location.href = '/select-tier';
    }
    return;
  }
  
  // Only update status if we're not redirecting
  if (!isRedirecting) {
    updateStatus(session);
  }
});

bootstrapAuthState();
