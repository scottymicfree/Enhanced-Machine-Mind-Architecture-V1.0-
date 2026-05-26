import { Brain, ShieldAlert, Database, Dna, Eye } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const navItems = [
  { id: 'cognitive', icon: Brain, label: 'Cognitive Core', color: 'text-cyan-500' },
  { id: 'aegis', icon: ShieldAlert, label: 'Aegis Security', color: 'text-red-500' },
  { id: 'memory', icon: Database, label: 'Memory Consolidation', color: 'text-purple-500' },
  { id: 'evolution', icon: Dna, label: 'Evolution Engine', color: 'text-orange-500' },
  { id: 'optical', icon: Eye, label: 'Optical Bridge', color: 'text-zinc-300' }
];

export function Sidebar({ activeView, setActiveView }: SidebarProps) {
  const neuroPhase = useStore(state => state.neuroPhase);

  return (
    <div className="w-16 h-full bg-zinc-950 border-r border-zinc-800 flex flex-col items-center py-6 space-y-8 shrink-0">
      <div className="w-10 h-10 rounded-xl bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center font-bold text-xl tracking-tighter text-zinc-300 shadow-inner overflow-hidden relative">
        <span className="relative z-10">E</span>
      </div>

      <div className="flex flex-col space-y-4 flex-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-all group relative",
              activeView === item.id 
                ? "bg-zinc-800 shadow-inner" 
                : "hover:bg-zinc-900"
            )}
            title={item.label}
          >
            <item.icon 
              className={cn(
                "w-5 h-5 transition-colors", 
                activeView === item.id ? item.color : "text-zinc-500 group-hover:text-zinc-400"
              )} 
            />
            {/* Minimal left indicator */}
            {activeView === item.id && (
              <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 rounded-r bg-current", item.color)} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
