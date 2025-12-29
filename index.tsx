
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';

// Polyfill process for browser environments to prevent crash when accessing process.env
if (typeof window !== 'undefined' && !(window as any).process) {
    (window as any).process = { env: { API_KEY: '' } };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
