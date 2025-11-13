/**
 * Dashboard client script placeholder.
 *
 * Add your recording + AI feedback logic here so that the file appears
 * in the Cursor editor tree.
 */
console.log('dashboard.js placeholder loaded.  Implement the dashboard logic here.');

// Dashboard functionality
console.log('Dashboard loaded');

let mediaRecorder = null;
let mediaStream = null;
let audioChunks = [];
let isRecording = false;
let recordingStartTime = null;
let timerInterval = null;
let currentGoal = '';
let currentDuration = 3;
let recorderMimeType = '';
let recorderFileExtension = 'webm';
let autoStopTimeout = null;
let conversationTurns = [];
let conversationCompleted = false;
let pendingConversationEnd = false;
let userTier = null; // Store user's tier
let isRedirecting = false; // Prevent multiple redirects
let tier1SessionCount = 0; // Track tier 1 session count
let tier1WeekStart = null; // Track when the week started for tier 1
let currentEnvironmentId = null; // Track current environment ID
let environmentStartTime = null; // Track when environment was created
let environmentTimerInterval = null; // Interval for environment timer
let currentEnvironmentDuration = null; // Track duration in minutes for current environment
let lastEnvironmentCreatedAt = null; // Track last environment creation date

// Initialize dashboard UI once DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Check if user has selected a tier
  await checkTierAndRedirect();
  
  // Load profile picture early (before other initializations)
  loadNavProfilePicture();
  
  initializeDashboard();
  loadSessionHistory();
  updateStats();
  initializeAccountModal();
  initializeHeaderScroll();
});

// Hide header on scroll down, show on scroll up
let lastScrollTop = 0;
let scrollTimeout = null;

function initializeHeaderScroll() {
  const header = document.querySelector('.dashboard-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Clear any existing timeout
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    
    // Hide header when scrolling down, show when scrolling up
    if (scrollTop > lastScrollTop && scrollTop > 100) {
      // Scrolling down - hide header
      header.classList.add('hidden');
    } else {
      // Scrolling up - show header
      header.classList.remove('hidden');
    }
    
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
  }, false);
}

// Check if user is signed in - only redirect if NOT signed in
async function checkTierAndRedirect() {
  if (isRedirecting) {
    console.log('[upword] Redirect already in progress, skipping...');
    return;
  }
  
  try {
    // Import supabase client dynamically
    const { supabase } = await import('./supabaseClient.js');
    
    // Wait for Supabase to restore session using auth state change listener
    // This is more reliable than polling getSession()
    console.log('[upword] Starting session check...');
    
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
              // Wait a moment and check getSession() directly
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
    
    // ONLY redirect if there's definitely no session
    if (!session || !session.user) {
      console.log('[upword] No session found - redirecting to auth');
      console.log('[upword] If you are signed in, try refreshing the page or signing in again.');
      isRedirecting = true;
      window.location.href = '/auth';
      return;
    }
    
    console.log('[upword] Session confirmed:', session.user.email);

    // User is signed in - now check for active tier
    const userId = session.user.id;
    console.log('[upword] User ID:', userId);

    // Check for active tier - REQUIRED for dashboard access
    console.log('[upword] Checking subscription for user_id:', userId);
    try {
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('tier, status')
        .eq('user_id', userId)
        .single();

      console.log('[upword] Subscription query result:', { 
        subscription, 
        error,
        errorCode: error?.code,
        errorMessage: error?.message
      });

      if (error && error.code === 'PGRST116') {
        // No subscription found - redirect to tier selection
        console.log('[upword] No subscription found - redirecting to tier selection');
        isRedirecting = true;
        window.location.href = '/select-tier';
        return;
      }

      if (error) {
        console.error('[upword] Error checking subscription:', error);
        // On error, redirect to tier selection to be safe
        isRedirecting = true;
        window.location.href = '/select-tier';
        return;
      }

      // Check if subscription exists and has valid tier
      if (!subscription) {
        console.log('[upword] No subscription object - redirecting to tier selection');
        isRedirecting = true;
        window.location.href = '/select-tier';
        return;
      }

      console.log('[upword] Subscription found:', {
        tier: subscription.tier,
        status: subscription.status,
        fullObject: subscription
      });

      // Check if tier is valid (tier1, tier2, or tier3)
      // Normalize tier value (lowercase, trim whitespace)
      const normalizedTier = String(subscription.tier || '').toLowerCase().trim();
      const validTiers = ['tier1', 'tier2', 'tier3'];
      const hasValidTier = validTiers.includes(normalizedTier);
      
      // Check if status is active (case-insensitive)
      const normalizedStatus = String(subscription.status || '').toLowerCase().trim();
      const isActive = normalizedStatus === 'active';

      console.log('[upword] Tier validation:', {
        originalTier: subscription.tier,
        normalizedTier,
        hasValidTier,
        originalStatus: subscription.status,
        normalizedStatus,
        isActive
      });

      if (!hasValidTier || !isActive) {
        // Invalid tier or inactive status - redirect to tier selection
        console.log('[upword] Invalid tier or inactive status - redirecting to tier selection');
        console.log('[upword] Reason:', {
          hasValidTier: hasValidTier ? 'YES' : 'NO',
          isActive: isActive ? 'YES' : 'NO'
        });
        isRedirecting = true;
        window.location.href = '/select-tier';
        return;
      }

      // User has valid active tier (tier1, tier2, or tier3) - allow access
      userTier = normalizedTier; // Use normalized tier value
      console.log('[upword] Access granted - User tier:', userTier);
      showUpgradeButton(userTier);
      // Visibility will be updated in initializeDashboard
    } catch (subError) {
      // Error checking subscription - redirect to tier selection
      console.error('[upword] Exception checking subscription:', subError);
      isRedirecting = true;
      window.location.href = 'select-tier.html';
      return;
    }
  } catch (error) {
    console.error('[upword] Error in auth check:', error);
    // Only redirect if we can't even check auth
    // If we got here, something is seriously wrong, so redirect to auth
    isRedirecting = true;
    window.location.href = 'auth.html';
  }
}

