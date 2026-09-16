import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerServiceWorker, applyUpdate } from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the PWA service worker and show an update prompt when a new
// version is available.
registerServiceWorker((registration) => {
  // Show a simple, non-intrusive update banner
  const banner = document.createElement('div');
  banner.style.cssText =
    'position:fixed;bottom:0;left:0;right:0;background:#667eea;color:#fff;' +
    'padding:12px 16px;display:flex;justify-content:space-between;align-items:center;' +
    'font-family:sans-serif;font-size:14px;z-index:9999;box-shadow:0 -2px 8px rgba(0,0,0,0.2);';

  const text = document.createElement('span');
  text.textContent = 'A new version of Komet Activity Logger is available.';

  const btn = document.createElement('button');
  btn.textContent = 'Update';
  btn.style.cssText =
    'background:#fff;color:#667eea;border:none;padding:6px 16px;border-radius:6px;' +
    'font-weight:bold;cursor:pointer;margin-left:12px;';
  btn.onclick = () => {
    applyUpdate(registration);
    banner.remove();
  };

  banner.appendChild(text);
  banner.appendChild(btn);
  document.body.appendChild(banner);
});
