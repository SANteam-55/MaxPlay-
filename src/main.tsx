import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against browser iframe background/hidden database closing exceptions
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event?.reason?.message || '';
    if (
      msg.includes('Database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('IndexedDB') ||
      event?.reason?.name === 'InvalidStateError'
    ) {
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (
      msg.includes('Database is closing') ||
      msg.includes('closing/hidden') ||
      msg.includes('IndexedDB')
    ) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

