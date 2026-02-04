/**
 * Session Timeout Manager
 * Automatically logs out users after 30 minutes of inactivity
 * Provides warnings before timeout occurs
 */

class SessionTimeoutManager {
  constructor(options = {}) {
    this.timeoutDuration = options.timeoutDuration || 30 * 60 * 1000; // 30 minutes
    this.warningDuration = options.warningDuration || 5 * 60 * 1000; // 5 minutes before timeout
    this.warningShown = false;
    this.timeoutId = null;
    this.warningTimeoutId = null;
    this.isLoggedIn = false;
    
    // Bind methods to preserve 'this' context
    this.resetTimeout = this.resetTimeout.bind(this);
    this.handleWarning = this.handleWarning.bind(this);
    this.handleTimeout = this.handleTimeout.bind(this);
    this.showTimeoutWarning = this.showTimeoutWarning.bind(this);
    this.logout = this.logout.bind(this);
  }

  /**
   * Initialize session timeout manager
   */
  init() {
    // Check if user is logged in
    this.checkAuthStatus();
    
    if (this.isLoggedIn) {
      this.attachEventListeners();
      this.startTimeout();
      console.log('⏱️ Session timeout manager initialized (30 minutes)');
    }
  }

  /**
   * Check if user is currently authenticated
   */
  async checkAuthStatus() {
    try {
      const response = await fetch('/api/profile', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        this.isLoggedIn = true;
      } else if (response.status === 401) {
        // Session expired, redirect to login
        this.redirectToLogin('Your session has expired. Please log in again.');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  }

  /**
   * Attach activity event listeners
   */
  attachEventListeners() {
    // User activity events that reset the timeout
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, this.resetTimeout, { passive: true });
    });

    // Also listen for page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  /**
   * Handle visibility changes (tab switching)
   */
  handleVisibilityChange() {
    if (document.hidden) {
      // User switched away from the tab
      console.log('👋 User switched away from tab');
    } else {
      // User came back to the tab
      console.log('👀 User returned to tab');
      // Reset timeout when user comes back
      this.resetTimeout();
    }
  }

  /**
   * Start the timeout and warning timers
   */
  startTimeout() {
    // Clear any existing timers
    this.clearTimers();

    // Set warning timer (triggers 5 minutes before actual timeout)
    const warningTime = this.timeoutDuration - this.warningDuration;
    this.warningTimeoutId = setTimeout(this.handleWarning, warningTime);

    // Set actual timeout timer
    this.timeoutId = setTimeout(this.handleTimeout, this.timeoutDuration);

    // Store start time for debugging
    this.timeoutStartTime = Date.now();
  }

  /**
   * Reset timeout on user activity
   */
  resetTimeout() {
    if (!this.isLoggedIn) return;

    // Clear the warning shown flag when user is active again
    this.warningShown = false;

    // Close warning modal if it was open
    this.closeWarningModal();

    // Restart the timeout
    this.startTimeout();
  }

  /**
   * Handle warning - show modal before timeout
   */
  handleWarning() {
    if (!this.warningShown && this.isLoggedIn) {
      this.warningShown = true;
      this.showTimeoutWarning();
      console.log('⚠️ Session timeout warning shown (5 minutes remaining)');
    }
  }

  /**
   * Handle actual timeout
   */
  handleTimeout() {
    console.log('⏰ Session timeout reached - logging out');
    this.logout();
  }

  /**
   * Show timeout warning modal
   */
  showTimeoutWarning() {
    // Create or get modal
    let modal = document.getElementById('session-timeout-modal');
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'session-timeout-modal';
      modal.innerHTML = `
        <div class="session-timeout-overlay" id="session-timeout-overlay">
          <div class="session-timeout-warning">
            <div class="warning-icon">
              <i class="fas fa-clock"></i>
            </div>
            <h2>Session Timeout Warning</h2>
            <p>Your session will expire in <strong>5 minutes</strong> due to inactivity.</p>
            <p class="warning-text">Click "Continue" to stay logged in or you will be automatically logged out.</p>
            <div class="warning-actions">
              <button class="btn btn-primary" id="continue-session-btn">
                <i class="fas fa-check-circle me-2"></i>Continue Session
              </button>
              <button class="btn btn-secondary" id="logout-now-btn">
                <i class="fas fa-sign-out-alt me-2"></i>Logout Now
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Add event listeners
      document.getElementById('continue-session-btn').addEventListener('click', () => {
        this.closeWarningModal();
        this.resetTimeout();
      });

      document.getElementById('logout-now-btn').addEventListener('click', () => {
        this.logout();
      });
    }

    // Show modal
    const overlay = document.getElementById('session-timeout-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
  }

  /**
   * Close warning modal
   */
  closeWarningModal() {
    const overlay = document.getElementById('session-timeout-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  /**
   * Logout user and redirect to login
   */
  async logout() {
    try {
      this.detachEventListeners();
      this.clearTimers();

      // Try to call logout endpoint if available
      try {
        await fetch('/api/logout', {
          method: 'POST',
          credentials: 'include'
        });
      } catch (error) {
        console.error('Logout API call failed:', error);
      }

      // Redirect to login with message
      this.redirectToLogin('Your session has expired due to inactivity. Please log in again.');
    } catch (error) {
      console.error('Logout error:', error);
      this.redirectToLogin('Session ended. Please log in again.');
    }
  }

  /**
   * Redirect to login page
   */
  redirectToLogin(message = '') {
    // Store message in sessionStorage for display on login page
    if (message) {
      sessionStorage.setItem('sessionTimeoutMessage', message);
    }
    
    // Redirect to login
    window.location.href = '/login';
  }

  /**
   * Detach event listeners
   */
  detachEventListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.removeEventListener(event, this.resetTimeout);
    });
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Clear all timers
   */
  clearTimers() {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.warningTimeoutId) clearTimeout(this.warningTimeoutId);
  }

  /**
   * Destroy manager
   */
  destroy() {
    this.detachEventListeners();
    this.clearTimers();
    this.closeWarningModal();
    this.isLoggedIn = false;
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.sessionTimeoutManager = new SessionTimeoutManager();
    window.sessionTimeoutManager.init();
  });
} else {
  window.sessionTimeoutManager = new SessionTimeoutManager();
  window.sessionTimeoutManager.init();
}

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (window.sessionTimeoutManager) {
    window.sessionTimeoutManager.destroy();
  }
});
