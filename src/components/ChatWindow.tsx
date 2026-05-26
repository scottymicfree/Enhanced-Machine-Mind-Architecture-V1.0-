import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { MessageSquare, Send, Bot, User, X, Maximize2 } from 'lucide-react';
import clsx from 'clsx';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

export function ChatWindow() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Cognitive loop active. I have full read-access to the dashboard telemetry. How can I assist?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // We don't subscribe to the global store here to prevent high-frequency re-renders.
  // Instead, we fetch the current state directly when needed via useStore.getState()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsTyping(true);

    try {
      // Pick a subset of interesting state
      const globalState = useStore.getState();
      const stateSnapshot = {
        grpcStatus: globalState.grpcStatus,
        neuroPhase: globalState.neuroPhase,
        hardware: globalState.hardware,
        threatsCount: globalState.threats.length,
        moeActiveNodes: globalState.moeActiveNodes,
        rosaisAlertActive: globalState.rosaisAlertActive,
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, systemState: stateSnapshot }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Error connecting to NLP interface.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute bottom-6 right-6 p-4 rounded-full bg-cyan-900 border border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-800 transition-colors z-50 flex items-center justify-center group"
      >
        <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <div className="absolute bottom-6 right-6 w-96 flex flex-col bg-zinc-950/90 border border-zinc-800 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-50" style={{ maxHeight: '80vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-cyan-400" />
          <span className="font-mono text-sm font-bold text-zinc-200">E.M.M.A. Bridge</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
        {messages.map((m, i) => (
          <div key={i} className={clsx("flex flex-col max-w-[85%]", m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start")}>
            <div className={clsx(
              "px-3 py-2 rounded-lg text-sm",
              m.role === 'user' 
                ? "bg-cyan-900/50 border border-cyan-500/30 text-cyan-100" 
                : "bg-zinc-800 border border-zinc-700 text-zinc-300"
            )}>
              {m.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center space-x-2 text-zinc-500 text-xs font-mono ml-1">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex space-x-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Query telemetry..."
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/50 font-mono"
            disabled={isTyping}
          />
          <button 
            onClick={handleSend}
            disabled={isTyping}
            className="p-2 bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-500/50 rounded text-cyan-400 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
