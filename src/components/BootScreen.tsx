import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Cpu, ShieldAlert, CheckCircle2 } from 'lucide-react';

const BOOT_LOGS = [
  "Initializing Host Hypervisor Constraints...",
  "KVM Verification: SUCCESS",
  "Generating virtual TAP device interface (tap0)...",
  "Enforcing kernel IPv4 forwarding parameters...",
  "Mounting eBPF XDP network intercepts...",
  "Bringing Weaviate Vector DB online (Port 8080)...",
  "Booting local Llama-3 parameter space...",
  "Compiling telemetry.proto gRPC bindings...",
  "Starting native Ray actor pools (GPU 0.25 fractional)...",
  "Loading UI Telemetry Pipelines...",
  "E.M.M.A. SOVEREIGN NODE READY."
];

interface BootScreenProps {
  onComplete: () => void;
}

export function BootScreen({ onComplete }: BootScreenProps) {
  const [booting, setBooting] = useState(false);
  const [logIndex, setLogIndex] = useState(0);

  useEffect(() => {
    if (!booting) return;

    if (logIndex < BOOT_LOGS.length - 1) {
      const timer = setTimeout(() => {
        setLogIndex(prev => prev + 1);
      }, Math.random() * 300 + 100);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        onComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [booting, logIndex, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center font-mono">
      <AnimatePresence mode="wait">
        {!booting ? (
          <motion.div 
            key="start-btn"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            className="flex flex-col items-center space-y-8"
          >
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-zinc-100 tracking-widest">E.M.M.A.</h1>
              <p className="text-zinc-500 text-sm tracking-widest">ENHANCED MACHINE MIND ARCHITECTURE</p>
              <div className="pt-4 flex justify-center">
                <span className="px-3 py-1 bg-red-950/50 text-red-400 border border-red-900/50 rounded text-xs">OFFLINE STATE</span>
              </div>
            </div>

            <button
              onClick={() => setBooting(true)}
              className="relative group px-12 py-4 bg-cyan-950/50 hover:bg-cyan-900 text-cyan-400 border border-cyan-800 rounded-lg uppercase tracking-[0.2em] transition-all hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
              Initialize Start Sequence
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="boot-sequence"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-2xl px-6"
          >
            <div className="flex items-center space-x-3 text-cyan-500 mb-6 border-b border-zinc-800 pb-4">
              <Terminal size={20} className="animate-pulse" />
              <span className="text-sm tracking-widest">SYSTEM INITIALIZATION PROTOCOL</span>
            </div>
            
            <div className="space-y-2 text-xs font-mono h-[300px] flex flex-col justify-end">
              {BOOT_LOGS.slice(0, logIndex + 1).map((log, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i} 
                  className={`flex items-start space-x-3 ${i === BOOT_LOGS.length - 1 ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}
                >
                  <span className="text-zinc-600">[{new Date().toISOString().split('T')[1].slice(0, -1)}]</span>
                  <span>{log}</span>
                </motion.div>
              ))}
              <div className="h-4 flex items-center">
                {logIndex < BOOT_LOGS.length - 1 && (
                  <span className="w-2 h-4 bg-cyan-500 animate-pulse" />
                )}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4">
               <div className={`p-3 border rounded flex flex-col items-center justify-center space-y-2 transition-colors ${logIndex > 3 ? 'border-cyan-800 text-cyan-400' : 'border-zinc-800 text-zinc-600'}`}>
                 <Cpu size={20} />
                 <span className="text-[10px]">KERNEL TAP</span>
               </div>
               <div className={`p-3 border rounded flex flex-col items-center justify-center space-y-2 transition-colors ${logIndex > 6 ? 'border-purple-800 text-purple-400' : 'border-zinc-800 text-zinc-600'}`}>
                 <Terminal size={20} />
                 <span className="text-[10px]">LLM ALLOCATED</span>
               </div>
               <div className={`p-3 border rounded flex flex-col items-center justify-center space-y-2 transition-colors ${logIndex > 8 ? 'border-emerald-800 text-emerald-400' : 'border-zinc-800 text-zinc-600'}`}>
                 <CheckCircle2 size={20} />
                 <span className="text-[10px]">SYS READY</span>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
