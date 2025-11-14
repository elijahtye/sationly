// Paywall Modal Functionality
console.log('app.js loaded');

// Prevent multiple redirects
let isRedirecting = false;

// Check if user is signed in and redirect to dashboard if they have a tier
async function checkAuthAndRedirect() {
  // Don't run on auth/signup pages
  const currentPage = window.location.pathname;
  if (currentPage.includes('/auth') || currentPage.includes('/signup') || 
      currentPage.includes('/select-tier') || currentPage.includes('/dashboard')) {
    console.log('[upword] Skipping auth check on', currentPage);
    return;
  }

  // Check if we just redirected here - if so, don't redirect again
  const justRedirected = sessionStorage.getItem('justRedirected');
  if (justRedirected) {
    sessionStorage.removeItem('justRedirected');
    console.log('[upword] Just redirected here, skipping redirect check');
    showSignInButton(); // Just show button, don't redirect
    return;
  }

  if (isRedirecting) {
    console.log('[upword] Redirect already in progress, skipping...');
    return;
  }

  try {
    // Add a delay to ensure page is fully loaded
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Import supabase client dynamically
    const { supabase } = await import('./supabaseClient.js');
    
    if (!supabase) {
      console.warn('[upword] Supabase client not available');
      showSignInButton();
      return;
    }
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      // Not signed in - show sign in button (don't redirect, just show button)
      console.log('[upword] No active session - showing sign in button');
      showSignInButton();
      return;
    }

    // User is signed in - check if they have a tier
    const userId = session.user.id;
    
    try {
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('tier, status')
        .eq('user_id', userId)
        .single();

      // Handle subscription check errors gracefully
      if (error) {
        if (error.code === 'PGRST116') {
          // No subscription found - user is signed in but no tier
          console.log('[upword] User signed in but no subscription - showing dashboard button');
          showDashboardButton();
        } else {
          // Other error - log but don't redirect
          console.error('[upword] Error checking subscription:', error);
          showDashboardButton(); // Show dashboard button anyway
        }
        return;
      }

      if (subscription && subscription.status === 'active') {
        // User has active tier - DON'T auto-redirect from landing page
        // Just show dashboard button - let user click to go to dashboard
        // This prevents redirect loops and flashing
        console.log('[upword] User signed in with tier:', subscription.tier, '- showing dashboard button');
        showDashboardButton();
        return;
      }

      // Signed in but no active tier - show dashboard button and update "Get Started" button
      // User can stay on landing page, but buttons will take them to dashboard (which redirects to tier selection)
      console.log('[upword] User signed in but subscription not active - showing dashboard button');
      showDashboardButton();
      return; // Don't redirect - let them stay on landing page
    } catch (subError) {
      // Error checking subscription - don't redirect, just show button
      console.error('[upword] Error checking subscription:', subError);
      showDashboardButton();
    }
  } catch (error) {
    console.error('[upword] Error checking auth:', error);
    // On error, just show sign in button - DON'T redirect
    showSignInButton();
  }
}

function showSignInButton() {
  const navActions = document.getElementById('top-nav-actions');
  if (!navActions) return;
  
  // Clear any existing buttons and show sign-in button
  navActions.innerHTML = `
    <button
      type="button"
      class="secondary compact"
      onclick="window.location.href='/auth'; return false;"
    >
      Sign In
    </button>
  `;
  
  // Show sign in button in footer, hide sign out
  const footerAuthButtons = document.getElementById('footer-auth-buttons');
  const footerSignInBtn = document.getElementById('footer-sign-in-btn');
  const footerSignOutBtn = document.getElementById('footer-sign-out-btn');
  
  if (footerAuthButtons) {
    footerAuthButtons.style.display = 'flex';
  }
  if (footerSignInBtn) {
    footerSignInBtn.style.display = 'inline-block';
  }
  if (footerSignOutBtn) {
    footerSignOutBtn.style.display = 'none';
  }
  
  // Set "Get Started" button to go to signup
  const getStartedBtn = document.getElementById('get-started-btn');
  if (getStartedBtn) {
    getStartedBtn.onclick = () => {
      window.location.href = '/signup';
    };
  }
  
  // Also update any other "Get Started" buttons on the page
  const getStartedBtn2 = document.getElementById('get-started-btn-2');
  if (getStartedBtn2) {
    getStartedBtn2.onclick = () => {
      window.location.href = '/signup';
    };
  }
}