// Check tier 1 session count and cooldown based on last environment creation
async function checkTier1SessionLimit() {
  if (userTier !== 'tier1') return { allowed: true, count: 0, cooldownUntil: null };
  
  try {
    const { supabase } = await import('./supabaseClient.js');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { allowed: true, count: 0, cooldownUntil: null };
    
    // Query environments (not conversation_turns) to count sessions
    const { data: environments, error } = await supabase
      .from('environments')
      .select('started_at')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });
    
    if (error) {
      console.error('[upword] Error checking environment count:', error);
      return { allowed: true, count: 0, cooldownUntil: null };
    }
    
    const environmentCount = environments?.length || 0;
    tier1SessionCount = environmentCount;
    
    // Get the most recent environment creation date
    if (environments && environments.length > 0) {
      lastEnvironmentCreatedAt = new Date(environments[0].started_at);
    } else {
      lastEnvironmentCreatedAt = null;
    }
    
    // Check if limit reached (3/3)
    if (environmentCount >= 3) {
      if (lastEnvironmentCreatedAt) {
        // Calculate 1 week from last environment creation
        const cooldownUntil = new Date(lastEnvironmentCreatedAt);
        cooldownUntil.setDate(cooldownUntil.getDate() + 7);
        
        // Check if 1 week has passed
        const now = new Date();
        if (now >= cooldownUntil) {
          // 1 week has passed, allow new environment
          return { allowed: true, count: environmentCount, cooldownUntil: null };
        } else {
          // Still in cooldown period
          return { allowed: false, count: environmentCount, cooldownUntil };
        }
      } else {
        // No previous environments, but count is 3+ (shouldn't happen, but handle it)
        return { allowed: false, count: environmentCount, cooldownUntil: null };
      }
    }
    
    return { allowed: true, count: environmentCount, cooldownUntil: null };
  } catch (error) {
    console.error('[upword] Error in checkTier1SessionLimit:', error);
    return { allowed: true, count: 0, cooldownUntil: null };
  }
}

// Update custom goal panel and duration options based on tier
async function updateCustomGoalVisibility() {
  const customGoalInput = document.getElementById('custom-goal-input');
  const customGoalLock = document.getElementById('custom-goal-lock');
  const duration3 = document.getElementById('duration-3');
  const duration5 = document.getElementById('duration-5');
  const duration10 = document.getElementById('duration-10');
  const duration15 = document.getElementById('duration-15');
  const sessionInfo = document.getElementById('tier1-session-info');
  const sessionCountEl = document.getElementById('session-count');
  const cooldownMessage = document.getElementById('cooldown-message');
  
  if (userTier === 'tier1') {
    // Tier 1: Show lock icon, disable custom input, lock longer durations
    if (customGoalLock) customGoalLock.style.display = 'inline-flex';
    if (customGoalInput) {
      customGoalInput.disabled = true;
      customGoalInput.placeholder = 'Upgrade to Tier 2 or 3 to use custom goals';
    }
    
    // Lock 3, 5, 10, 15 minute options for tier 1
    [duration3, duration5, duration10, duration15].forEach(opt => {
      if (opt) {
        opt.disabled = true;
        opt.style.opacity = '0.5';
        opt.style.cursor = 'not-allowed';
        // Add lock indicator with SVG icon
        if (!opt.dataset.locked) {
          // Store original text
          const originalText = opt.textContent.trim();
          opt.dataset.originalText = originalText;
          const lockIcon = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-left: 6px; opacity: 0.5;"><path d="M8 1C6.34 1 5 2.34 5 4V5H4C3.45 5 3 5.45 3 6V13C3 13.55 3.45 14 4 14H12C12.55 14 13 13.55 13 13V6C13 5.45 12.55 5 12 5H11V4C11 2.34 9.66 1 8 1ZM8 2C9.1 2 10 2.9 10 4V5H6V4C6 2.9 6.9 2 8 2ZM4 6H12V13H4V6Z" fill="#999"/></svg>';
          opt.innerHTML = originalText + lockIcon;
          opt.dataset.locked = 'true';
        }
      }
    });
    
    // Set default to 2 minutes for tier 1
    const durationSelect = document.getElementById('duration');
    if (durationSelect && durationSelect.value !== '2') {
      durationSelect.value = '2';
    }
    
    // Show session info for tier 1
    if (sessionInfo) sessionInfo.style.display = 'block';
    
    // Check session limit
    const limitInfo = await checkTier1SessionLimit();
    if (sessionCountEl) {
      sessionCountEl.textContent = `${limitInfo.count}/3`;
      if (limitInfo.count >= 3) {
        sessionCountEl.style.color = 'var(--accent-warm)';
      } else {
        sessionCountEl.style.color = '';
      }
    }
    
    if (limitInfo.cooldownUntil && cooldownMessage) {
      const now = new Date();
      const msUntil = limitInfo.cooldownUntil - now;
      const daysUntil = Math.ceil(msUntil / (1000 * 60 * 60 * 24));
      const hoursUntil = Math.ceil(msUntil / (1000 * 60 * 60));
      
      if (daysUntil > 1) {
        cooldownMessage.textContent = `Limit reached (3/3). Wait ${daysUntil} day${daysUntil !== 1 ? 's' : ''} from last session or upgrade to continue.`;
      } else if (hoursUntil > 1) {
        cooldownMessage.textContent = `Limit reached (3/3). Wait ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''} from last session or upgrade to continue.`;
      } else {
        const minutesUntil = Math.ceil(msUntil / (1000 * 60));
        cooldownMessage.textContent = `Limit reached (3/3). Wait ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''} from last session or upgrade to continue.`;
      }
      cooldownMessage.style.display = 'block';
      cooldownMessage.style.color = 'var(--accent-warm)';
    } else if (cooldownMessage) {
      cooldownMessage.style.display = 'none';
    }
    
  } else if (userTier === 'tier2' || userTier === 'tier3') {
    // Tier 2 & 3: Hide lock icon, enable custom input, show all duration options
    if (customGoalLock) customGoalLock.style.display = 'none';
    if (customGoalInput) {
      customGoalInput.disabled = false;
      customGoalInput.placeholder = 'Describe your custom goal...';
    }
    
    // Enable all duration options
    [duration3, duration5, duration10, duration15].forEach(opt => {
      if (opt) {
        opt.disabled = false;
        opt.style.opacity = '';
        opt.style.cursor = '';
        // Remove lock indicator
        if (opt.dataset.locked) {
          // Restore original text
          const originalText = opt.dataset.originalText || opt.textContent.replace(/\s*🔒\s*/, '').trim();
          opt.textContent = originalText;
          delete opt.dataset.locked;
          delete opt.dataset.originalText;
        }
      }
    });
    
    // Show 10 and 15 minute options for tier 2/3
    if (duration10) duration10.style.display = '';
    if (duration15) duration15.style.display = '';
    
    // Hide session info
    if (sessionInfo) sessionInfo.style.display = 'none';
  }
}

// Show upgrade button for tier1 and tier2 users
function showUpgradeButton(tier) {
  const upgradeBtn = document.getElementById('upgrade-btn');
  if (!upgradeBtn) return;
  
  // Show upgrade button for tier1 and tier2 users only
  // If tier is null/undefined, also show it (user might not have selected a tier yet)
  if (!tier || tier === 'tier1' || tier === 'tier2') {
    upgradeBtn.style.display = 'block';
    // Set onclick handler (replace any existing)
    upgradeBtn.onclick = () => {
      window.location.href = 'select-tier.html';
    };
  } else {
    upgradeBtn.style.display = 'none';
  }
}

