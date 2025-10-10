import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initAuth } from './auth'

// Initialize Firebase Auth before rendering
initAuth()
  .then(() => {
    console.log('✅ Auth initialized, rendering app...');
    createRoot(document.getElementById("root")!).render(<App />);
  })
  .catch((error) => {
    console.error('❌ Failed to initialize auth:', error);
    // Render error state
    document.getElementById("root")!.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;">
        <div style="text-align: center; padding: 2rem;">
          <h1 style="color: #ef4444; margin-bottom: 1rem;">Authentication Error</h1>
          <p style="color: #6b7280; margin-bottom: 1rem;">${error.message}</p>
          <button onclick="location.reload()" style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
            Reload Page
          </button>
        </div>
      </div>
    `;
  });
