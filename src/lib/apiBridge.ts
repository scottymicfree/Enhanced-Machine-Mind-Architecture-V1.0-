import { invoke } from '@tauri-apps/api/core';

export async function sendMutation(intent: string, payload?: any): Promise<any> {
  const isTauri =
    typeof window !== 'undefined' &&
    (window as any).__TAURI_IPC__ !== undefined;

  if (isTauri) {
    try {
      return await invoke('send_mutation', { intent, ...payload });
    } catch (e) {
      console.error('Tauri invoke failed:', e);
      throw e;
    }
  } else {
    try {
      const response = await fetch('/api/mutations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ intent, ...payload }),
      });
      if (!response.ok) {
        throw new Error(`Browser fetch failed with status ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      console.error('Browser proxy failed:', e);
      throw e;
    }
  }
}