async function initializeDashboard() {
  const startSetupBtn = document.getElementById('start-recording-btn');
  const startTurnBtn = document.getElementById('start-turn-btn');
  const stopBtn = document.getElementById('stop-recording-btn');
  const endConversationBtn = document.getElementById('end-conversation-btn');
  const newSessionBtn = document.getElementById('new-session-btn');
  const practiceForm = document.getElementById('practice-form');
  const goalSelect = document.getElementById('conversation-goal');
  const customGoalInput = document.getElementById('custom-goal-input');

  // Update custom goal panel and duration options based on tier
  await updateCustomGoalVisibility();

  // Clear other goal when one is selected
  goalSelect?.addEventListener('change', () => {
    if (goalSelect.value && customGoalInput) {
      customGoalInput.value = '';
    }
  });

  customGoalInput?.addEventListener('input', () => {
    if (customGoalInput.value.trim() && goalSelect) {
      goalSelect.value = '';
    }
  });

  startSetupBtn?.addEventListener('click', startRecording);
  startTurnBtn?.addEventListener('click', startRecording);
  stopBtn?.addEventListener('click', stopRecording);
  endConversationBtn?.addEventListener('click', async () => {
    if (isRecording) {
      pendingConversationEnd = true;
      stopRecording();
      return;
    }
    await updateEnvironment();
    renderFinalSummary();
  });
  newSessionBtn?.addEventListener('click', resetToSetup);

  practiceForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    startRecording();
  });

  renderConversation();
  updateRecordingUI('setup');
}

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
      // Ignore and try the next type
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

function setRecordingIndicator(state) {
  const icon = document.getElementById('recording-icon');
  const label = document.getElementById('recording-status-label');
  const tip = document.getElementById('recording-tip');
  if (!icon || !label) return;

  icon.classList.remove('recording', 'processing', 'idle');

  switch (state) {
    case 'recording':
      icon.classList.add('recording');
      label.textContent = 'Recording';
      if (tip) {
        tip.textContent = 'Speak naturally. The AI will respond once you stop.';
      }
      break;
    case 'processing':
      icon.classList.add('processing');
      label.textContent = 'Processing';
      if (tip) {
        tip.textContent = 'Analyzing this turn... hang tight.';
      }
      break;
    case 'active':
      icon.classList.add('idle');
      label.textContent = conversationTurns.length ? 'Ready' : 'Idle';
      if (tip) {
        tip.textContent = conversationTurns.length
          ? 'Press start to record another turn.'
          : 'Press start to begin your first turn.';
      }
      break;
    case 'feedback':
      icon.classList.add('idle');
      label.textContent = 'Summary Ready';
      if (tip) {
        tip.textContent = 'Review your scores and tips below.';
      }
      break;
    default:
      icon.classList.add('idle');
      label.textContent = 'Idle';
      if (tip) {
        tip.textContent = 'Press start to begin your first turn.';
      }
      break;
  }
}

function renderConversation() {
  const container = document.getElementById('conversation-messages');
  if (!container) {
    return;
  }

  if (!conversationTurns.length) {
    container.innerHTML = `
      <div class="conversation-message system">
        <p>Press "Start Recording" to begin your conversation practice.</p>
      </div>
    `;
    return;
  }

  const markup = conversationTurns
    .map((turn, index) => {
      const fixesList = (turn.fixes || [])
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('');
      const showDetails = conversationCompleted;
      const ratingBadge = showDetails
        ? `<span class="message-badge">Rating: ${escapeHtml(String(turn.rating ?? '—'))}</span>`
        : '';
      const fixesSection =
        showDetails && fixesList
          ? `<div class="message-fixes">
              <strong>Fixes</strong>
              <ul>${fixesList}</ul>
            </div>`
          : '';
      const awaitingNotice = showDetails
        ? ''
        : '<p class="message-note">Rating and tips will appear after you end the conversation.</p>';

      return `
        <div class="conversation-message user">
          <div class="message-header">
            <span>You</span>
            <span class="message-index">Turn ${index + 1}</span>
          </div>
          <p>${escapeHtml(turn.transcript || '').replace(/\n/g, '<br />')}</p>
        </div>
        <div class="conversation-message ai">
          <div class="message-header">
            <span>Coach</span>
            ${ratingBadge}
          </div>
          <p>${escapeHtml(turn.response || '').replace(/\n/g, '<br />')}</p>
          ${fixesSection}
          ${awaitingNotice}
        </div>
      `;
    })
    .join('');

  container.innerHTML = markup;
  container.scrollTop = container.scrollHeight;
}

function addPendingMessage() {
  const container = document.getElementById('conversation-messages');
  if (!container) return null;

  const node = document.createElement('div');
  node.className = 'conversation-message system';
  node.innerHTML = '<p>Analyzing this turn...</p>';
  container.appendChild(node);
  container.scrollTop = container.scrollHeight;
  return node;
}

function addErrorMessage(message, details) {
  const container = document.getElementById('conversation-messages');
  if (!container) return;

  const node = document.createElement('div');
  node.className = 'conversation-message error';
  node.innerHTML = `
    <strong>We couldn't analyze this turn.</strong>
    <p>${escapeHtml(message || 'Please try again later.')}</p>
    ${details ? `<pre>${escapeHtml(details)}</pre>` : ''}
  `;
  container.appendChild(node);
  container.scrollTop = container.scrollHeight;
}

// Create a new environment in the database
async function createEnvironment() {
  try {
    const { supabase } = await import('./supabaseClient.js');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[upword] Cannot create environment: user not authenticated');
      return;
    }
    
    const goalSelect = document.getElementById('conversation-goal');
    const customGoalInput = document.getElementById('custom-goal-input');
    const durationSelect = document.getElementById('duration');
    
    const selectedGoal = goalSelect?.value || '';
    const customGoal = customGoalInput?.value?.trim() || '';
    const selectedDuration = parseInt(durationSelect?.value || '3', 10);
    
    // Use custom goal if provided, otherwise use selected goal
    const goal = customGoal || selectedGoal;
    
    const { data: environment, error } = await supabase
      .from('environments')
      .insert({
        user_id: user.id,
        goal: goal,
        raw_goal: selectedGoal,
        custom_goal: customGoal || null,
        duration: selectedDuration,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('[upword] Error creating environment:', error);
      return;
    }
    
    currentEnvironmentId = environment.id;
    environmentStartTime = new Date(environment.started_at);
    currentEnvironmentDuration = selectedDuration; // Store duration in minutes
    startEnvironmentTimer();
    
    console.log('[upword] Environment created:', currentEnvironmentId, 'Duration:', selectedDuration, 'minutes');
  } catch (error) {
    console.error('[upword] Error in createEnvironment:', error);
  }
}

