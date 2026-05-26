import { useStore } from '../store/useStore';
import { Shield, Map as MapIcon, Lock, TerminalSquare, AlertTriangle, PowerOff } from 'lucide-react';
import { sendMutation } from '../lib/apiBridge';
import { useState } from 'react';

export function AegisSecurity() {
  const threats = useStore(state => state.threats);
  const [sendingConfig, setSendingConfig] = useState(false);

  const triggerIntent = async (intent: string) => {
    setSendingConfig(true);
    try {
      await sendMutation(intent);
      console.log(`Successfully dispatched ${intent}`);
    } catch (e) {
      console.error(`Failed to dispatch ${intent}:`, e);
    } finally {
      setTimeout(() => setSendingConfig(false), 500);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-white flex items-center gap-3">
            <Shield className="w-6 h-6 text-red-500" />
            Aegis Security & OSINT Threat Landscape
          </h1>
          <p className="text-zinc-500 text-sm mt-1">eBPF Intercepts & MicroVM Sandboxing</p>
        </div>
        
        <div className="flex space-x-3">
          <button 
            disabled={sendingConfig}
            onClick={() => triggerIntent("LOCKDOWN")}
            className="flex items-center space-x-2 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-500 px-4 py-2 rounded text-xs font-mono font-bold transition-colors disabled:opacity-50"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>TRIGGER LOCKDOWN</span>
          </button>
          
          <button 
            disabled={sendingConfig}
            onClick={() => triggerIntent("DISABLE_TRN")}
            className="flex items-center space-x-2 bg-orange-950/40 hover:bg-orange-900/60 border border-orange-900/50 text-orange-500 px-4 py-2 rounded text-xs font-mono font-bold transition-colors disabled:opacity-50"
          >
            <PowerOff className="w-3.5 h-3.5" />
            <span>DISABLE TRN</span>
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        
        {/* Globe / Map Simulation */}
        <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl relative overflow-hidden flex flex-col shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]">
          <div className="absolute top-4 left-4 flex items-center space-x-2 text-xs font-mono text-zinc-500 z-10 bg-zinc-900/80 px-3 py-1.5 rounded border border-zinc-800 backdrop-blur">
            <MapIcon className="w-3.5 h-3.5" />
            <span>IntellyWeave Globe Active</span>
          </div>

          {/* Simple Map Visualization Simulation */}
          <div className="flex-1 w-full flex items-center justify-center relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950">
             {/* Grid overlay */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]"></div>
             
             {/* Fake globe/radar lines */}
             <svg className="w-[400px] h-[400px] opacity-20" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-red-500" strokeWidth="0.2" />
                <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" className="text-red-500" strokeWidth="0.2" />
                <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" className="text-red-500" strokeWidth="0.2" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" className="text-red-500" strokeWidth="0.2" />
                <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" className="text-red-500" strokeWidth="0.2" />
             </svg>

             {/* Plot threats */}
             {threats.slice(0, 3).map((threat, i) => (
                <div 
                  key={threat.id}
                  className="absolute w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"
                  style={{ 
                    top: `${30 + (i * 15)}%`, 
                    left: `${40 + (i * 20)}%` 
                  }}
                >
                  <div className="absolute top-4 left-4 w-max p-1.5 bg-red-950/80 border border-red-900/50 rounded text-[9px] font-mono text-red-200">
                    {threat.ip}
                  </div>
                </div>
             ))}
          </div>
        </div>

        {/* Side Panels */}
        <div className="flex flex-col space-y-6">
          
          {/* Tarpit Monitor */}
          <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center space-x-2 bg-zinc-900/30">
              <Lock className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-medium text-zinc-300">Tarpit Monitor</h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-xs">
              {threats.filter(t => t.action === 'TARPIT').map(t => (
                <div key={t.id} className="p-3 bg-red-950/20 border border-red-900/30 rounded flex flex-col space-y-2">
                  <div className="flex justify-between items-center text-red-400">
                    <span>{t.ip}</span>
                    <span>{t.duration}s HELD</span>
                  </div>
                  <div className="text-zinc-500 truncate text-[10px]">{t.ja4}</div>
                </div>
              ))}
              {threats.filter(t => t.action === 'TARPIT').length === 0 && (
                 <div className="text-zinc-600 h-full flex items-center justify-center">No active tarpits</div>
              )}
            </div>
          </div>

          {/* MicroVM Sandbox Arena */}
          <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/30">
              <div className="flex items-center space-x-2">
                <TerminalSquare className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-medium text-zinc-300">MicroVM Sandbox Arena</h3>
              </div>
              <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-mono">2 WARM</span>
            </div>
            <div className="flex-1 p-4 flex flex-col space-y-3">
              <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">fc-vm-042.sock</span>
                <span className="text-red-400 animate-pulse text-[10px] bg-red-950/50 px-1.5 py-0.5 rounded">ACTIVE: AP-SC-042</span>
              </div>
              <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">fc-vm-043.sock</span>
                <span className="text-green-500 text-[10px] bg-green-950/50 px-1.5 py-0.5 rounded">DORMANT</span>
              </div>
              <div className="mt-auto">
                <div className="bg-red-950/40 p-3 rounded border border-red-900/50">
                  <div className="flex items-center space-x-2 text-red-500 text-xs mb-1 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>PHANTOM-FS MUTATION</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    MicroVM fc-vm-042 structure modified. Tarpit payload execution isolated. Auto-teardown initiated.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
