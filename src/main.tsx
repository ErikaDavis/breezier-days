import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { startAppUpdates } from './appUpdates';

if (import.meta.env.PROD) startAppUpdates(__BREEZIER_BUILD_ID__);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