// Update environment when ending conversation
async function updateEnvironment() {
  if (!currentEnvironmentId) return;
  
  try {
    const { supabase } = await import('./supabaseClient.js');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const now = new Date();
    const totalTimeSeconds = Math.floor((now - environmentStartTime) / 1000);
    
    const { error } = await supabase
      .from('environments')
      .update({
        ended_at: now.toISOString(),
        total_time_seconds: totalTimeSeconds
      })
      .eq('id', currentEnvironmentId)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('[upword] Error updating environment:', error);
    } else {
      console.log('[upword] Environment updated:', currentEnvironmentId);
    }
  } catch (error) {
    console.error('[upword] Error in updateEnvironment:', error);
  }
}

// Start environment timer
function startEnvironmentTimer() {
  if (environmentTimerInterval) {
    clearInterval(environmentTimerInterval);
  }
  
  const timerEl = document.getElementById('environment-timer-value');
  const timerContainer = document.getElementById('environment-timer');
  
  if (!timerEl || !timerContainer || !currentEnvironmentDuration) return;
  
  timerContainer.style.display = 'block';
  
  // Convert duration from minutes to milliseconds
  const environmentTimeLimit = currentEnvironmentDuration * 60 * 1000;
  
  // Calculate warning threshold (1 minute before end or 10% remaining, whichever is smaller)
  const warningThreshold = Math.min(1 * 60 * 1000, environmentTimeLimit * 0.1);
  
  environmentTimerInterval = setInterval(async () => {
    if (!environmentStartTime) return;
    
    const now = Date.now();
    const elapsed = now - environmentStartTime.getTime();
    const remaining = environmentTimeLimit - elapsed;
    
    // Update timer display
    const totalSeconds = Math.floor(elapsed / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      timerEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
      timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    // Check if limit reached
    if (remaining <= 0) {
      // Auto-end the environment
      console.log('[upword] Environment time limit reached (', currentEnvironmentDuration, 'minutes), auto-ending...');
      stopEnvironmentTimer();
      if (isRecording) {
        pendingConversationEnd = true;
        stopRecording();
      } else {
        await updateEnvironment();
        renderFinalSummary();
      }
    } else if (remaining <= warningThreshold) {
      // Warning: approaching time limit
      timerEl.style.color = 'var(--accent-warm)';
    } else {
      // Reset color when not in warning zone
      timerEl.style.color = '';
    }
  }, 1000);
}

// Stop environment timer
function stopEnvironmentTimer() {
  if (environmentTimerInterval) {
    clearInterval(environmentTimerInterval);
    environmentTimerInterval = null;
  }
}

async function startRecording() {
  if (isRecording) return;

  const goalSelect = document.getElementById('conversation-goal');
  const customGoalInput = document.getElementById('custom-goal-input');
  const durationSelect = document.getElementById('duration');

  // Validate that either pre-determined or custom goal is selected
  const selectedGoal = goalSelect?.value || '';
  const customGoal = customGoalInput?.value?.trim() || '';
  
  if (!selectedGoal && !customGoal) {
    alert('Please select a pre-determined goal or enter a custom goal before starting.');
    return;
  }

  // Validate duration based on tier
  const selectedDuration = parseInt(durationSelect?.value || '3', 10);
  if (userTier === 'tier1' && selectedDuration > 2) {
    alert('Tier 1 users can only use sessions up to 2 minutes. Longer durations require Tier 2 or 3.');
    durationSelect?.focus();
    return;
  }

  // Prevent tier 1 users from using custom goals
  if (userTier === 'tier1' && customGoal) {
    alert('Custom goals are only available for Tier 2 and Tier 3 users. Please upgrade to use custom goals.');
    return;
  }
  
  // Check tier 1 session limit
  if (userTier === 'tier1') {
    const limitInfo = await checkTier1SessionLimit();
    if (!limitInfo.allowed) {
      const now = new Date();
      const msUntil = limitInfo.cooldownUntil - now;
      const daysUntil = Math.ceil(msUntil / (1000 * 60 * 60 * 24));
      const hoursUntil = Math.ceil(msUntil / (1000 * 60 * 60));
      
      let message = `You've reached your limit of 3 sessions. `;
      if (daysUntil > 1) {
        message += `Please wait ${daysUntil} day${daysUntil !== 1 ? 's' : ''} from your last session or upgrade to Tier 2/3 to continue.`;
      } else if (hoursUntil > 1) {
        message += `Please wait ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''} from your last session or upgrade to Tier 2/3 to continue.`;
      } else {
        const minutesUntil = Math.ceil(msUntil / (1000 * 60));
        message += `Please wait ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''} from your last session or upgrade to Tier 2/3 to continue.`;
      }
      alert(message);
      return;
    }
  }
  
  // Check if environment already exists (user might be continuing a session)
  if (!currentEnvironmentId) {
    // Create new environment
    await createEnvironment();
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    alert('Audio recording is not supported in this browser. Please try using a modern browser like Chrome or Edge.');
    return;
  }

  try {
    const selectedGoal = goalSelect?.value || '';
    const customGoal = customGoalInput?.value?.trim() || '';

    // Use custom goal if provided, otherwise use selected goal
    currentGoal = customGoal || selectedGoal;
    currentDuration = parseInt(durationSelect?.value || '3', 10);
    conversationCompleted = false;
    pendingConversationEnd = false;
    renderConversation();
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const preferredMimeType = pickRecorderMimeType();
    try {
      mediaRecorder = preferredMimeType
        ? new MediaRecorder(mediaStream, { mimeType: preferredMimeType })
        : new MediaRecorder(mediaStream);
    } catch (error) {
      console.warn('Preferred recorder mime type not supported, falling back to default.', error);
      mediaRecorder = new MediaRecorder(mediaStream);
    }

    recorderMimeType = mediaRecorder.mimeType || preferredMimeType || 'audio/webm';
    recorderFileExtension = mimeTypeToExtension(recorderMimeType) || 'webm';

    audioChunks = [];

    mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);
      }
    });

    mediaRecorder.addEventListener('stop', async () => {
      const audioBlob = new Blob(audioChunks, { type: recorderMimeType || 'audio/webm' });
      await handleRecordingComplete(audioBlob);
    });

    updateRecordingUI('recording');

    mediaRecorder.start();
    isRecording = true;
    recordingStartTime = Date.now();
    startTimer();

    // Auto-stop when the selected duration elapses
    autoStopTimeout = setTimeout(() => {
      if (isRecording) {
        stopRecording();
      }
    }, currentDuration * 60 * 1000);
  } catch (error) {
    console.error('Unable to start recording', error);
    alert('We could not access your microphone. Please allow microphone permissions and try again.');
    cleanupMedia();
    updateRecordingUI('setup');
  }
}

