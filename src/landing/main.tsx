import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Landing } from './Landing';

const host = document.getElementById('root');
if (!host) throw new Error('No #root to mount into.');

createRoot(host).render(
  <StrictMode>
    <Landing />
  </StrictMode>,
);
