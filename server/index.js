import Fastify from "fastify";
import ws from "@fastify/websocket";
import cors from '@fastify/cors';     // to save the layout from the frontend
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
const CONFIG_DIR = "./config";
const LAYOUTS_DIR = path.join(CONFIG_DIR, "layouts"); // visualization layouts
const HISTORY_DIR = path.join(DATA_DIR, "history");   // history of specific topic values
const LAST_FILE  = path.join(DATA_DIR, "last.json");  // last value for each topic
const MON_DIR    = path.join(DATA_DIR, "monitoring"); // all monitoring data
const MAX_MBYTES = 5;                                 // rotate monitoring file at 5 MB
const FLUSH_INTERVAL = 5000;                          // flush last.json every 5 seconds

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(LAYOUTS_DIR, { recursive: true });
mkdirSync(MON_DIR, { recursive: true });


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
const last = {};                      // { topic: {data, stamp} }
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
const lastMonitoring = {};          // { name: {level, stamp} }
new ROSLIB.Topic({ ros, name: "/monitoring", messageType: "diagnostic_msgs/msg/DiagnosticStatus" })
  .subscribe((msg) => {
    lastMonitoring[msg.name] = { level: msg.level, stamp: Date.now() };
    broadcast({ kind: "monitoring", name: msg.name, level: msg.level, stamp: lastMonitoring[msg.name].stamp } );     
    writeMon({ stamp: Date.now(), ...msg });
  });

/* ---------- periodic flush of LAST_FILE ---------- */
let dirty = false;
setInterval(async () => {
  if (!dirty) return;
  dirty = false;
  await fs.writeFile(LAST_FILE, JSON.stringify(last));
}, FLUSH_INTERVAL);


/* --------------------------- fastify + websocket -------------------------- */
const app = Fastify()
await app.register(cors, { origin: '*', });    // this allows to save layouts to the backend from the frontend
await app.register(ws);                        // websocket is to make messages available to the frontend
/* ------------------------------ API endpoints ----------------------------- */
/* ----------------- GET all filenames in ./config/layouts/ ----------------- */
app.get("/api/layouts", async (req, reply) => {
  try {
    const files = await fs.readdir(LAYOUTS_DIR);
    const names = files
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.slice(0, -5));
    reply.send(names);
  } catch (err) {
    console.error("Error reading layouts directory", err);
    reply.send([]);
  }
});

/* ------ GET one specific layout from ./config/layouts/ using the name ----- */
app.get("/api/layouts/:name", async (req, reply) => {
  try {
    const file = await fs.readFile(
      path.join(LAYOUTS_DIR, req.params.name + ".json"),
      "utf8"
    );
    reply.send(JSON.parse(file));
  } catch (err) {
    console.error("Error reading layout file:", err);
    reply.code(404).send({ error: "Layout not found" });
  }
});

/* ------ POST one specific layout to ./config/layouts/ using the name ------ */
app.post("/api/layouts/:name", async (req, reply) => {
  await fs.writeFile(
    path.join(LAYOUTS_DIR, req.params.name + ".json"),
    JSON.stringify(req.body, null, 2),
  );
  reply.send({ ok: true });
});


app.get("/ws", { websocket: true }, (client) => {
  // send the snapshot on connection
  client.socket.send(
    JSON.stringify({ kind: "snapshot", values: last, monitoring: lastMonitoring, settings })
  );

  // Register a dummy message listener so that incoming messages are logged.
  client.socket.on("message", (message) => {
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
