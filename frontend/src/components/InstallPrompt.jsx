import React, { useState, useEffect } from 'react';
import '../styles/InstallPrompt.css';

/**
 * InstallPrompt handles PWA install UX for both Android and iOS.
 * - Android/Chrome: uses the native beforeinstallprompt event.
 * - iOS/Safari: shows manual "Add to Home Screen" instructions (iOS has no prompt API).
 * Hidden if the app is already installed (standalone mode) or dismissed.
 */
function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      return; // Already installed, don't show anything
    }

    // Check if user dismissed it recently (within 7 days)
    const dismissedAt = localStorage.getItem('installPromptDismissed');
    if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    // Detect iOS
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isSafari = /safari/i.test(window.navigator.userAgent) && !/crios|fxios/i.test(window.navigator.userAgent);

    if (isIos && isSafari) {
      // Show iOS instructions after a short delay
      const timer = setTimeout(() => setShowIos(true), 2000);
      return () => clearTimeout(timer);
    }

    // Android/Chrome - listen for the install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroid(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setShowAndroid(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('installPromptDismissed', Date.now().toString());
    setShowAndroid(false);
    setShowIos(false);
  };

  if (showAndroid) {
    return (
      <div className="install-prompt android">
        <div className="install-content">
          <span className="install-icon">🏸</span>
          <div className="install-text">
            <strong>Install Komet Logger</strong>
            <p>Install the app for quicker access to your time reports.</p>
          </div>
        </div>
        <div className="install-actions">
          <button className="install-btn" onClick={handleInstall}>Install App</button>
          <button className="install-dismiss" onClick={handleDismiss}>×</button>
        </div>
      </div>
    );
  }

  if (showIos) {
    return (
      <div className="install-prompt ios">
        <div className="install-content">
          <span className="install-icon">📱</span>
          <div className="install-text">
            <strong>Install Komet Logger</strong>
            <p>
              Tap <span className="ios-share">⬆️ Share</span>, then choose
              <strong> "Add to Home Screen"</strong>.
            </p>
          </div>
        </div>
        <button className="install-dismiss" onClick={handleDismiss}>×</button>
      </div>
    );
  }

  return null;
}

export default InstallPrompt;
