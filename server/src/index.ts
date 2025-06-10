import Fastify from 'fastify';
import ws from '@fastify/websocket';
import cors from '@fastify/cors';
import fs from 'fs/promises';
import ROSLIB from 'roslib';
import path from 'path';
import { mkdirSync } from 'fs';
import { exec } from 'child_process';
import util from 'util';

import { setupMonitoring, MonitoringCache } from './monitoring.js';
import { setupTracks, TrackCache } from './map.js';

const execPromise = util.promisify(exec);

async function waitForRosbridge(port = 9090, retries = 300, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await execPromise(`nc -z localhost ${port}`);
      console.log(`rosbridge available on port ${port}`);
      return;
    } catch {
      console.warn(`rosbridge not ready, retrying...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  console.error('rosbridge not found after multiple retries');
  process.exit(1);
}

await waitForRosbridge(9090);

const DATA_DIR = './data';
const CONFIG_DIR = './config';
const LAYOUTS_DIR = path.join(CONFIG_DIR, 'layouts');
const LAST_FILE = path.join(DATA_DIR, 'last.json');
const MON_DIR = path.join(DATA_DIR, 'monitoring');
const MON_MAX_MBYTES = 5;
const MAP_TRACKS_DIR = path.join(DATA_DIR, 'tracks');
const MAP_MAX_MBYTES = 10;
const FLUSH_INTERVAL = 5000;
const SESSION_ID = new Date().toISOString().replace(/[:T]/g, '_').slice(0, 13);

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(LAYOUTS_DIR, { recursive: true });
mkdirSync(MON_DIR, { recursive: true });
mkdirSync(MAP_TRACKS_DIR, { recursive: true });

let topics: Record<string, string> = {};
try {
  topics = JSON.parse(await fs.readFile('./config/topics.json', 'utf8'));
} catch {
  console.warn('No topics.json; subscribe list empty');
}

let settings: any = { stale_ttl_ms: 10000 };
try {
  settings = JSON.parse(await fs.readFile('./config/settings.json', 'utf8'));
} catch {
  console.warn('settings.json missing, using defaults');
}

let tracksCfg: Record<string, any> = {};
try {
  tracksCfg = JSON.parse(await fs.readFile('./config/tracks.json', 'utf8'));
} catch {
  console.warn('tracks.json missing - no tracks plotted');
}

const ros = new ROSLIB.Ros({ url: process.env.ROSBRIDGE_URL || 'ws://rosbridge:9090' });
ros.on('error', console.error);

const last: Record<string, { data: any; stamp: number }> = {};
try {
  Object.assign(last, JSON.parse(await fs.readFile(LAST_FILE, 'utf8')));
} catch {
  /* first run */
}

const app = Fastify();
await app.register(cors, { origin: '*' });
await app.register(ws);

function broadcast(obj: any) {
  const s = JSON.stringify(obj);
  (app.websocketServer?.clients || []).forEach((c) => {
    if (c.readyState === c.OPEN) c.send(s);
  });
}

const trackCache: TrackCache = setupTracks(ros, tracksCfg, MAP_TRACKS_DIR, MAP_MAX_MBYTES, SESSION_ID, broadcast);
const lastMonitoring: MonitoringCache = setupMonitoring(ros, MON_DIR, MON_MAX_MBYTES, broadcast);

/* ---------- subscribers ---------- */
const subs: Record<string, { rosTopic: ROSLIB.Topic; count: number }> = {};
let dirty = false;

function ensureSub(topic: string, type: string) {
  if (subs[topic]) {
    subs[topic].count++;
    return;
  }
  const rosTopic = new ROSLIB.Topic({ ros, name: topic, messageType: type });
  rosTopic.subscribe((msg: any) => {
    last[topic] = { data: msg.data, stamp: Date.now() };
    broadcast({ kind: 'value', topic, data: msg.data });
    dirty = true;
  });
  subs[topic] = { rosTopic, count: 1 };
}

function dropSub(topic: string) {
  const s = subs[topic];
  if (!s) return;
  if (--s.count === 0) {
    s.rosTopic.unsubscribe();
    delete subs[topic];
  }
}

function subLatest(topic: string, type: string) {
  new ROSLIB.Topic({ ros, name: topic, messageType: type }).subscribe((msg: any) => {
    last[topic] = { data: msg.data, stamp: Date.now() };
    broadcast({ kind: 'value', topic, data: msg.data });
    dirty = true;
  });
}
Object.entries(topics).forEach(([t, ty]) => subLatest(t, ty));

setInterval(async () => {
  if (!dirty) return;
  dirty = false;
  await fs.writeFile(LAST_FILE, JSON.stringify(last));
}, FLUSH_INTERVAL);

/* ------------------------------ API endpoints ----------------------------- */
app.get('/api/layouts', async (req, reply) => {
  try {
    const files = await fs.readdir(LAYOUTS_DIR);
    const names = files.filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
    reply.send(names);
  } catch (err) {
    console.error('Error reading layouts directory', err);
    reply.send([]);
  }
});

app.get('/api/layouts/:name', async (req, reply) => {
  try {
    const file = await fs.readFile(path.join(LAYOUTS_DIR, (req.params as any).name + '.json'), 'utf8');
    reply.send(JSON.parse(file));
  } catch (err) {
    console.error('Error reading layout file:', err);
    reply.code(404).send({ error: 'Layout not found' });
  }
});

app.post('/api/layouts/:name', async (req, reply) => {
  await fs.writeFile(path.join(LAYOUTS_DIR, (req.params as any).name + '.json'), JSON.stringify(req.body, null, 2));
  reply.send({ ok: true });
});

app.delete('/api/layouts/:name', async (req, reply) => {
  const file = path.join(LAYOUTS_DIR, (req.params as any).name + '.json');
  try {
    await fs.unlink(file);
    reply.send({ ok: true });
  } catch (err: any) {
    reply.status(500).send({ ok: false, error: err.message });
  }
});

app.get('/ws', { websocket: true }, (client) => {
  client.socket.send(
    JSON.stringify({ kind: 'snapshot', values: last, monitoring: lastMonitoring, tracks: trackCache, settings })
  );

  client.socket.on('message', () => {});

  const pingInterval = setInterval(() => {
    if (client.socket.readyState === client.socket.OPEN) {
      client.socket.send(JSON.stringify({ kind: 'ping' }));
    }
  }, 30000);

  client.socket.on('close', () => {
    console.log('WebSocket connection closed');
    clearInterval(pingInterval);
  });
});

app.post('/api/topics', async (req, reply) => {
  const desired = (req.body as any).topics;
  const want = new Set(Object.keys(desired));
  const have = new Set(Object.keys(subs));
  for (const t of want) if (!have.has(t)) ensureSub(t, desired[t]);
  for (const t of have) if (!want.has(t)) dropSub(t);
  await fs.writeFile('./config/topics.json', JSON.stringify(desired, null, 2));
  reply.send({ ok: true, current: Object.keys(subs) });
});

app.listen({ port: 8080, host: '0.0.0.0' }, () => console.log('backend on :8080'));

