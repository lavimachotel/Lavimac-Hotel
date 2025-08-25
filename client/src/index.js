import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';

// Custom analytics function for web vitals
const sendToAnalytics = ({ name, delta, value, id }) => {
  // In production, you would send these metrics to your analytics service
  console.log({ name, delta, value, id });
  
  // Example: if using Google Analytics
  // window.gtag('event', name, {
  //   value: delta,
  //   metric_id: id,
  //   metric_value: value,
  //   metric_delta: delta,
  // });
};

// Get base URL from environment or default to root
const baseUrl = process.env.PUBLIC_URL || '';

// Log app startup
console.log('🚀 Hotel Management System starting...');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={baseUrl}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

// Enable performance monitoring
reportWebVitals(sendToAnalytics);
