import './global.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/app/App';
import ComponentHarness from './component-harness';

const root = createRoot(document.getElementById('root')!);

// Component harness route — renders a single component in isolation for screenshots
if (window.location.pathname === '/component-harness') {
  root.render(<ComponentHarness />);
} else {
  root.render(<App />);
}
