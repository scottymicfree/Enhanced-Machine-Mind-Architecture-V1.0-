import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { BootScreen } from './components/BootScreen';

// The views
import { AegisSecurity } from './views/AegisSecurity';
import { CognitiveCore } from './views/CognitiveCore';
import { EvolutionEngine } from './views/EvolutionEngine';
import { MemoryConsolidation } from './views/MemoryConsolidation';
import { OpticalBridge } from './views/OpticalBridge';
import { ChatWindow } from './components/ChatWindow';

export default function App() {
  const [booted, setBooted] = useState(false);
  const [activeView, setActiveView] = useState('cognitive');
  const [showChat, setShowChat] = useState(false);

  if (!booted) {
    return <BootScreen onComplete={() => setBooted(true)} />;
  }

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <div className="flex flex-col flex-1 min-w-0 h-full relative">
        <StatusBar />
        <main className="flex-1 overflow-hidden relative flex">
          <div className="flex-1 h-full overflow-hidden relative">
            {activeView === 'cognitive' && <CognitiveCore />}
            {activeView === 'aegis' && <AegisSecurity />}
            {activeView === 'memory' && <MemoryConsolidation />}
            {activeView === 'evolution' && <EvolutionEngine />}
            {activeView === 'optical' && <OpticalBridge />}
          </div>
          
          {/* Preserved Chat Window from previous request */}
          {showChat && (
            <div className="w-96 h-full border-l border-zinc-800 bg-zinc-950 shadow-2xl z-40 flex flex-col pt-4 pb-4 pr-4">
              <ChatWindow />
            </div>
          )}
        </main>
        
        {/* Toggle Chat Window Button */}
        <button 
          onClick={() => setShowChat(!showChat)}
          className="absolute bottom-6 right-6 px-4 py-2 bg-cyan-900/80 hover:bg-cyan-800 text-cyan-100 border border-cyan-700 rounded-full font-mono text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] backdrop-blur-md z-50 transition-all cursor-pointer"
        >
          {showChat ? 'HIDE TELEMETRY CHAT' : 'SHOW TELEMETRY CHAT'}
        </button>
      </div>
    </div>
  );
}