function showDashboardButton() {
  const navActions = document.getElementById('top-nav-actions');
  if (!navActions) return;
  
  // Clear any existing buttons (including sign-in button) and show dashboard button
  navActions.innerHTML = `
    <button
      type="button"
      class="secondary compact"
      onclick="window.location.href='/dashboard'; return false;"
    >
      Go to Dashboard
    </button>
  `;
  
  // Show sign out button in footer, hide sign in
  const footerAuthButtons = document.getElementById('footer-auth-buttons');
  const footerSignInBtn = document.getElementById('footer-sign-in-btn');
  const footerSignOutBtn = document.getElementById('footer-sign-out-btn');
  
  if (footerAuthButtons) {
    footerAuthButtons.style.display = 'flex';
  }
  if (footerSignInBtn) {
    footerSignInBtn.style.display = 'none';
  }
  if (footerSignOutBtn) {
    footerSignOutBtn.style.display = 'inline-block';
  }
  
  // Set "Get Started" button to go to dashboard (not signup)
  const getStartedBtn = document.getElementById('get-started-btn');
  if (getStartedBtn) {
    getStartedBtn.onclick = () => {
      window.location.href = '/dashboard';
    };
  }
  
  // Also update any other "Get Started" buttons on the page
  const getStartedBtn2 = document.getElementById('get-started-btn-2');
  if (getStartedBtn2) {
    getStartedBtn2.onclick = () => {
      window.location.href = '/dashboard';
    };
  }
}

// Initialize auth check on page load
document.addEventListener('DOMContentLoaded', function() {
  // Setup footer sign out button
  const footerSignOutBtn = document.getElementById('footer-sign-out-btn');
  if (footerSignOutBtn) {
    footerSignOutBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to sign out?')) {
        try {
          const { supabase } = await import('./supabaseClient.js');
          const { error } = await supabase.auth.signOut();

          if (error) {
            console.error('[upword] Sign out error:', error);
            alert('Unable to sign out. Please try again.');
            return;
          }

          // Redirect to home page after sign out
          window.location.href = '/';
        } catch (error) {
          console.error('[upword] Sign out error:', error);
          alert('Unable to sign out. Please try again.');
        }
      }
    });
  }

  // Setup footer sign in button
  const footerSignInBtn = document.getElementById('footer-sign-in-btn');
  if (footerSignInBtn) {
    footerSignInBtn.addEventListener('click', () => {
      window.location.href = '/auth';
    });
  }

  // Check auth status first (but don't block page load)
  // Only redirect if user has active tier - otherwise just show appropriate button
  // Use setTimeout to ensure page loads first
  setTimeout(() => {
    checkAuthAndRedirect().catch(err => {
      console.error('[upword] Auth check failed:', err);
      // On any error, just show sign in button - don't redirect
      showSignInButton();
    });
  }, 100);
});

// Functions are already defined in the head, just initialize the rest

// Initialize when DOM is ready
function initPaywall() {
  console.log('Initializing paywall...');
  
  const paywallOverlay = document.getElementById('paywall-overlay');
  const paywallClose = document.getElementById('paywall-close');
  const getStartedBtns = document.querySelectorAll('#get-started-btn, #get-started-btn-2');
  const tierButtons = document.querySelectorAll('.tier-button');

  console.log('Elements found:', {
    paywallOverlay: !!paywallOverlay,
    paywallClose: !!paywallClose,
    getStartedBtns: getStartedBtns.length,
    tierButtons: tierButtons.length
  });

  if (!paywallOverlay) {
    console.error('Paywall overlay not found');
    return;
  }

  // Event listeners for opening paywall
  console.log('Setting up event listeners for', getStartedBtns.length, 'buttons');
  getStartedBtns.forEach((btn, index) => {
    if (btn) {
      console.log(`Adding listener to button ${index}:`, btn.id, btn);
      // Remove any existing listeners first
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', function(e) {
        console.log('Button clicked:', newBtn.id);
        e.preventDefault();
        e.stopPropagation();
        window.openPaywall();
      });
    } else {
      console.warn(`Button ${index} is null`);
    }
  });

  // Close paywall on close button - scrolls to home
  if (paywallClose) {
    paywallClose.addEventListener('click', window.closePaywallAndGoHome);
  }

  // Close paywall on overlay click (outside modal)
  paywallOverlay.addEventListener('click', (e) => {
    if (e.target === paywallOverlay) {
      window.closePaywall();
    }
  });

  // Close paywall on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && paywallOverlay.style.display === 'flex') {
      window.closePaywall();
    }
  });

  // Handle tier selection
  tierButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tier = btn.getAttribute('data-tier');
      console.log(`Selected tier: ${tier}`);
      
      // Simulate payment processing
      // In a real app, this would redirect to Stripe/PayPal/etc.
      // For now, we'll redirect to dashboard after a brief delay
      
      if (tier === 'free') {
        alert('You\'ve selected the Free plan. Redirecting to dashboard...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      } else {
        // For paid tiers, show payment message then redirect
        alert(`You've selected ${tier === 'monthly' ? 'the Monthly plan ($15/month)' : 'the Lifetime plan ($200 one-time)'}. In a real implementation, this would redirect to payment processing. For now, redirecting to dashboard...`);
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      }
      
      window.closePaywall();
      
      // In a real app, you would:
      // 1. Redirect to payment processor (Stripe, PayPal, etc.)
      // 2. After successful payment, redirect to dashboard
      // 3. Store the user's subscription status in database
    });
  });
}

