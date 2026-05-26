import { useStore } from '../store/useStore';
import { Activity, Server, Cpu, Zap, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';

const phaseColors = {
  GAMMA: 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]',
  BETA: 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]',
  ALPHA: 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]',
  THETA: 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]',
  DELTA: 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)]'
};

export function StatusBar() {
  const connectionPing = useStore(state => state.connectionPing);
  const grpcStatus = useStore(state => state.grpcStatus);
  const neuroPhase = useStore(state => state.neuroPhase);
  const hardware = useStore(state => state.hardware);
  const [pulsing, setPulsing] = useState(false);

  // Pulse animation for the neuro phase
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsing((p) => !p);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-12 w-full bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-6 text-xs text-zinc-400 font-mono z-50 shrink-0">
      <div className="flex items-center space-x-6">
        {/* Connection Array */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <Activity className="w-4 h-4 text-zinc-500" />
            <span>{connectionPing}ms</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Server className={cn("w-4 h-4", grpcStatus === 'CONNECTED' ? 'text-green-500' : 'text-red-500')} />
            <span>gRPC {grpcStatus}</span>
          </div>
        </div>

        <div className="h-4 w-px bg-zinc-800"></div>

        {/* Neuro-Phase */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="uppercase text-zinc-300">Phase: {neuroPhase}</span>
            <div 
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all duration-1000", 
                phaseColors[neuroPhase],
                pulsing ? 'opacity-100 scale-110' : 'opacity-70 scale-95'
              )}
            />
          </div>
        </div>
      </div>

      {/* Hardware HUD */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-zinc-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 leading-none mb-1">HOST CPU</span>
            <span className="text-zinc-200 leading-none">{hardware.systemLoad.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-zinc-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 leading-none mb-1">HOST MEM</span>
            <span className="text-zinc-200 leading-none">{hardware.memUsagePercent.toFixed(1)}%</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-zinc-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 leading-none mb-1">NODE POWER</span>
            <span className="text-zinc-200 leading-none">{hardware.powerDraw.toFixed(0)} W</span>
          </div>
        </div>

        <div className="h-4 w-px bg-zinc-800 mx-2"></div>
        
        
        {/* User Identity */}
        <div className="flex items-center space-x-2 px-2 py-1 bg-zinc-900 rounded border border-zinc-800">
          <User className="w-3.5 h-3.5 text-zinc-400" />
          <span>SYSADMIN</span>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
        </div>
      </div>
    </div>
  );
}