function stopRecording() {
  if (!isRecording) return;

  isRecording = false;
  if (autoStopTimeout) {
    clearTimeout(autoStopTimeout);
    autoStopTimeout = null;
  }
  stopTimer();

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  cleanupMedia();
  updateRecordingUI('processing');
}

function cleanupMedia() {
  mediaRecorder = null;
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
  audioChunks = [];
}

function updateRecordingUI(state) {
  const practiceSetup = document.getElementById('practice-setup');
  const recordingInterface = document.getElementById('recording-interface');
  const feedbackInterface = document.getElementById('feedback-interface');
  const startSetupBtn = document.getElementById('start-recording-btn');
  const startTurnBtn = document.getElementById('start-turn-btn');
  const stopBtn = document.getElementById('stop-recording-btn');
  const endBtn = document.getElementById('end-conversation-btn');

  switch (state) {
    case 'recording':
      practiceSetup.style.display = 'none';
      recordingInterface.style.display = 'block';
      feedbackInterface.style.display = 'none';
      renderConversation();
      if (startSetupBtn) startSetupBtn.disabled = true;
      if (startTurnBtn) startTurnBtn.disabled = true;
      stopBtn.disabled = false;
      if (endBtn) {
        endBtn.disabled = true;
      }
      break;
    case 'processing':
      practiceSetup.style.display = 'none';
      recordingInterface.style.display = 'block';
      feedbackInterface.style.display = 'none';
      renderConversation();
      if (startSetupBtn) startSetupBtn.disabled = true;
      if (startTurnBtn) startTurnBtn.disabled = true;
      stopBtn.disabled = true;
      if (endBtn) {
        endBtn.disabled = true;
      }
      break;
    case 'active':
      practiceSetup.style.display = 'none';
      recordingInterface.style.display = 'block';
      feedbackInterface.style.display = 'none';
      renderConversation();
      if (startSetupBtn) startSetupBtn.disabled = false;
      if (startTurnBtn) startTurnBtn.disabled = false;
      stopBtn.disabled = true;
      if (endBtn) {
        endBtn.disabled = conversationTurns.length === 0;
      }
      break;
    case 'feedback':
      practiceSetup.style.display = 'none';
      recordingInterface.style.display = 'none';
      feedbackInterface.style.display = 'block';
      if (startSetupBtn) startSetupBtn.disabled = true;
      if (startTurnBtn) startTurnBtn.disabled = true;
      stopBtn.disabled = true;
      if (endBtn) {
        endBtn.disabled = true;
      }
      break;
    default:
      practiceSetup.style.display = 'block';
      recordingInterface.style.display = 'none';
      feedbackInterface.style.display = 'none';
      if (startSetupBtn) startSetupBtn.disabled = false;
      if (startTurnBtn) startTurnBtn.disabled = true;
      stopBtn.disabled = true;
      if (endBtn) {
        endBtn.disabled = true;
      }
      renderConversation();
  }
  setRecordingIndicator(state);
}

function startTimer() {
  const timerEl = document.getElementById('timer');
  if (!timerEl) return;

  timerInterval = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  const timerEl = document.getElementById('timer');
  if (timerEl) timerEl.textContent = '00:00';
}

async function handleRecordingComplete(audioBlob) {
  updateRecordingUI('processing');
  const pendingNode = addPendingMessage();

  try {
    const mimeType = recorderMimeType || audioBlob.type || 'audio/webm';
    const extension = recorderFileExtension || mimeTypeToExtension(mimeType) || 'webm';
    const result = await uploadSession(audioBlob, mimeType, extension);
    
    // Refresh session count for tier 1 users after session upload
    if (userTier === 'tier1') {
      await updateCustomGoalVisibility();
    }

    conversationTurns.push({
      transcript: result.transcript,
      response: result.response,
      rating: Number(result.rating) || 0,
      fixes: Array.isArray(result.fixes) ? result.fixes : []
    });

    renderConversation();
  } catch (error) {
    console.error('Failed to process session', error);
    addErrorMessage(error.message, error?.details);
  } finally {
    if (pendingNode && pendingNode.parentNode) {
      pendingNode.parentNode.removeChild(pendingNode);
    }
    recorderMimeType = '';
    recorderFileExtension = 'webm';
    updateRecordingUI('active');
    if (pendingConversationEnd) {
      pendingConversationEnd = false;
      await updateEnvironment();
      renderFinalSummary();
    }
  }
}

async function uploadSession(audioBlob, mimeType, extension) {
  const formData = new FormData();
  const filename = extension ? `session-${Date.now()}.${extension}` : `session-${Date.now()}`;
  formData.append('audio', audioBlob, filename);
  formData.append('goal', currentGoal);
  formData.append('rawGoal', document.getElementById('conversation-goal')?.value || '');
  formData.append('customGoal', document.getElementById('custom-goal-input')?.value?.trim() || '');
  formData.append('duration', currentDuration);
  if (mimeType) {
    formData.append('mimeType', mimeType);
  }
  if (extension) {
    formData.append('fileExtension', extension);
  }

  const response = await fetch('/api/sessions', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error(errorBody?.message || 'The server was unable to analyze your conversation.');
    if (errorBody?.details) {
      error.details = typeof errorBody.details === 'string' ? errorBody.details : JSON.stringify(errorBody.details);
    }
    throw error;
  }

  return response.json();
}

async function renderFinalSummary() {
  if (!conversationTurns.length) {
    alert('Record at least one turn before ending the conversation.');
    return;
  }

  // Update environment when ending
  await updateEnvironment();
  stopEnvironmentTimer();

  const feedbackContent = document.getElementById('feedback-content');
  if (!feedbackContent) return;

  const ratingSum = conversationTurns.reduce((sum, turn) => sum + (Number(turn.rating) || 0), 0);
  const averageRating = Math.round(ratingSum / conversationTurns.length);
  const mergedFixes = [...new Set(conversationTurns.flatMap((turn) => turn.fixes || []))];

  const wasCompleted = conversationCompleted;
  conversationCompleted = true;
  renderConversation();

  const transcriptHtml = conversationTurns
    .map(
      (turn, idx) => `
        <div class="transcript-turn">
          <h5>Turn ${idx + 1} — Rating: ${escapeHtml(String(turn.rating ?? '—'))}</h5>
          <p><strong>You:</strong> ${escapeHtml(turn.transcript || '').replace(/\n/g, '<br />')}</p>
          <p><strong>Coach:</strong> ${escapeHtml(turn.response || '').replace(/\n/g, '<br />')}</p>
        </div>
      `
    )
    .join('');

  feedbackContent.innerHTML = `
    <div class="feedback-summary">
      <h4>Session Summary</h4>
      <p><strong>Goal:</strong> ${escapeHtml(currentGoal || 'Unspecified')}</p>
      <p><strong>Turns Recorded:</strong> ${conversationTurns.length}</p>
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
          : '<p>No fixes required — great job!</p>'
      }
    </div>
    <div class="feedback-transcript">
      <h4>Conversation Transcript</h4>
      ${transcriptHtml}
    </div>
  `;

  if (!wasCompleted) {
    saveSession({
      goal: currentGoal,
      duration: Number(currentDuration) || 0,
      score: averageRating,
      timestamp: Date.now()
    });
    updateStats();
    loadSessionHistory();
  }

  updateRecordingUI('feedback');
}

