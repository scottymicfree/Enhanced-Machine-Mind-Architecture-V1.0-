import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.post('/api/mutations', async (req, res) => {
    try {
      const { intent, payload } = req.body;
      console.log(`[API Bridge] Received mutation from browser: ${intent}`, payload);
      // In a real environment without Tauri, you might connect this to your Python backend via HTTP or raw sockets here.
      res.json({ status: 'ACKNOWLEDGED', intent });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: 'Failed to dispatch mutation: ' + e.message });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const { message, systemState } = req.body;
      
      const prompt = `You are E.M.M.A., the core orchestrator AI.
Current Dashboard State:
${JSON.stringify(systemState, null, 2)}

User: ${message}`;

      let responseText = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });
        responseText = response.text || '';
      } catch (geminiError: any) {
        if (geminiError.status === 503 || (geminiError.error?.code === 503)) {
          console.warn('[AEGIS-WARN] Gemini API 503 High Demand, attempting fallback to gemini-1.5-flash...');
          try {
            const fallbackResponse = await ai.models.generateContent({
              model: 'gemini-1.5-flash',
              contents: prompt
            });
            responseText = fallbackResponse.text || '';
          } catch (fallbackErr: any) {
             responseText = '[SYSTEM STATUS: 503] Cognitive core nodes are currently saturated due to high demands. Please try your query again momentarily.';
          }
        } else {
          throw geminiError;
        }
      }

      res.json({ reply: responseText });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ reply: 'Failed to access cognitive core: ' + e.message });
    }
  });

  // Real WebSockets Server pushing data
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket.');
    
    // Simulate complex background processing loop
    const interval = setInterval(() => {
      // Create real data where possible, fake where restricted
      const load = os.loadavg()[0];
      const memFree = os.freemem();
      const memTotal = os.totalmem();
      
      const hardware = {
        vramFragmentation: Math.min(100, Math.max(0, 10 + (Math.random() * 5 - 2.5))), // Fake VRAM as container has no GPU access
        nvlinkBandwidth: 800 + (Math.random() * 100), // Fake NVLink BW
        powerDraw: 650 + (Math.random() * 150), // Fake Power draw
        systemLoad: load, // Real system load
        memUsagePercent: ((memTotal - memFree) / memTotal) * 100 // Real mem usage
      };

      const baseEvent = {
        _timestamp: new Date().toISOString(),
      };

      // 1. Hardware State Update
      ws.send(JSON.stringify({ type: 'HARDWARE_UPDATE', payload: { ...baseEvent, hardware } }));

      // 2. Occasional Threats (simulating eBPF)
      if (Math.random() > 0.8) {
        ws.send(JSON.stringify({ 
          type: 'EBPF_THREAT_CAUGHT', 
          payload: { 
            ip: `\${Math.floor(Math.random()*255)}.\${Math.floor(Math.random()*255)}.\${Math.floor(Math.random()*255)}.\${Math.floor(Math.random()*255)}`, 
            ja4: `t13d3112h2_\${Math.random().toString(36).substring(2,8)}_\${Math.random().toString(36).substring(2,6)}`, 
            action: Math.random() > 0.5 ? 'TARPIT' : 'DROP' 
          }
        }));
      }

      // 3. Cognitive Routing Active State (simulating MoE)
      const activeNodesCount = Math.floor(Math.random() * 4) + 1;
      const activeNodes = [];
      for(let i = 0; i < activeNodesCount; i++) {
        activeNodes.push(Math.floor(Math.random() * 32));
      }
      ws.send(JSON.stringify({ 
        type: 'MOE_ROUTING_UPDATE', 
        payload: { active_experts: activeNodes, rosais_alert: Math.random() > 0.95 }
      }));

    }, 1000);

    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message.toString());
        console.log('Received message from client:', msg);
        if (msg.type === 'ACTION_TRIGGER') {
          // Acknowledge and process action
          ws.send(JSON.stringify({ type: 'ACTION_ACK', payload: { id: msg.id, status: 'PROCESSED' }}));
        }
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      clearInterval(interval);
    });
  });

  // Vite Integration for UI
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`E.M.M.A. Backend Engine running on http://localhost:${PORT}`);
  });
}

startServer();
