import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { RuntimeProvider } from './components/RuntimeProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RuntimeProvider>
      <App />
    </RuntimeProvider>
  </StrictMode>,
);
