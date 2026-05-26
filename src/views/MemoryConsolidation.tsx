import { Search, Database, Moon, SearchX, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { HippocampalScatterPlot } from '../components/HippocampalScatterPlot';

// Fake memory clusters
const MEMORY_CLUSTERS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  z: Math.random() * 10,
  status: Math.random() > 0.8 ? 'DECAYING' : 'ACTIVE',
  type: Math.random() > 0.9 ? 'N2_SPINDLE' : 'STANDARD'
}));

export function MemoryConsolidation() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);

  return (
    <div className="w-full h-full flex flex-col p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-white flex items-center gap-3">
            <Moon className="w-6 h-6 text-purple-500" />
            Memory Consolidation (LTM Vector Vault)
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Artificial Sleep Cycle & Embedding Pruning</p>
        </div>
        
        <div className="relative w-64">
           <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
           <input 
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             placeholder="Query semantic memory..." 
             className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-9 pr-4 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono transition-shadow shadow-inner"
           />
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        
        {/* Constellation Visualizer */}
        <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl relative overflow-hidden shadow-[inset_0_0_80px_rgba(0,0,0,0.6)]">
          <HippocampalScatterPlot />
        </div>

        {/* Action Panel */}
        <div className="w-80 flex flex-col space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col space-y-4">
            <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-500" />
              Cluster Inspector
            </h3>
            
            {selectedCluster !== null ? (
              <div className="space-y-4 font-mono text-xs">
                <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800">
                  <span className="text-zinc-500 block mb-1">CLUSTER ID</span>
                  <span className="text-purple-400">VEC_{selectedCluster.toString().padStart(4, '0')}</span>
                </div>
                <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800">
                  <span className="text-zinc-500 block mb-1">SEMANTIC DISTANCE</span>
                  <span className="text-zinc-300">0.0412</span>
                </div>
                <button 
                  onClick={() => setSelectedCluster(null)}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-red-950/40 text-red-500 border border-red-900/50 rounded hover:bg-red-900/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Puncture Memory
                </button>
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-zinc-600 font-mono text-xs space-y-2">
                <SearchX className="w-6 h-6 mb-2 opacity-50" />
                No cluster selected.
              </div>
            )}
          </div>
          
          <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col">
             <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2 mb-4">
              <Moon className="w-4 h-4 text-zinc-500" />
              Decay Tracker
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2">
               {MEMORY_CLUSTERS.filter(c => c.status === 'DECAYING').map(c => (
                 <div key={c.id} className="flex items-center justify-between p-2 text-xs font-mono border-b border-zinc-800/50 last:border-0">
                    <span className="text-zinc-600 truncate">VEC_{c.id.toString().padStart(4, '0')}</span>
                    <span className="text-zinc-500">Pruning...</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
