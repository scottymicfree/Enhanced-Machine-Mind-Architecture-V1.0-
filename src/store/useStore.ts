import { create } from 'zustand';

export type NeuroPhase = 'GAMMA' | 'BETA' | 'ALPHA' | 'THETA' | 'DELTA';

export interface HardwareMetrics {
  vramFragmentation: number; // Percentage
  nvlinkBandwidth: number; // GB/s
  powerDraw: number; // Watts
  systemLoad: number; // Host load
  memUsagePercent: number; // Host memory
}

export interface Threat {
  id: string;
  ip: string;
  ja4: string;
  action: 'TARPIT' | 'DROP';
  timestamp: Date;
  duration?: number; // seconds held
}

export interface Mutation {
  id: string;
  diffString: string;
  benchmarkScore: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface EmmaState {
  // Global Status
  connectionPing: number;
  grpcStatus: 'CONNECTED' | 'DISCONNECTED' | 'WEBRTC_FALLBACK';
  neuroPhase: NeuroPhase;
  hardware: HardwareMetrics;
  
  // Events & Data (Bound to AegisSecurity Panel)
  threats: Threat[];
  
  // Evolution Engine Data (Bound to Sandbox/Evolution Panel)
  mutations: Mutation[];
  
  // Cognitive Core Data (Bound to MoE/Cognitive Panel)
  moeActiveNodes: number[];
  rosaisAlertActive: boolean;
  
  // Memory Fabric Data (Bound to Memory Visualization Panel)
  memoryVectors: any[];

  // Gaze Data (Bound to Optical Bridge Panel)
  gazeCoords: { x: number; y: number; smoothed: boolean };

  // Setters / Reducers
  dispatchSystemShift: (phase: NeuroPhase, reason: string) => void;
  dispatchThreatCaught: (threat: Omit<Threat, 'id' | 'timestamp'>) => void;
  dispatchMutationProposed: (mutation: Omit<Mutation, 'id' | 'status'>) => void;
  updateHardware: (metrics: Partial<HardwareMetrics>) => void;
  updateGaze: (x: number, y: number, smoothed: boolean) => void;
  updateMoe: (activeNodes: number[], alert: boolean) => void;
  updateMemory: (vectors: any[]) => void;
  
  // Hydration state
  isHydrated: boolean;
  setHydrated: (hydrated: boolean) => void;

  // Hydration logic
  hydrateState: () => void;
  
  // WS Methods
  initWebsocket: () => void;
  ws: WebSocket | null;
}

export const useStore = create<EmmaState>((set, get) => ({
  connectionPing: 10,
  grpcStatus: 'DISCONNECTED',
  neuroPhase: 'GAMMA',
  hardware: {
    vramFragmentation: 0,
    nvlinkBandwidth: 0,
    powerDraw: 0,
    systemLoad: 0,
    memUsagePercent: 0
  },
  threats: [],
  mutations: [
    { id: 'm1', diffString: '+ const adaptiveRouting = weights.map(w => w * 1.05);\n- const adaptiveRouting = weights;', benchmarkScore: 94.2, status: 'PENDING' }
  ],
  moeActiveNodes: [],
  rosaisAlertActive: false,
  gazeCoords: { x: 50, y: 50, smoothed: true },
  memoryVectors: [],

  isHydrated: false,
  setHydrated: (hydrated) => set({ isHydrated: hydrated }),

  hydrateState: () => {
    // State Hydration: Attempt to pull the last known safe state from localStorage
    try {
      const saved = localStorage.getItem('emma_safe_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        set((state) => ({
          ...state,
          neuroPhase: parsed.neuroPhase || state.neuroPhase,
          threats: parsed.threats ? parsed.threats.map((t: any) => ({ ...t, timestamp: new Date(t.timestamp) })) : state.threats,
          mutations: parsed.mutations || state.mutations,
        }));
      }
    } catch (e) {
      console.error("Hydration failed", e);
    }
    set({ isHydrated: true });
  },

  ws: null,

  initWebsocket: () => {
    if (get().ws) return; // Prevent double connection
    
    // In dev this targets port 3000, in prod same origin
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      set({ grpcStatus: 'CONNECTED' });
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        // EXACT STRING LITERALS FOR TAURI IPC / WS TOPICS
        switch (msg.type) {
          case 'hardware_telemetry':
            get().updateHardware(msg.payload.hardware);
            break;
          case 'aegis_telemetry':
            get().dispatchThreatCaught(msg.payload);
            break;
          case 'moe_telemetry':
            get().updateMoe(msg.payload.active_experts, msg.payload.rosais_alert);
            break;
          case 'memory_telemetry':
            get().updateMemory(msg.payload.vectors);
            break;
          case 'gaze_telemetry':
            get().updateGaze(msg.payload.x, msg.payload.y, msg.payload.smoothed);
            break;
          default:
            break;
        }
      } catch(e) {
        console.error('Failed to parse WS msg', e);
      }
    };

    socket.onclose = () => {
      set({ grpcStatus: 'DISCONNECTED', ws: null });
      // rudimentary reconnect logic
      setTimeout(() => get().initWebsocket(), 3000);
    };

    set({ ws: socket });
  },

  dispatchSystemShift: (phase, reason) => set({ neuroPhase: phase }),
  dispatchThreatCaught: (threat) => set((state) => {
    const nextThreats = [{ id: Math.random().toString(36).substr(2, 9), timestamp: new Date(), ...threat }, ...state.threats.slice(0, 49)];
    // Persist safe state
    localStorage.setItem('emma_safe_state', JSON.stringify({ threats: nextThreats }));
    return { threats: nextThreats };
  }),
  dispatchMutationProposed: (mutation) => set((state) => ({
    mutations: [{ id: Math.random().toString(36).substr(2, 9), status: 'PENDING', ...mutation }, ...state.mutations]
  })),
  updateHardware: (metrics) => set((state) => ({ hardware: { ...state.hardware, ...metrics } })),
  updateGaze: (x, y, smoothed) => set({ gazeCoords: { x, y, smoothed } }),
  updateMoe: (activeNodes, alert) => set({ moeActiveNodes: activeNodes, rosaisAlertActive: alert }),
  updateMemory: (vectors) => set((state) => {
    // Append new vectors and cap the total amount to avoid memory leaks
    const newVectors = [...state.memoryVectors, ...vectors];
    // Keep max 2000 points
    if (newVectors.length > 2000) {
      return { memoryVectors: newVectors.slice(newVectors.length - 2000) };
    }
    return { memoryVectors: newVectors };
  })
}));

/**
 * ==========================================
 * DATA BINDING CONTRACTS (Rendering Selectors)
 * ==========================================
 * To prevent high-frequency updates from causing global re-renders, 
 * use these exact selectors with shallow equality in the UI components.
 * Example usage: const memoryVectors = useStore(selectMemoryVectors);
 */
export const selectAegisThreats = (state: EmmaState) => state.threats;
export const selectHardwareMetrics = (state: EmmaState) => state.hardware;
export const selectMemoryVectors = (state: EmmaState) => state.memoryVectors;
export const selectGazeCoords = (state: EmmaState) => state.gazeCoords;
export const selectMoeState = (state: EmmaState) => ({
  activeNodes: state.moeActiveNodes,
  alert: state.rosaisAlertActive
});
