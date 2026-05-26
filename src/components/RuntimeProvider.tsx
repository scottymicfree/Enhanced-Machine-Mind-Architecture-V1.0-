import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

/**
 * RuntimeProvider
 * 
 * Enforces the runtime contract for the React frontend.
 * - Handles state hydration on boot.
 * - Initializes WebSocket/IPC listeners for specific topics.
 * - Saves safe state periodically.
 */
export const RuntimeProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const hydrateState = useStore(state => state.hydrateState);
  const initWebsocket = useStore(state => state.initWebsocket);
  const isHydrated = useStore(state => state.isHydrated);

  const initRef = useRef(false);

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      // 1. Hydrate the last known safe state from local storage / Rust backend
      hydrateState();

      // 2. Initialize Telemetry transport layer (IPC / WS)
      initWebsocket();

      console.log("[RuntimeProvider] E.M.M.A. React Runtime Initialized. IPC topics mapped to strictly typed Zustand reducers.");
    }
  }, [hydrateState, initWebsocket]);

  // Prevent rendering underlying UI until base state is restored
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-gray-400 font-mono text-sm tracking-widest">
        HYDRATING COGNITIVE STATE...
      </div>
    );
  }

  return <>{children}</>;
});