async function resetToSetup() {
  const practiceForm = document.getElementById('practice-form');
  practiceForm?.reset();
  cleanupMedia();
  stopTimer();
  stopEnvironmentTimer();
  
  // Reset environment tracking
  currentEnvironmentId = null;
  environmentStartTime = null;
  currentEnvironmentDuration = null;
  
  // Hide environment timer
  const timerContainer = document.getElementById('environment-timer');
  if (timerContainer) {
    timerContainer.style.display = 'none';
  }
  
  // Reset timer color
  const timerEl = document.getElementById('environment-timer-value');
  if (timerEl) {
    timerEl.style.color = '';
  }
  
  // Refresh session count for tier 1 users
  if (userTier === 'tier1') {
    await updateCustomGoalVisibility();
  }
  if (autoStopTimeout) {
    clearTimeout(autoStopTimeout);
    autoStopTimeout = null;
  }
  recorderMimeType = '';
  recorderFileExtension = 'webm';
  audioChunks = [];
  conversationTurns = [];
  conversationCompleted = false;
  pendingConversationEnd = false;
  currentGoal = '';
  currentDuration = 3;
  renderConversation();
  updateRecordingUI('setup');
}

function formatScore(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return '-';
  }
  return Math.round(score);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function saveSession(sessionData) {
  const sessions = JSON.parse(localStorage.getItem('upword_sessions') || '[]');
  sessions.unshift(sessionData);
  if (sessions.length > 50) {
    sessions.length = 50;
  }
  localStorage.setItem('upword_sessions', JSON.stringify(sessions));
}

function loadSessionHistory() {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;

  const sessions = JSON.parse(localStorage.getItem('upword_sessions') || '[]');

  if (sessions.length === 0) {
    historyList.innerHTML = '<p class="empty-state">No sessions yet. Start your first practice session above!</p>';
    return;
  }

  historyList.innerHTML = sessions.slice(0, 10).map((session) => {
    const date = new Date(session.timestamp);
    return `
      <div class="history-item">
        <div class="history-item-info">
          <div class="history-item-goal">${escapeHtml(getGoalName(session.goal))}</div>
          <div class="history-item-meta">${date.toLocaleDateString()} • ${escapeHtml(session.duration)} min</div>
        </div>
        <div class="history-item-score">${formatScore(session.score)}</div>
      </div>
    `;
  }).join('');
}

function updateStats() {
  const sessions = JSON.parse(localStorage.getItem('upword_sessions') || '[]');
  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, session) => sum + (Number(session.duration) || 0), 0);
  const averageScore = sessions.length
    ? Math.round(sessions.reduce((sum, session) => sum + (Number(session.score) || 0), 0) / sessions.length)
    : null;

  const uniqueDates = new Set(
    sessions.map((session) => new Date(session.timestamp).toDateString())
  );

  document.getElementById('total-sessions').textContent = totalSessions;
  document.getElementById('total-time').textContent = `${totalMinutes}m`;
  document.getElementById('avg-score').textContent = averageScore ?? '-';
  document.getElementById('streak').textContent = uniqueDates.size;
}

function getGoalName(goal) {
  const names = {
    networking: 'Networking',
    'first-date': 'First Date',
    'job-interview': 'Job Interview',
    'small-talk': 'Small Talk',
    'deep-connection': 'Deep Connection',
    'public-speaking': 'Public Speaking'
  };
  // Check if goal is a custom goal (not in the predefined list)
  if (!names[goal] && goal && goal.length > 0 && !goal.match(/^(networking|first-date|job-interview|small-talk|deep-connection|public-speaking|custom)$/)) {
    return goal; // Return custom goal as-is
  }
  return names[goal] || goal;
}