// Try multiple ways to ensure it runs
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPaywall);
} else {
  // DOM is already loaded
  initPaywall();
}

// Also try after a short delay as fallback
setTimeout(initPaywall, 100);

// =========================
// Recording + Session Flow
// =========================

function pickRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }

  const preferredTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=aac',
    'audio/mp4',
    'audio/mpeg'
  ];

  for (const type of preferredTypes) {
    try {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    } catch (error) {
      // ignore and try next candidate
    }
  }

  return '';
}

function mimeTypeToExtension(mimeType = '') {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('mp4') || normalized.includes('m4a')) return 'm4a';
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'mp3';
  if (normalized.includes('wav')) return 'wav';
  if (normalized.includes('ogg')) return 'ogg';
  if (normalized.includes('3gpp')) return '3gp';
  if (normalized.includes('aac')) return 'aac';
  return '';
}

function initRecordingFlow() {
  const practiceForm = document.getElementById('practice-form');
  const practiceSetup = document.querySelector('.practice-setup');
  const recordingInterface = document.getElementById('recording-interface');
  const feedbackInterface = document.getElementById('feedback-interface');
  const feedbackContent = document.getElementById('feedback-content');
  const startBtn = document.getElementById('start-recording-btn');
  const stopBtn = document.getElementById('stop-recording-btn');
  const endConversationBtn = document.getElementById('end-conversation-btn');
  const timerEl = document.getElementById('timer');
  const newSessionBtn = document.getElementById('new-session-btn');
  const conversationDisplay = document.querySelector('.conversation-messages');

  if (!practiceForm || !startBtn || !stopBtn || !endConversationBtn || !recordingInterface || !feedbackInterface) {
    return;
  }

  let mediaRecorder = null;
  let recordedChunks = [];
  let recordingStream = null;
  let timerInterval = null;
  let recordingStart = null;
  let segments = [];
  let currentGoal = '';
  let currentDuration = '';
  let recorderMimeType = '';
  let recorderFileExtension = 'webm';
  let autoStopTimeout = null;

  const escapeHtml = (str = '') =>
    String(str).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char] || char));

  const renderConversation = () => {
    if (!segments.length) {
      conversationDisplay.innerHTML = `
        <div class="conversation-message system">
          <p>Press "Start recording" to begin practicing your conversation.</p>
        </div>
      `;
      return;
    }

    const markup = segments
      .map((segment, index) => {
        const fixesList = segment.fixes
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join('');

        return `
          <div class="conversation-message user">
            <div class="message-header">
              <span>You</span>
              <span class="message-index">Turn ${index + 1}</span>
            </div>
            <p>${escapeHtml(segment.transcript || '').replace(/\n/g, '<br />')}</p>
          </div>
          <div class="conversation-message ai">
            <div class="message-header">
              <span>Coach</span>
              <span class="message-badge">Rating: ${escapeHtml(segment.rating)}</span>
            </div>
            <p>${escapeHtml(segment.response || '').replace(/\n/g, '<br />')}</p>
            <div class="message-fixes">
              <strong>Fixes</strong>
              <ul>${fixesList}</ul>
            </div>
          </div>
        `;
      })
      .join('');

    conversationDisplay.innerHTML = markup;
    conversationDisplay.scrollTop = conversationDisplay.scrollHeight;
  };

  const addPendingMessage = () => {
    const node = document.createElement('div');
    node.className = 'conversation-message system';
    node.innerHTML = '<p>Analyzing this turn...</p>';
    conversationDisplay.appendChild(node);
    conversationDisplay.scrollTop = conversationDisplay.scrollHeight;
    return node;
  };

  const addErrorMessage = (message, details) => {
    const node = document.createElement('div');
    node.className = 'conversation-message error';
    node.innerHTML = `
      <strong>We couldn&#39;t analyze this turn.</strong>
      <p>${escapeHtml(message)}</p>
      ${details ? `<pre>${escapeHtml(details)}</pre>` : ''}
    `;
    conversationDisplay.appendChild(node);
    conversationDisplay.scrollTop = conversationDisplay.scrollHeight;
  };

  const resetTimer = () => {
    clearInterval(timerInterval);
    timerEl.textContent = '00:00';
  };

  const setInterfaceState = (state) => {
    switch (state) {
      case 'setup':
        if (practiceSetup) practiceSetup.style.display = '';
        recordingInterface.style.display = 'none';
        feedbackInterface.style.display = 'none';
        startBtn.disabled = false;
        stopBtn.disabled = true;
        endConversationBtn.disabled = true;
        break;
      case 'recording':
        if (practiceSetup) practiceSetup.style.display = 'none';
        recordingInterface.style.display = 'block';
        feedbackInterface.style.display = 'none';
        startBtn.disabled = true;
        stopBtn.disabled = false;
        endConversationBtn.disabled = true;
        break;
      case 'active':
        if (practiceSetup) practiceSetup.style.display = '';
        recordingInterface.style.display = 'block';
        feedbackInterface.style.display = 'none';
        startBtn.disabled = false;
        stopBtn.disabled = true;
        endConversationBtn.disabled = segments.length === 0;
        break;
      case 'feedback':
        practiceSetup.style.display = 'none';
        recordingInterface.style.display = 'none';
        feedbackInterface.style.display = 'block';
        startBtn.disabled = false;
        stopBtn.disabled = true;
        endConversationBtn.disabled = true;
        break;
      default:
        break;
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (recordingStream) {
      recordingStream.getTracks().forEach((track) => track.stop());
    }
    clearInterval(timerInterval);
    if (autoStopTimeout) {
      clearTimeout(autoStopTimeout);
      autoStopTimeout = null;
    }
    stopBtn.disabled = true;
  };

  const renderFinalSummary = () => {
    if (!segments.length) {
      alert('Record at least one turn before ending the conversation.');
      return;
    }

    const ratingSum = segments.reduce((sum, segment) => sum + (Number(segment.rating) || 0), 0);
    const averageRating = Math.round(ratingSum / segments.length);
    const mergedFixes = [...new Set(segments.flatMap((segment) => segment.fixes || []))];

    const transcriptHtml = segments
      .map(
        (segment, idx) => `
        <div class="transcript-turn">
          <h5>Turn ${idx + 1}</h5>
          <p><strong>You:</strong> ${escapeHtml(segment.transcript || '').replace(/\n/g, '<br />')}</p>
          <p><strong>Coach:</strong> ${escapeHtml(segment.response || '').replace(/\n/g, '<br />')}</p>
        </div>
      `
      )
      .join('');

    feedbackContent.innerHTML = `
      <div class="feedback-summary">
        <h4>Session Summary</h4>
        <p><strong>Goal:</strong> ${escapeHtml(currentGoal)}</p>
        <p><strong>Duration Target:</strong> ${escapeHtml(String(currentDuration))} minutes</p>
        <p><strong>Turns:</strong> ${segments.length}</p>
      </div>
      <div class="feedback-scores">
        <h4>Average Rating</h4>
        <p class="average-rating">${averageRating}/100</p>
      </div>
      <div class="feedback-tips">
        <h4>TIPS</h4>
        ${
          mergedFixes.length
            ? `<ul>${mergedFixes.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')}</ul>`
            : '<p>No fixes required — fantastic work!</p>'
        }
      </div>
      <div class="feedback-transcript">
        <h4>Conversation Transcript</h4>
        ${transcriptHtml}
      </div>
    `;

    setInterfaceState('feedback');
  };

  startBtn.addEventListener('click', async () => {
    const goalField = practiceForm.elements.goal;
    const durationField = practiceForm.elements.duration;
    const selectedGoal = goalField?.value;
    const selectedDuration = durationField?.value;

    if (!selectedGoal) {
      alert('Please select a conversation goal before recording.');
      goalField?.focus();
      return;
    }

    if (!currentDuration) {
      alert('Please choose a duration before recording.');
      durationField?.focus();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Audio recording is not supported in this browser.');
      return;
    }

    startBtn.disabled = true;

    try {
      currentGoal = selectedGoal === 'custom'
        ? (practiceForm.elements.customGoal?.value?.trim() || 'Personalized conversation practice')
        : selectedGoal;
      currentDuration = selectedDuration;

      recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunks = [];
      const preferredMimeType = pickRecorderMimeType();
      try {
        mediaRecorder = preferredMimeType
          ? new MediaRecorder(recordingStream, { mimeType: preferredMimeType })
          : new MediaRecorder(recordingStream);
      } catch (err) {
        console.warn('[upword] Preferred recorder mime type not supported, falling back.', err);
        mediaRecorder = new MediaRecorder(recordingStream);
      }

      recorderMimeType = mediaRecorder.mimeType || preferredMimeType || 'audio/webm';
      recorderFileExtension = mimeTypeToExtension(recorderMimeType) || 'webm';

      mediaRecorder.ondataavailable = (event) => {
        if (event.data?.size) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        resetTimer();

        const pendingNode = addPendingMessage();
        stopBtn.disabled = true;
        startBtn.disabled = true;
        endConversationBtn.disabled = true;

        try {
          const audioBlob = new Blob(recordedChunks, { type: recorderMimeType || 'audio/webm' });
          const formData = new FormData();

          const extension = recorderFileExtension || mimeTypeToExtension(audioBlob.type) || 'webm';
          const filename = `conversation-${Date.now()}.${extension}`;

          formData.append('audio', audioBlob, filename);
          const rawGoal = practiceForm.elements.goal?.value || '';
          const customGoal = practiceForm.elements.customGoal?.value?.trim() || '';

          formData.append('goal', currentGoal);
          formData.append('rawGoal', rawGoal);
          formData.append('customGoal', customGoal);
          formData.append('duration', currentDuration);
          if (recorderMimeType) {
            formData.append('mimeType', recorderMimeType);
          }
          if (extension) {
            formData.append('fileExtension', extension);
          }

          const response = await fetch('/api/sessions', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            const errorPayload = await response.json().catch(() => ({}));
            const message = errorPayload?.message || response.statusText || 'Failed to analyze conversation.';
            throw Object.assign(new Error(message), { details: errorPayload?.details });
          }

          const result = await response.json();
          segments.push({
            transcript: result.transcript,
            response: result.response,
            rating: Number(result.rating) || 0,
            fixes: Array.isArray(result.fixes) ? result.fixes : []
          });

          renderConversation();
        } catch (err) {
          console.error('[upword] Failed to process conversation turn:', err);
          addErrorMessage(err.message || 'Failed to analyze conversation.', err?.details);
        } finally {
          if (pendingNode && pendingNode.parentNode) {
            pendingNode.parentNode.removeChild(pendingNode);
          }
          startBtn.disabled = false;
          endConversationBtn.disabled = segments.length === 0;
          mediaRecorder = null;
          recordingStream = null;
          recordedChunks = [];
          recorderMimeType = '';
          recorderFileExtension = 'webm';
          setInterfaceState('active');
        }
      };

      mediaRecorder.start();
      recordingStart = Date.now();
      timerEl.textContent = '00:00';

      timerInterval = setInterval(() => {
        const elapsed = Date.now() - recordingStart;
        const seconds = Math.floor(elapsed / 1000);
        const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        timerEl.textContent = `${mins}:${secs}`;
      }, 500);

      setInterfaceState('recording');
    } catch (error) {
      console.error('[upword] Unable to start recording:', error);
      alert('Could not start recording. Please check microphone permissions.');
      startBtn.disabled = false;
      setInterfaceState(segments.length ? 'active' : 'setup');
    }
  });

  stopBtn.addEventListener('click', () => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      return;
    }
    stopRecording();
  });

  endConversationBtn.addEventListener('click', () => {
    renderFinalSummary();
  });

  newSessionBtn?.addEventListener('click', () => {
    if (recordingStream) {
      recordingStream.getTracks().forEach((track) => track.stop());
    }
    mediaRecorder = null;
    recordedChunks = [];
    segments = [];
    currentGoal = '';
    currentDuration = '';
    recorderMimeType = '';
    recorderFileExtension = 'webm';
    if (autoStopTimeout) {
      clearTimeout(autoStopTimeout);
      autoStopTimeout = null;
    }
    resetTimer();
    renderConversation();
    feedbackContent.innerHTML = '';
    setInterfaceState('setup');
  });

  renderConversation();
  setInterfaceState('setup');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRecordingFlow);
} else {
  initRecordingFlow();
}
