/* Service Worker registration for BMK Komet Activity Logger PWA.
 *
 * Registers /service-worker.js and handles update detection.
 * When a new version is available, calls the onUpdate callback so the
 * app can show an "Update available" prompt.
 */

export function registerServiceWorker(onUpdate) {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  // Only register in production (built) environment
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        // Check for updates on each load
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New version available
              if (typeof onUpdate === 'function') {
                onUpdate(registration);
              }
            }
          });
        });
      })
      .catch((err) => {
        console.warn('Service worker registration failed:', err);
      });

    // Reload once the new SW takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}

export function applyUpdate(registration) {
  if (registration && registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}
