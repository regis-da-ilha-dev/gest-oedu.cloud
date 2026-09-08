import {createRoot} from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import 'react-quill-new/dist/quill.snow.css';

// Protect against iframe, extension, and empty object rejection noise
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (!event.reason || (typeof event.reason === 'object' && Object.keys(event.reason).length === 0)) {
      event.preventDefault();
      return;
    }
    const msg = event.reason?.message || String(event.reason || '');
    if (
      msg.includes('ResizeObserver') || 
      msg.includes('permission-denied') || 
      msg.includes('AudioContext') ||
      msg.includes('aborted') ||
      msg.includes('play() failed')
    ) {
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    if (
      event.message?.includes('ResizeObserver') || 
      event.message?.includes('Script error.')
    ) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </HashRouter>,
);
