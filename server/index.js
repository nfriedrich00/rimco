import Fastify from "fastify";
import ws from "@fastify/websocket";
import fs from "fs/promises";
import ROSLIB from "roslib";
import path from "path";
import { mkdirSync, statSync, createWriteStream } from "fs";
import { exec } from "child_process";
import util from "util";

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
  console.error("rosbridge not found after multiple retries");
  process.exit(1);
}

await waitForRosbridge(9090);

const DATA_DIR   = "./data";
const LAST_FILE  = path.join(DATA_DIR, "last.json");
const MON_DIR    = path.join(DATA_DIR, "monitoring");
const MAX_MBYTES = 5;                       // rotate monitoring file at 5 MB

mkdirSync(DATA_DIR,   { recursive: true });
mkdirSync(MON_DIR,    { recursive: true });

/* ---------- load topics list ---------- */
let topics = {};
try {
  topics = JSON.parse(await fs.readFile("./config/topics.json", "utf8"));
} catch {
  console.warn("No topics.json; subscribe list empty");
}

let settings = { stale_ttl_ms: 10000 };
try { settings = JSON.parse(await fs.readFile("./config/settings.json","utf8")); }
catch { console.warn("settings.json missing, using defaults"); }

/* ---------- rosbridge ---------- */
const ros = new ROSLIB.Ros({ url: process.env.ROSBRIDGE_URL || "ws://rosbridge:9090" });
ros.on("error", console.error);

/* ---------- caches ---------- */
const last = {};                      // { topic: data }
try { Object.assign(last, JSON.parse(await fs.readFile(LAST_FILE, "utf8"))); }
catch { /* first run */ }

let monWriter = openMonWriter();

/* ---------- helper: rotate monitoring file ---------- */
function openMonWriter() {
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 13);
  return createWriteStream(path.join(MON_DIR, `monitoring-${stamp}.jsonl`), { flags: "a" });
}
function writeMon(line) {
  if (monWriter.bytesWritten / 1_048_576 > MAX_MBYTES) {   // > MB
    monWriter.end();
    monWriter = openMonWriter();
  }
  monWriter.write(JSON.stringify(line) + "\n");
}

/* ---------- subscribers ---------- */
function subLatest(topic, type) {
  new ROSLIB.Topic({ ros, name: topic, messageType: type }).subscribe((msg) => {
    last[topic] = { data: msg.data, stamp: Date.now() };
    broadcast({ kind: "value", topic, data: msg.data });
    dirty = true;
  });
}
Object.entries(topics).forEach(([t, ty]) => subLatest(t, ty));

/* /monitoring full log */
new ROSLIB.Topic({ ros, name: "/monitoring", messageType: "diagnostic_msgs/msg/DiagnosticStatus" })
  .subscribe((msg) => {
    writeMon({ stamp: Date.now(), ...msg });
    broadcast({ kind: "monitoring", msg });
  });

/* ---------- periodic flush of last.json ---------- */
let dirty = false;
setInterval(async () => {
  if (!dirty) return;
  dirty = false;
  await fs.writeFile(LAST_FILE, JSON.stringify(last));
}, 5000);

/* ---------- fastify + websocket ---------- */
const app = Fastify()
await app.register(ws);
app.get("/ws", { websocket: true }, (client) => {
  // send the snapshot on connection
  client.socket.send(
    JSON.stringify({ kind: "snapshot", values: last, settings })
  );

  // Register a dummy message listener so that incoming messages are logged.
  client.socket.on("message", (message) => {
    console.debug("Received message from client:", message);
    // you could echo or simply ignore the message
  });

  // Implement a periodic ping to keep the connection alive.
  const pingInterval = setInterval(() => {
    if (client.socket.readyState === client.socket.OPEN) {
      // Sending a ping (you can choose the payload)
      client.socket.send(JSON.stringify({ kind: 'ping' }));
    }
  }, 30000); // Ping every 30 seconds

  client.socket.on("close", () => {
    console.log("WebSocket connection closed");
    clearInterval(pingInterval);
  });
});

function broadcast(obj) {
  const s = JSON.stringify(obj);
  (app.websocketServer?.clients || []).forEach((c) =>
    c.readyState === c.OPEN && c.send(s),
  );
}

app.listen({ port: 8080, host: "0.0.0.0" }, () =>
  console.log("backend on :8080"),
);
