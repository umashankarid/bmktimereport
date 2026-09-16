import React, { useState, useEffect } from 'react';
import '../styles/OfflineIndicator.css';

/**
 * Shows a small banner when the device goes offline, and briefly confirms
 * when it comes back online.
 */
function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowBackOnline(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowBackOnline(true);
      // Hide the "back online" message after 3 seconds
      setTimeout(() => setShowBackOnline(false), 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (isOffline) {
    return (
      <div className="offline-indicator offline">
        📡 You are offline. Some features may not work.
      </div>
    );
  }

  if (showBackOnline) {
    return (
      <div className="offline-indicator online">
        ✅ Back online
      </div>
    );
  }

  return null;
}

export default OfflineIndicator;
