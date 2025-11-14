import { supabase } from './supabaseClient.js';

const signupForm = document.getElementById('signup-form');
const displayNameInput = document.getElementById('signup-display-name');
const emailInput = document.getElementById('signup-email');
const passwordInput = document.getElementById('signup-password');
const submitBtn = document.getElementById('signup-submit-btn');
const messageEl = document.getElementById('signup-message');
const statusEl = document.getElementById('signup-status');

function showMessage(type, text) {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
}

function clearMessage() {
  messageEl.textContent = '';
  messageEl.style.display = 'none';
}

async function bootstrapSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const session = data.session;
    
    // If user is already signed in, check tier and redirect accordingly
    if (session?.user) {
      console.log('[upword] User already signed in, checking tier...');
      const userId = session.user.id;
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
    
    statusEl.textContent = 'You are currently signed out.';
  } catch (error) {
    console.warn('[upword] Unable to fetch session:', error);
    statusEl.textContent = 'Unable to determine session state.';
  }
}

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const displayName = displayNameInput.value.trim();

  if (!displayName) {
    showMessage('error', 'Display name is required.');
    return;
  }

  if (!email || !password) {
    showMessage('error', 'Email and password are required.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account…';

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName
        }
      }
    });

    if (error) {
      throw error;
    }

    // If signup was successful and user is immediately signed in (email confirmation disabled)
    if (data.session) {
      showMessage('success', 'Account created! Redirecting to tier selection...');
      // Immediately redirect to tier selection (they don't have a tier yet)
      setTimeout(() => {
        sessionStorage.setItem('justRedirected', 'true');
        window.location.replace('/select-tier');
      }, 500);
      return;
    }

    showMessage(
      'success',
      'Account created! Please check your email for a confirmation link. You can sign in once you confirm.'
    );
    signupForm.reset();
    statusEl.textContent = 'Check your inbox to confirm your email, then sign in.';
  } catch (error) {
    console.error('[upword] Sign up error:', error);
    showMessage('error', error.message || 'Unable to create account. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create account';
  }
});

bootstrapSession();