// Account Modal Functions
function initializeAccountModal() {
  const accountBtn = document.getElementById('user-menu-btn');
  const accountOverlay = document.getElementById('account-overlay');
  const accountClose = document.getElementById('account-close');
  const avatarUpload = document.getElementById('account-avatar-upload');

  // Open account modal
  accountBtn?.addEventListener('click', async () => {
    accountOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    await loadAccountData();
  });

  // Close account modal
  accountClose?.addEventListener('click', () => {
    accountOverlay.style.display = 'none';
    document.body.style.overflow = '';
  });

  // Close on overlay click
  accountOverlay?.addEventListener('click', (e) => {
    if (e.target === accountOverlay) {
      accountOverlay.style.display = 'none';
      document.body.style.overflow = '';
    }
  });

  // Handle avatar upload
  avatarUpload?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showAvatarUploadStatus('Please select an image file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showAvatarUploadStatus('Image must be less than 5MB', 'error');
      return;
    }

    await uploadAvatar(file);
  });

  // Setup contact info editors
  setupContactInfoEditors();
  
  // Setup sign out button
  const signOutBtn = document.getElementById('sign-out-btn');
  signOutBtn?.addEventListener('click', async () => {
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

async function loadAccountData() {
  try {
    const { supabase } = await import('./supabaseClient.js');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Load profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url, phone_number')
      .eq('id', user.id)
      .single();

    // Load session count
    const { count: totalSessions } = await supabase
      .from('conversation_turns')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Load sessions for streak calculation
    const { data: sessions } = await supabase
      .from('conversation_turns')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Load phone number from profile
    const phoneNumber = profile?.phone_number || null;

    // Update UI
    updateAccountAvatar(profile?.avatar_url, user.email);
    updateAccountStats(totalSessions || 0, sessions || []);
    updateAccountContactInfo(user.email, phoneNumber);
  } catch (error) {
    console.error('[upword] Error loading account data:', error);
  }
}

function generateInitialsAvatar(email) {
  const name = email?.split('@')[0] || 'U';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="url(%23grad)"/>
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f7b0c6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#89d3d8;stop-opacity:1" />
        </linearGradient>
      </defs>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="72" font-weight="600" fill="white" text-anchor="middle" dominant-baseline="central">${initials}</text>
    </svg>
  `)}`;
}

function updateAccountAvatar(avatarUrl, email) {
  const avatarPreview = document.getElementById('account-avatar-preview');
  if (!avatarPreview) return;

  if (avatarUrl) {
    avatarPreview.src = avatarUrl;
    avatarPreview.style.display = 'block';
  } else {
    avatarPreview.src = generateInitialsAvatar(email);
    avatarPreview.style.display = 'block';
  }
  
  // Also update nav profile picture
  updateNavProfilePicture(avatarUrl, email);
}

function updateNavProfilePicture(avatarUrl, email) {
  const navProfilePic = document.getElementById('nav-profile-picture');
  if (!navProfilePic) return;

  // Always ensure image is visible
  navProfilePic.style.display = 'block';
  
  if (avatarUrl) {
    // Preload the image to avoid flicker
    const img = new Image();
    img.onload = () => {
      navProfilePic.src = avatarUrl;
    };
    img.onerror = () => {
      // If image fails to load, fall back to initials
      navProfilePic.src = generateInitialsAvatar(email);
    };
    img.src = avatarUrl;
  } else {
    navProfilePic.src = generateInitialsAvatar(email);
  }
}

async function loadNavProfilePicture() {
  try {
    const { supabase } = await import('./supabaseClient.js');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const navProfilePic = document.getElementById('nav-profile-picture');
    if (!navProfilePic) return;

    // Show initials avatar IMMEDIATELY (no delay, no async)
    navProfilePic.src = generateInitialsAvatar(user.email);
    navProfilePic.style.display = 'block';

    // Then load actual profile picture asynchronously (in background)
    // This way user sees initials right away, then it updates if avatar exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    // Update with actual avatar if it exists (will smoothly replace initials)
    if (profile?.avatar_url) {
      updateNavProfilePicture(profile.avatar_url, user.email);
    }
    // If no avatar_url, initials are already showing, so we're done
  } catch (error) {
    console.error('[upword] Error loading nav profile picture:', error);
    // On error, ensure initials are showing
    const { supabase } = await import('./supabaseClient.js');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const navProfilePic = document.getElementById('nav-profile-picture');
      if (navProfilePic) {
        navProfilePic.src = generateInitialsAvatar(user.email);
        navProfilePic.style.display = 'block';
      }
    }
  }
}

function updateAccountStats(totalSessions, sessions) {
  const totalSessionsEl = document.getElementById('account-total-sessions');
  const streakEl = document.getElementById('account-streak');

  if (totalSessionsEl) {
    totalSessionsEl.textContent = totalSessions;
  }

  if (streakEl) {
    const streak = calculateStreak(sessions);
    streakEl.textContent = `${streak} day${streak !== 1 ? 's' : ''}`;
  }
}

function calculateStreak(sessions) {
  if (!sessions || sessions.length === 0) return 0;

  // Sort sessions by date (newest first)
  const sortedSessions = sessions
    .map(s => new Date(s.created_at))
    .sort((a, b) => b - a);

  // Get unique dates (ignore time)
  const uniqueDates = [...new Set(sortedSessions.map(d => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }))].sort((a, b) => b - a);

  if (uniqueDates.length === 0) return 0;

  // Check if most recent session was today or yesterday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const mostRecentDate = new Date(uniqueDates[0]);
  mostRecentDate.setHours(0, 0, 0, 0);

  // If most recent session is not today or yesterday, streak is 0
  if (mostRecentDate.getTime() !== today.getTime() && 
      mostRecentDate.getTime() !== yesterday.getTime()) {
    return 0;
  }

  // Calculate consecutive days
  let streak = 0;
  let currentDate = mostRecentDate.getTime() === today.getTime() ? today : yesterday;
  
  for (const dateTime of uniqueDates) {
    const sessionDate = new Date(dateTime);
    sessionDate.setHours(0, 0, 0, 0);
    
    if (sessionDate.getTime() === currentDate.getTime()) {
      streak++;
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function updateAccountContactInfo(email, phoneNumber) {
  const emailInput = document.getElementById('account-email');
  const phoneInput = document.getElementById('account-phone');

  if (emailInput) {
    emailInput.value = email || '';
  }

  if (phoneInput) {
    phoneInput.value = phoneNumber || '';
  }
}

function setupContactInfoEditors() {
  const editEmailBtn = document.getElementById('edit-email-btn');
  const editPhoneBtn = document.getElementById('edit-phone-btn');
  const emailInput = document.getElementById('account-email');
  const phoneInput = document.getElementById('account-phone');
  const statusEl = document.getElementById('contact-info-status');

  let emailEditing = false;
  let phoneEditing = false;
  let originalEmail = '';
  let originalPhone = '';

  // Email editor
  editEmailBtn?.addEventListener('click', () => {
    if (!emailEditing) {
      // Start editing
      emailEditing = true;
      originalEmail = emailInput.value;
      emailInput.removeAttribute('readonly');
      emailInput.focus();
      editEmailBtn.textContent = 'Save';
      editEmailBtn.classList.add('save');
      editEmailBtn.classList.remove('cancel');
    } else {
      // Save changes
      const newEmail = emailInput.value.trim();
      if (newEmail === originalEmail) {
        // No changes, cancel
        emailInput.setAttribute('readonly', 'readonly');
        emailEditing = false;
        editEmailBtn.textContent = 'Edit';
        editEmailBtn.classList.remove('save');
        showContactStatus('', '');
        return;
      }

      if (!newEmail || !isValidEmail(newEmail)) {
        showContactStatus('Please enter a valid email address', 'error');
        return;
      }

      saveEmail(newEmail);
    }
  });

  // Phone editor
  editPhoneBtn?.addEventListener('click', () => {
    if (!phoneEditing) {
      // Start editing
      phoneEditing = true;
      originalPhone = phoneInput.value;
      phoneInput.removeAttribute('readonly');
      phoneInput.focus();
      editPhoneBtn.textContent = 'Save';
      editPhoneBtn.classList.add('save');
      editPhoneBtn.classList.remove('cancel');
    } else {
      // Save changes
      const newPhone = phoneInput.value.trim();
      if (newPhone === originalPhone) {
        // No changes, cancel
        phoneInput.setAttribute('readonly', 'readonly');
        phoneEditing = false;
        editPhoneBtn.textContent = 'Edit';
        editPhoneBtn.classList.remove('save');
        showContactStatus('', '');
        return;
      }

      if (newPhone && !isValidPhone(newPhone)) {
        showContactStatus('Please enter a valid phone number', 'error');
        return;
      }

      savePhone(newPhone || null);
    }
  });

  // Cancel on Escape key
  emailInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && emailEditing) {
      emailInput.value = originalEmail;
      emailInput.setAttribute('readonly', 'readonly');
      emailEditing = false;
      editEmailBtn.textContent = 'Edit';
      editEmailBtn.classList.remove('save');
      showContactStatus('', '');
    }
  });

  phoneInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && phoneEditing) {
      phoneInput.value = originalPhone;
      phoneInput.setAttribute('readonly', 'readonly');
      phoneEditing = false;
      editPhoneBtn.textContent = 'Edit';
      editPhoneBtn.classList.remove('save');
      showContactStatus('', '');
    }
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  // Basic phone validation - allows digits, spaces, dashes, parentheses, and +
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  return /^\d{10,15}$/.test(cleaned);
}

