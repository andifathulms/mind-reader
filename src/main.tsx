import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { StoreProvider } from './state/context';
import { seedFrom } from './engine/rng';

const root = document.getElementById('root');
if (!root) throw new Error('No root element');

createRoot(root).render(
  <StrictMode>
    <StoreProvider seed={seedFrom(Date.now())}>
      <App />
    </StoreProvider>
  </StrictMode>,
);
