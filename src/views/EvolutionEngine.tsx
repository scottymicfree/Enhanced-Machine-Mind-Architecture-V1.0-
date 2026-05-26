import { useStore } from '../store/useStore';
import { Dna, Check, X, History, Scale, ScrollText } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';

export function EvolutionEngine() {
  const mutations = useStore(state => state.mutations);
  const pendingMutation = mutations.find(m => m.status === 'PENDING');
  
  const [debateLines] = useState([
    { role: 'PROSECUTION', text: 'Mutation alters deep routing weights. High instability risk.', color: 'text-red-400' },
    { role: 'DEFENSE', text: 'Benchmark validation confirms 94.2% stability. Required for latency drop.', color: 'text-cyan-400' },
    { role: 'JUDGE', text: 'Weighing constitutional alignment... Safety bounds intact. Presenting to human operator.', color: 'text-purple-400' }
  ]);

  return (
    <div className="w-full h-full flex flex-col p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-white flex items-center gap-3">
            <Dna className="w-6 h-6 text-orange-500" />
            Evolution Engine & Constitutional Alignment
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Recursive Self-Improvement & Synthesis Queue</p>
        </div>
        <button className="px-5 py-2 bg-red-950 hover:bg-red-900 border border-red-800 rounded font-mono text-xs text-red-200 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
          <History className="w-4 h-4" />
          CRYPTOGRAPHIC ROLLBACK
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        
        {/* Mutation Queue & Editor */}
        <div className="col-span-2 flex flex-col space-y-6">
          <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/30">
              <div className="flex items-center text-sm font-medium text-zinc-300 gap-2">
                <ScrollText className="w-4 h-4 text-orange-500" />
                Proposed Synthesis Diff
              </div>
              {pendingMutation && (
                <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-2">
                  <span className="text-green-500 bg-green-500/10 px-2 py-0.5 rounded">BENCHMARK: {pendingMutation.benchmarkScore}%</span>
                  <span>ID: {pendingMutation.id}</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 bg-[#1e1e1e] p-4 font-mono text-[13px] leading-relaxed overflow-y-auto">
              {/* Fake Monaco Diff Editor Appearance */}
              {pendingMutation ? (
                <div className="space-y-1">
                  <div className="flex text-zinc-500">
                    <span className="w-8 text-right pr-4 select-none">12</span>
                    <span className="text-zinc-400">function calculateRoutingWeights(inputs: Float32Array) {'{'}</span>
                  </div>
                  <div className="flex bg-red-950/30 text-red-300">
                    <span className="w-8 text-right pr-4 select-none text-red-500/50">-</span>
                    <span>  const adaptiveRouting = weights;</span>
                  </div>
                  <div className="flex bg-green-950/30 text-green-300">
                    <span className="w-8 text-right pr-4 select-none text-green-500/50">+</span>
                    <span>  const adaptiveRouting = weights.map(w ={'>'} w * 1.05);</span>
                  </div>
                  <div className="flex text-zinc-500">
                    <span className="w-8 text-right pr-4 select-none">15</span>
                    <span className="text-zinc-400">  return adaptiveRouting;</span>
                  </div>
                  <div className="flex text-zinc-500">
                    <span className="w-8 text-right pr-4 select-none">16</span>
                    <span className="text-zinc-400">{'}'}</span>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-600">
                  No pending mutations in queue.
                </div>
              )}
            </div>
          </div>

          <div className="h-20 flex gap-4">
             <button disabled={!pendingMutation} className="flex-1 bg-green-950/50 hover:bg-green-900/50 border border-green-900/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center font-mono text-sm text-green-400 transition-colors gap-2">
                <Check className="w-5 h-5" />
                APPROVE SYNTHESIS
             </button>
             <button disabled={!pendingMutation} className="flex-1 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center font-mono text-sm text-zinc-400 transition-colors gap-2">
                <X className="w-5 h-5" />
                REJECT MUTATION
             </button>
          </div>
        </div>

        {/* Courthouse Debate Viewer */}
        <div className="flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 bg-zinc-900/30">
            <Scale className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-medium text-zinc-300">Courthouse Debate Logs</h3>
          </div>
          <div className="flex-1 p-4 space-y-4 overflow-y-auto font-mono text-[11px]">
             {pendingMutation ? debateLines.map((line, i) => (
               <div key={i} className="flex flex-col space-y-1">
                 <span className={cn("text-[9px] font-bold tracking-wider", line.color)}>{line.role}</span>
                 <p className="text-zinc-300 bg-zinc-900/40 p-2 rounded border border-zinc-800/50 leading-relaxed">
                   {line.text}
                 </p>
               </div>
             )) : (
               <div className="text-zinc-600 h-full flex items-center justify-center">Awaiting debate trigger.</div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
