import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { Network, Zap, ShieldAlert, Cpu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MoEGraph } from '../components/MoEGraph';

// Simulated expert nodes configuration
const EXPERT_NODES = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  x: 50 + 40 * Math.cos((i * 2 * Math.PI) / 32),
  y: 50 + 40 * Math.sin((i * 2 * Math.PI) / 32),
  type: i % 4 === 0 ? 'SYSTEM_2' : 'SYSTEM_1'
}));

export function CognitiveCore() {
  const moeActiveNodes = useStore(state => state.moeActiveNodes);
  const rosaisAlertActive = useStore(state => state.rosaisAlertActive);
  const dispatchSystemShift = useStore(state => state.dispatchSystemShift);
  const [activeRoute, setActiveRoute] = useState<[number, number] | null>(null);

  // Update route visually when activeNodes change
  useEffect(() => {
    if (moeActiveNodes.length >= 2) {
      setActiveRoute([moeActiveNodes[0], moeActiveNodes[1]]);
      const timeout = setTimeout(() => setActiveRoute(null), 800);
      return () => clearTimeout(timeout);
    }
  }, [moeActiveNodes]);

  return (
    <div className="w-full h-full flex flex-col p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-zinc-100 flex items-center gap-3">
            <Network className="w-6 h-6 text-cyan-500" />
            Cognitive Core & Neuro-Mesh Visualizer
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Mixture of Experts (MoE) Active Routing State</p>
        </div>
        
        <div className="flex space-x-3">
          <button 
            onClick={() => dispatchSystemShift('BETA', 'Manual Override')}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-300 font-mono transition-colors flex items-center gap-2"
          >
            <Zap className="w-4 h-4 text-yellow-500" />
            SYSTEM 1 FORCE
          </button>
          <button 
            onClick={() => dispatchSystemShift('DELTA', 'Manual Override')}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-300 font-mono transition-colors flex items-center gap-2"
          >
            <Network className="w-4 h-4 text-purple-500" />
            SYSTEM 2 FORCE
          </button>
        </div>
      </div>

      <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl relative overflow-hidden flex flex-col lg:flex-row shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
        {/* Graph Area */}
        <div className="flex-1 relative">
          <MoEGraph />
        </div>

        {/* Info Panel */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-900/50 p-6 flex flex-col space-y-6 shrink-0">
          <div>
            <h3 className="text-xs uppercase text-zinc-500 font-mono mb-3 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5" />
              Expert Nodes
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {EXPERT_NODES.slice(0, 16).map(node => (
                <div 
                  key={node.id}
                  className={cn(
                    "h-8 rounded flex items-center justify-center text-xs font-mono border",
                    moeActiveNodes.includes(node.id) 
                      ? rosaisAlertActive && node.id === moeActiveNodes[0]
                        ? "bg-red-500/20 border-red-500/50 text-red-500" 
                        : "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                      : "bg-zinc-950 border-zinc-800 text-zinc-600"
                  )}
                >
                  n{node.id}
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-xs uppercase text-zinc-500 font-mono mb-3 flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              RoSais Security TRN Gating
            </h3>
            {rosaisAlertActive ? (
              <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 font-mono text-xs space-y-2">
                <p className="font-bold border-b border-red-900/50 pb-2">ADVERSARIAL BYPASS DETECTED</p>
                <p>Node n{moeActiveNodes[0]} score below threshold (0.24).</p>
                <p>Gating mechanism activated. Route blocked.</p>
              </div>
            ) : (
              <div className="p-4 bg-zinc-950/40 border border-zinc-800/50 rounded-lg text-zinc-400 font-mono text-xs text-center flex flex-col items-center justify-center h-24">
                <ShieldAlert className="w-5 h-5 text-zinc-600 mb-2 opacity-50" />
                <p>No active anomalies.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
