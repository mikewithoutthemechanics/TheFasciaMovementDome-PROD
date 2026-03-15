
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 21st.dev Toolbar - Only initialize in development mode
// Note: initToolbar may not be available in all versions
if (import.meta.env.MODE === 'development') {
  import('@21st-extension/toolbar-react').then((toolbar: unknown) => {
    const tb = toolbar as { initToolbar?: (config: { plugins: unknown[] }) => void };
    if (tb.initToolbar) {
      tb.initToolbar({
        plugins: [],
      });
    }
  }).catch(console.error);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
      <App />
  </React.StrictMode>
);
