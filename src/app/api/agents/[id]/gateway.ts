import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import WebSocket from 'ws';

const HOME = process.env.HOME || '/home/w0lf';
const OPENCLAW_JSON = path.join(HOME, '.openclaw', 'openclaw.json');
const DEFAULT_GATEWAY_PORT = 18789;
const PROTOCOL_VERSION = 3;

function loadGatewayConfig(): { port: number; token?: string } {
  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf-8'));
    const port = config.gateway?.port || DEFAULT_GATEWAY_PORT;
    const token = config.gateway?.auth?.token;
    return { port, token };
  } catch {
    return { port: DEFAULT_GATEWAY_PORT };
  }
}

/**
 * Send a single JSON-RPC request to the local OpenClaw gateway via WebSocket.
 * Handles the connect.challenge → connect → request → response flow.
 */
export async function gatewayRpc<T = Record<string, unknown>>(
  method: string,
  params?: unknown,
  timeoutMs = 15_000,
): Promise<T> {
  const { port, token } = loadGatewayConfig();
  const url = `ws://127.0.0.1:${port}`;

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`gateway RPC timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    const ws = new WebSocket(url, { maxPayload: 5 * 1024 * 1024 });
    let connected = false;
    const requestId = randomUUID();

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`gateway connection error: ${err.message}`));
    });

    ws.on('close', () => {
      clearTimeout(timer);
      if (!connected) {
        reject(new Error('gateway connection closed before response'));
      }
    });

    ws.on('message', (data) => {
      try {
        const frame = JSON.parse(data.toString());

        // Handle connect.challenge event
        if (frame.type === 'evt' && frame.event === 'connect.challenge') {
          const nonce = frame.payload?.nonce;
          if (!nonce) {
            clearTimeout(timer);
            ws.close();
            reject(new Error('gateway connect challenge missing nonce'));
            return;
          }

          const connectFrame = {
            type: 'req',
            id: randomUUID(),
            method: 'connect',
            params: {
              minProtocol: PROTOCOL_VERSION,
              maxProtocol: PROTOCOL_VERSION,
              client: {
                id: 'mission-control',
                displayName: 'Mission Control',
                version: '1.0.0',
                platform: 'linux',
                mode: 'backend',
              },
              auth: token ? { token } : undefined,
              role: 'operator',
              scopes: ['operator.admin'],
              caps: [],
            },
          };
          ws.send(JSON.stringify(connectFrame));
          return;
        }

        // Handle response frames
        if (frame.type === 'res') {
          // Connect response — now send the actual request
          if (frame.ok && !connected) {
            connected = true;
            const reqFrame = {
              type: 'req',
              id: requestId,
              method,
              params,
            };
            ws.send(JSON.stringify(reqFrame));
            return;
          }

          // Our method response
          if (frame.id === requestId) {
            clearTimeout(timer);
            ws.close();
            if (frame.ok) {
              resolve(frame.payload as T);
            } else {
              reject(new Error(frame.error?.message || 'gateway RPC error'));
            }
            return;
          }

          // Connect failed
          if (!frame.ok && !connected) {
            clearTimeout(timer);
            ws.close();
            reject(new Error(frame.error?.message || 'gateway connect failed'));
            return;
          }
        }
      } catch (err) {
        // parse error, ignore
      }
    });
  });
}

// Session key lookup: find the main session key for an agent from sessions.json
const AGENTS_DIR = path.join(HOME, '.openclaw', 'agents');
const AGENT_DIR_MAP: Record<string, string> = {
  'code-monkey': 'dev',
  'main': 'main',
  'answring': 'answring',
  'tldr': 'tldr',
  'roadie': 'roadie',
  'hustle': 'hustle',
  'forge': 'forge',
  'docs': 'docs',
  'ralph': 'ralph',
  'browser': 'browser',
  'answring-ops': 'answring-ops',
  'answring-marketing': 'answring-marketing',
  'answring-dev': 'answring-dev',
  'answring-security': 'answring-security',
  'answring-strategist': 'answring-strategist',
  'answring-sales': 'answring-sales',
  'answring-qa': 'answring-qa',
};

export function findActiveSessionKey(agentId: string): { sessionKey: string; sessionId: string } | null {
  const dirName = AGENT_DIR_MAP[agentId] || agentId;
  const sessionsJsonPath = path.join(AGENTS_DIR, dirName, 'sessions', 'sessions.json');
  const WORKING_THRESHOLD_MS = 5 * 60 * 1000;
  const now = Date.now();

  try {
    const raw = JSON.parse(fs.readFileSync(sessionsJsonPath, 'utf-8'));
    let latestKey = '';
    let latestMs = 0;
    let latestSessionId = '';

    for (const [key, val] of Object.entries(raw as Record<string, any>)) {
      if (key.includes(':watercooler')) continue;
      const updatedAt = (val as any)?.updatedAt || 0;
      if (updatedAt > latestMs) {
        latestMs = updatedAt;
        latestKey = key;
        latestSessionId = (val as any)?.sessionId || '';
      }
    }

    if (latestMs > 0 && (now - latestMs) < WORKING_THRESHOLD_MS && latestKey) {
      return { sessionKey: latestKey, sessionId: latestSessionId };
    }
    return null;
  } catch {
    return null;
  }
}
