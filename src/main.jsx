// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Suppress Blockly deprecation warnings globally
const originalConsoleWarn = console.warn;
console.warn = function(...args) {
  const message = args.join(' ');
  if (message.includes('getAllVariables was deprecated') || 
      message.includes('Use Blockly.Workspace.getVariableMap().getAllVariables instead') ||
      message.includes('Blockly.Workspace.getAllVariables was deprecated')) {
    // Suppress this specific deprecation warning
    return;
  }
  originalConsoleWarn.apply(console, args);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
