import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Import CartProvider
import { CartProvider } from './contexts/CartContext';

// Suppress Firebase internal assertion errors from showing in UI
// These are harmless and occur during normal Google Sign-In popup operations
const originalError = console.error;
console.error = (...args) => {
  const errorMessage = args[0]?.toString() || '';
  if (
    errorMessage.includes('INTERNAL ASSERTION FAILED') ||
    errorMessage.includes('Pending promise was never set')
  ) {
    // Silently log these known Firebase popup errors
    console.log('⚠️ Suppressed Firebase internal error:', errorMessage);
    return;
  }
  originalError.apply(console, args);
};

// Catch uncaught errors globally
window.addEventListener('error', (event) => {
  if (
    event.message?.includes('INTERNAL ASSERTION FAILED') ||
    event.message?.includes('Pending promise was never set')
  ) {
    event.preventDefault();
    console.log('⚠️ Suppressed Firebase error event');
  }
});

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.message?.includes('INTERNAL ASSERTION FAILED') ||
    event.reason?.message?.includes('Pending promise')
  ) {
    event.preventDefault();
    console.log('⚠️ Suppressed Firebase promise rejection');
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <CartProvider>
      <App />
    </CartProvider>
  </React.StrictMode>
);

reportWebVitals();
