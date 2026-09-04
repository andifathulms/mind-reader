import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { StoreProvider } from './state/context';
import { seedFrom } from './engine/rng';
import { readUrl } from './state/url';

const root = document.getElementById('root');
if (!root) throw new Error('No root element');

// Config and seed come from the URL when there is one, so a link reproduces a
// machine exactly. Press history never travels: it is a session, and a session
// belongs to whoever played it.
const { config, seed } = readUrl(window.location.hash, seedFrom(Date.now()));

createRoot(root).render(
  <StrictMode>
    <StoreProvider config={config} seed={seed}>
      <App />
    </StoreProvider>
  </StrictMode>,
);
