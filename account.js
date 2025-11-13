import { supabase } from './supabaseClient.js';

let userTier = null;
let userProfile = null;

// Initialize account page
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthAndLoadData();
  setupEventListeners();
});

async function checkAuthAndLoadData() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      window.location.href = '/auth';
      return;
    }

    // Load user profile and subscription
    await Promise.all([
      loadUserProfile(user),
      loadUserSubscription(user.id),
      loadUserStats(user.id)
    ]);
  } catch (error) {
    console.error('[upword] Error loading account data:', error);
  }
}

async function loadUserProfile(user) {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[upword] Error loading profile:', error);
    }

    userProfile = profile || { id: user.id, display_name: null, avatar_url: null };
    
    // Update UI
    const displayNameEl = document.getElementById('user-display-name');
    const emailEl = document.getElementById('user-email');
    const avatarPreview = document.getElementById('avatar-preview');
    
    if (displayNameEl) {
      displayNameEl.textContent = userProfile.display_name || user.email?.split('@')[0] || 'User';
    }
    
    if (emailEl) {
      emailEl.textContent = user.email || '';
    }
    
    if (avatarPreview) {
      if (userProfile.avatar_url) {
        avatarPreview.src = userProfile.avatar_url;
        avatarPreview.style.display = 'block';
      } else {
        // Generate initials avatar
        const name = userProfile.display_name || user.email?.split('@')[0] || 'U';
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        avatarPreview.src = `data:image/svg+xml,${encodeURIComponent(`
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
        avatarPreview.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('[upword] Error in loadUserProfile:', error);
  }
}

async function loadUserSubscription(userId) {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[upword] Error loading subscription:', error);
    }

    if (subscription) {
      userTier = subscription.tier?.toLowerCase() || null;
      const tierValueEl = document.getElementById('tier-value');
      if (tierValueEl) {
        const tierDisplay = subscription.tier === 'tier1' ? 'Tier 1 (Free)' :
                          subscription.tier === 'tier2' ? 'Tier 2 (Monthly)' :
                          subscription.tier === 'tier3' ? 'Tier 3 (Lifetime)' :
                          'Unknown';
        tierValueEl.textContent = tierDisplay;
      }
      
      // Show upgrade button for tier1 and tier2
      const upgradeBtn = document.getElementById('upgrade-btn');
      if (upgradeBtn && (userTier === 'tier1' || userTier === 'tier2')) {
        upgradeBtn.style.display = 'block';
        upgradeBtn.onclick = () => {
          window.location.href = '/select-tier';
        };
      }
    }
  } catch (error) {
    console.error('[upword] Error in loadUserSubscription:', error);
  }
}

async function loadUserStats(userId) {
  try {
    // Get total sessions count
    const { count: totalSessions, error: countError } = await supabase
      .from('conversation_turns')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('[upword] Error counting sessions:', countError);
    }

    // Get this week's sessions
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    const { count: weekSessions, error: weekError } = await supabase
      .from('conversation_turns')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString());

    if (weekError) {
      console.error('[upword] Error counting week sessions:', weekError);
    }

    // Get total practice time (sum of durations)
    const { data: sessions, error: durationError } = await supabase
      .from('conversation_turns')
      .select('duration')
      .eq('user_id', userId);

    let totalMinutes = 0;
    if (!durationError && sessions) {
      totalMinutes = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    }

    // Get account creation date
    const { data: profile } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .single();

    // Update UI
    const totalSessionsEl = document.getElementById('total-sessions-count');
    const weekSessionsEl = document.getElementById('this-week-sessions');
    const practiceTimeEl = document.getElementById('total-practice-time');
    const createdDateEl = document.getElementById('account-created-date');

    if (totalSessionsEl) {
      totalSessionsEl.textContent = totalSessions || 0;
    }

    if (weekSessionsEl) {
      weekSessionsEl.textContent = weekSessions || 0;
    }

    if (practiceTimeEl) {
      if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        practiceTimeEl.textContent = `${hours}h ${mins}m`;
      } else {
        practiceTimeEl.textContent = `${totalMinutes}m`;
      }
    }

    if (createdDateEl && profile?.created_at) {
      const createdDate = new Date(profile.created_at);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      createdDateEl.textContent = createdDate.toLocaleDateString('en-US', options);
    }
  } catch (error) {
    console.error('[upword] Error in loadUserStats:', error);
  }
}

function setupEventListeners() {
  // Avatar upload
  const avatarUpload = document.getElementById('avatar-upload');
  const avatarPreview = document.getElementById('avatar-preview');
  const uploadStatus = document.getElementById('avatar-upload-status');

  avatarUpload?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showUploadStatus('Please select an image file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showUploadStatus('Image must be less than 5MB', 'error');
      return;
    }

    try {
      showUploadStatus('Uploading...', 'loading');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage (assuming 'avatars' bucket exists)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        // If bucket doesn't exist, use a data URL instead
        console.warn('[upword] Storage upload failed, using data URL:', uploadError);
        const reader = new FileReader();
        reader.onload = async (e) => {
          const dataUrl = e.target.result;
          await updateProfileAvatar(dataUrl);
        };
        reader.readAsDataURL(file);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateProfileAvatar(publicUrl);
      showUploadStatus('Avatar updated!', 'success');
      
      setTimeout(() => {
        showUploadStatus('', '');
      }, 2000);
    } catch (error) {
      console.error('[upword] Error uploading avatar:', error);
      showUploadStatus('Upload failed. Please try again.', 'error');
    }
  });

  // Sign out button
  const signOutBtn = document.getElementById('sign-out-btn');
  signOutBtn?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await supabase.auth.signOut();
      window.location.href = '/';
    }
  });
}

async function updateProfileAvatar(avatarUrl) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      // If update fails, try insert
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ id: user.id, avatar_url: avatarUrl });
      
      if (insertError) {
        console.error('[upword] Error updating avatar:', insertError);
        throw insertError;
      }
    }

    // Update preview
    const avatarPreview = document.getElementById('avatar-preview');
    if (avatarPreview) {
      avatarPreview.src = avatarUrl;
    }

    userProfile = { ...userProfile, avatar_url: avatarUrl };
  } catch (error) {
    console.error('[upword] Error in updateProfileAvatar:', error);
    throw error;
  }
}

function showUploadStatus(message, type) {
  const uploadStatus = document.getElementById('avatar-upload-status');
  if (!uploadStatus) return;

  if (!message) {
    uploadStatus.style.display = 'none';
    return;
  }

  uploadStatus.style.display = 'block';
  uploadStatus.textContent = message;
  uploadStatus.className = `upload-status ${type}`;
}



