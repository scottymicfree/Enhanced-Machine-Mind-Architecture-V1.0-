import { useStore } from '../store/useStore';
import { Eye, Mic, Globe, Maximize, CornerDownRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useEffect, useRef } from 'react';

export function OpticalBridge() {
  const gazeCoords = useStore(state => state.gazeCoords);
  const updateGaze = useStore(state => state.updateGaze);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Instantiate the WebWorker for processing gaze telemetry off the main thread
    const worker = new Worker(new URL('../workers/gazeWorker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data;
      if (type === 'GAZE_UPDATE') {
        // Only update zustand state if the ref target is still visible / valid
        if (containerRef.current) {
          updateGaze(payload.x, payload.y, true);
        }
      }
    };

    // Start the synthetic but smoothed gaze loop in the background worker
    worker.postMessage({ type: 'START' });

    return () => {
      worker.postMessage({ type: 'STOP' });
      worker.terminate();
    };
  }, [updateGaze]);

  return (
    <div className="w-full h-full flex flex-col p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-white flex items-center gap-3">
            <Eye className="w-6 h-6 text-zinc-300" />
            Optical-Cognitive Browser Bridge
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Multi-modal Web Interaction & Gaze Matrix</p>
        </div>
      </div>

      <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl relative overflow-hidden flex flex-col">
        {/* Fake Browser Chrome */}
        <div className="h-12 border-b border-zinc-800 flex items-center px-4 space-x-4 bg-zinc-900/30">
           <div className="flex space-x-2">
             <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
             <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
             <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
           </div>
           <div className="flex-1 h-8 bg-zinc-900 border border-zinc-800 rounded flex items-center px-3 space-x-2 text-zinc-400 font-mono text-xs">
             <Globe className="w-3.5 h-3.5" />
             <span className="opacity-50">secure-enclave://</span>
             <span className="text-zinc-300">target-analysis.local</span>
           </div>
           <Maximize className="w-4 h-4 text-zinc-500" />
        </div>

        {/* WebView Simulator */}
        <div ref={containerRef} className="flex-1 relative bg-zinc-900 overflow-hidden cursor-crosshair">
           
           {/* Mock page content */}
           <div className="absolute inset-8 border border-zinc-800/50 bg-zinc-950 p-8 font-mono text-zinc-500 text-sm flex flex-col space-y-6 opacity-30 select-none">
             <div className="w-1/3 h-8 bg-zinc-800 rounded"></div>
             <div className="w-2/3 h-4 bg-zinc-800 rounded pt-4"></div>
             <div className="w-full h-4 bg-zinc-800 rounded"></div>
             <div className="w-3/4 h-4 bg-zinc-800 rounded"></div>
             
             <div className="grid grid-cols-3 gap-6 mt-12">
               <div className="h-32 bg-zinc-800 rounded"></div>
               <div className="h-32 bg-zinc-800 rounded border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)]"></div>
               <div className="h-32 bg-zinc-800 rounded"></div>
             </div>
           </div>

           {/* Gaze Overlay Crosshair */}
           <div 
             className="absolute w-12 h-12 pointer-events-none transition-all duration-75 ease-out z-20 mix-blend-screen"
             style={{
               left: `${gazeCoords.x}%`,
               top: `${gazeCoords.y}%`,
               transform: 'translate(-50%, -50%)' 
             }}
           >
             <div className="absolute inset-0 border border-cyan-500/50 rounded-full animate-pulse shadow-[0_0_15px_theme(colors.cyan.500)]"></div>
             <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400/80 -translate-x-1/2"></div>
             <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400/80 -translate-y-1/2"></div>
             <span className="absolute -right-12 -top-4 text-[9px] font-mono text-cyan-400">
               {gazeCoords.x.toFixed(1)}, {gazeCoords.y.toFixed(1)}
             </span>
           </div>

        </div>

        {/* Async Action Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[600px] bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 rounded-full p-2 flex items-center pr-4 shadow-[0_0_30px_rgba(0,0,0,0.8)] z-30">
          <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
            <Mic className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1 px-4 font-mono text-sm text-zinc-300">
            "Click the highlighted container"
          </div>
          <div className="shrink-0 flex items-center space-x-2 text-[10px] text-zinc-500 font-mono bg-zinc-950 px-3 py-1.5 rounded-full border border-zinc-800">
            <span>Executing via CDP</span>
            <CornerDownRight className="w-3 h-3 text-cyan-400" />
          </div>
        </div>

      </div>
    </div>
  );
}