async function saveEmail(newEmail) {
  const emailInput = document.getElementById('account-email');
  const editEmailBtn = document.getElementById('edit-email-btn');
  const statusEl = document.getElementById('contact-info-status');

  try {
    showContactStatus('Updating email...', 'loading');

    const { supabase } = await import('./supabaseClient.js');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      showContactStatus('Not authenticated', 'error');
      return;
    }

    // Update email in Supabase Auth
    const { error: authError } = await supabase.auth.updateUser({
      email: newEmail
    });

    if (authError) {
      throw authError;
    }

    // Update email in profile table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ email: newEmail, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('[upword] Error updating email in profile:', profileError);
    }

    emailInput.setAttribute('readonly', 'readonly');
    editEmailBtn.textContent = 'Edit';
    editEmailBtn.classList.remove('save');
    showContactStatus('Email updated successfully!', 'success');
    
    setTimeout(() => {
      showContactStatus('', '');
    }, 3000);
  } catch (error) {
    console.error('[upword] Error updating email:', error);
    showContactStatus(error.message || 'Failed to update email. Please try again.', 'error');
  }
}

async function savePhone(newPhone) {
  const phoneInput = document.getElementById('account-phone');
  const editPhoneBtn = document.getElementById('edit-phone-btn');
  const statusEl = document.getElementById('contact-info-status');

  try {
    showContactStatus('Updating phone number...', 'loading');

    const { supabase } = await import('./supabaseClient.js');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      showContactStatus('Not authenticated', 'error');
      return;
    }

    // Update phone in profile table
    const { error } = await supabase
      .from('profiles')
      .update({ phone_number: newPhone, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error && error.code !== 'PGRST116') {
      // If update fails, try insert
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ id: user.id, phone_number: newPhone });
      
      if (insertError) {
        throw insertError;
      }
    }

    phoneInput.setAttribute('readonly', 'readonly');
    editPhoneBtn.textContent = 'Edit';
    editPhoneBtn.classList.remove('save');
    showContactStatus('Phone number updated successfully!', 'success');
    
    setTimeout(() => {
      showContactStatus('', '');
    }, 3000);
  } catch (error) {
    console.error('[upword] Error updating phone:', error);
    showContactStatus(error.message || 'Failed to update phone number. Please try again.', 'error');
  }
}

function showContactStatus(message, type) {
  const statusEl = document.getElementById('contact-info-status');
  if (!statusEl) return;

  if (!message) {
    statusEl.textContent = '';
    statusEl.className = 'contact-info-status';
    return;
  }

  statusEl.textContent = message;
  statusEl.className = `contact-info-status ${type}`;
}

async function uploadAvatar(file) {
  const uploadStatus = document.getElementById('avatar-upload-status');
  const avatarPreview = document.getElementById('account-avatar-preview');

  try {
    showAvatarUploadStatus('Uploading...', 'loading');

    const { supabase } = await import('./supabaseClient.js');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      showAvatarUploadStatus('Not authenticated', 'error');
      return;
    }

    // Create a data URL for immediate preview
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (avatarPreview) {
          avatarPreview.src = e.target.result;
        }
        resolve(e.target.result);
      };
      reader.onerror = (error) => {
        console.error('[upword] FileReader error:', error);
        reject(new Error('Failed to read image file'));
      };
      reader.readAsDataURL(file);
    });

    // Try to upload to Supabase Storage (if bucket exists)
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    let storageSuccess = false;
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        // Check if it's a bucket not found error
        if (uploadError.message && uploadError.message.includes('Bucket not found')) {
          console.warn('[upword] Avatars bucket not found, using data URL instead');
          throw new Error('STORAGE_BUCKET_NOT_FOUND');
        }
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with URL
      await updateProfileAvatar(publicUrl);
      // Update nav profile picture
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        updateNavProfilePicture(publicUrl, user.email);
      }
      storageSuccess = true;
      showAvatarUploadStatus('Avatar updated!', 'success');
      
      setTimeout(() => {
        showAvatarUploadStatus('', '');
      }, 2000);
    } catch (storageError) {
      // If storage fails, use data URL as fallback
      console.warn('[upword] Storage upload failed, using data URL fallback:', storageError);
      
      try {
        await updateProfileAvatar(dataUrl);
        // Update nav profile picture
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          updateNavProfilePicture(dataUrl, user.email);
        }
        showAvatarUploadStatus('Avatar updated! (saved locally)', 'success');
        
        setTimeout(() => {
          showAvatarUploadStatus('', '');
        }, 2000);
      } catch (updateError) {
        console.error('[upword] Error updating profile with data URL:', updateError);
        showAvatarUploadStatus('Failed to save avatar. Please try again.', 'error');
      }
    }
  } catch (error) {
    console.error('[upword] Error uploading avatar:', error);
    const errorMessage = error.message || 'Upload failed. Please try again.';
    showAvatarUploadStatus(errorMessage, 'error');
  }
}

async function updateProfileAvatar(avatarUrl) {
  try {
    const { supabase } = await import('./supabaseClient.js');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // First try to update
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      // If update fails (profile doesn't exist), try insert
      console.log('[upword] Profile update failed, trying insert:', updateError);
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ 
          id: user.id, 
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('[upword] Error inserting avatar:', insertError);
        throw insertError;
      }
    }
    
    console.log('[upword] Avatar updated successfully');
  } catch (error) {
    console.error('[upword] Error in updateProfileAvatar:', error);
    throw error;
  }
}

function showAvatarUploadStatus(message, type) {
  const uploadStatus = document.getElementById('avatar-upload-status');
  if (!uploadStatus) return;

  if (!message) {
    uploadStatus.textContent = '';
    uploadStatus.className = 'avatar-upload-status';
    return;
  }

  uploadStatus.textContent = message;
  uploadStatus.className = `avatar-upload-status ${type}`;
}



