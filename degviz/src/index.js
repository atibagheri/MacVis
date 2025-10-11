import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';

// (optional) normalize old /AppDEG#/ URLs people might have bookmarked
if (window.location.pathname !== '/' && window.location.hash) {
  window.location.replace('/' + window.location.hash);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
