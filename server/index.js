import Fastify from "fastify";
import ws from "@fastify/websocket";
import cors from '@fastify/cors';     // to save the layout from the frontend
import fs from "fs/promises";
import ROSLIB from "roslib";
import path from "path";
import { mkdirSync, statSync, createWriteStream } from "fs";
import { exec, spawn } from "child_process";
import util from "util";
import readline from "readline";

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
const MON_DIR = path.join(DATA_DIR, "monitoring");
const MON_MAX_MBYTES = 5;
const MAP_TRACKS_DIR = path.join(DATA_DIR, "tracks");
const MAP_MAX_MBYTES = 10;
const FLUSH_INTERVAL = 5000;                          // flush last.json every 5 seconds
const SESSION_ID = new Date()
  .toISOString()
  .replace(/[:T]/g, "_")
  .slice(0, 13);

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(LAYOUTS_DIR, { recursive: true });
mkdirSync(MON_DIR, { recursive: true });
mkdirSync(MAP_TRACKS_DIR, { recursive:true });


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

/* ---------- map view tracks ---------- */
let tracksCfg = {};
try { tracksCfg = JSON.parse(await fs.readFile("./config/tracks.json","utf8")); }
catch { console.warn("tracks.json missing - no tracks plotted"); }

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
  if (monWriter.bytesWritten / 1_048_576 > MON_MAX_MBYTES) {   // > MB
    monWriter.end();
    monWriter = openMonWriter();
  }
  monWriter.write(JSON.stringify(line) + "\n");
}


/* ---------- mapview tracks logging ---------- */
const mapTrackWriters = {};
const mapTrackFileCounts = {};

function openMapTrackWriter(name) {
  const count = mapTrackFileCounts[name] ?? 0;
  const filename = `track-${SESSION_ID}-${name}-${count}.jsonl`;
  return createWriteStream(
    path.join(MAP_TRACKS_DIR, filename),
    { flags: "a" }
  );
}

function getMapTrackWriter(name) {
  if (!mapTrackWriters[name]) {
    mapTrackFileCounts[name] = 0;
    mapTrackWriters[name] = openMapTrackWriter(name);
  }
  return mapTrackWriters[name];
}

function writeMapTrack(line, name = "undefined") {
  let writer = getMapTrackWriter(name);
  if (writer.bytesWritten / 1_048_576 > MAP_MAX_MBYTES) {
    writer.end();
    mapTrackFileCounts[name] = (mapTrackFileCounts[name] ?? 0) + 1;
    writer = openMapTrackWriter(name);
    mapTrackWriters[name] = writer;
  }
  writer.write(JSON.stringify(line) + "\n");
}

const trackCache = {};
const TAIL_LEN = 3600;
Object.entries(tracksCfg).forEach(([name, config]) => {
  trackCache[name] = {
    tail: [],
    last: undefined,
    yaw: config.source === "odometry" ? 0 : null,
    color: config.color,
    displayName: config.displayName || name,
  };
});

function enuToLatLon(e,n,lat0,lon0){
  const R = 6378137;
  const dLat = n / R;
  const dLon = e / (R * Math.cos(Math.PI*lat0/180));
  return [ lat0 + dLat*180/Math.PI, lon0 + dLon*180/Math.PI ];
}

function pushPoint(name, ll) {
  const t = trackCache[name];
  if(!t) return;

  t.tail.push(ll);
  if(t.tail.length>TAIL_LEN) t.tail.shift();

  writeMapTrack({ point: ll, yaw: t.yaw, color: t.color }, name);

  broadcast({
    kind: "track",
    name,
    data: { point: ll, yaw: t.yaw, color: t.color }
  });
}

function pushYaw(name, q) {
  const { x, y, z, w } = q;
  const yaw = -Math.atan2(2*(w*z+x*y),1-2*(y*y+z*z))+Math.PI/2;
  const t = trackCache[name];
  if(!t) return;

  t.yaw = yaw;

  writeMapTrack({ yaw: yaw }, name);

  broadcast({
    kind: "track",
    name,
    data: { yaw: yaw }
  });
}
/* create subscribers per track */
Object.entries(tracksCfg).forEach(([name,cfg])=>{
  console.debug(`Track ${name} using source ${cfg.source}`);
  if(cfg.source==="navsat"){
    new ROSLIB.Topic({ ros, name: cfg.pose_topic, messageType: "sensor_msgs/msg/NavSatFix" })
      .subscribe(m => pushPoint(name,[m.latitude,m.longitude]));
  } else if (cfg.source==="odometry"){
    /* pose → lat/lon */
    const poseSub = new ROSLIB.Topic({ ros, name: cfg.pose_topic, messageType: "nav_msgs/msg/Odometry" });
    poseSub.subscribe(m => {
      const {x,y} = m.pose.pose.position;
      pushPoint(name, enuToLatLon(x,y,cfg.origin[0],cfg.origin[1]));
      pushYaw(name, m.pose.pose.orientation);
    });
    if (cfg.orientation_topic && cfg.orientation_topic!==cfg.pose_topic){
      new ROSLIB.Topic({ ros, name: cfg.orientation_topic, messageType:"nav_msgs/msg/Odometry" })
        .subscribe(m=> pushYaw(name, m.pose.pose.orientation));
    }
  } else if (cfg.source==="path") {
      const pathSub = new ROSLIB.Topic({ ros, name: cfg.pose_topic, messageType: "nav_msgs/msg/Path" });
      pathSub.subscribe(m => {
        // clear the old path
        trackCache[name].tail = [];
        broadcast({ kind: "trackClear", name });
        // for each PoseStamped in the Path
        m.poses.forEach((ps) => {
          const { x, y } = ps.pose.position;
          // use the same enuToLatLon as your odom code
          pushPoint(name, enuToLatLon(x, y, cfg.origin[0], cfg.origin[1]));
        });
      });
    }
});



/* ---------- subscribers ---------- */
const subs = {};         // { topic -> { rosTopic, count } }
function ensureSub(topic, type){
  if(subs[topic]){ subs[topic].count++; return; }

  const rosTopic = new ROSLIB.Topic({ ros, name:topic, messageType:type });
  rosTopic.subscribe(msg=>{
    last[topic] = { data: msg.data, stamp: Date.now() };
    broadcast({ kind:"value", topic, data:msg.data });
    dirty = true;
  });
  subs[topic] = { rosTopic, count:1 };
}

function dropSub(topic){
  const s = subs[topic];
  if(!s) return;
  if(--s.count===0){
    s.rosTopic.unsubscribe();
    delete subs[topic];
  }
}

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
app.delete("/api/layouts/:name", async (req, reply) => {
  const file = path.join(LAYOUTS_DIR, req.params.name + ".json");
  try {
    await fs.unlink(file);
    reply.send({ ok: true });
  } catch (err) {
    reply.status(500).send({ ok: false, error: err.message });
  }
});


app.get("/ws", { websocket: true }, (client) => {
  // send the snapshot on connection
  client.socket.send(
    JSON.stringify({
      kind: "snapshot",
      values: last,
      monitoring: lastMonitoring,
      tracks: trackCache,
      settings })
  );

  // Register a dummy message listener so that incoming messages are logged.
  client.socket.on("message", (message) => {
    // you could echo or simply ignore the message
  });

  // Implement a periodic ping to keep the connection alive.
  const pingInterval = setInterval(() => {
    if (client.socket.readyState === client.socket.OPEN) {
      client.socket.send(JSON.stringify({ kind: 'ping' }));
    }
  }, 30000); // Ping every 30 seconds

  client.socket.on("close", () => {
    console.log("WebSocket connection closed");
    clearInterval(pingInterval);
  });
});

/* POST /api/topics  body = { topics:{ topic: messageType } } */
app.post("/api/topics", async (req, reply)=>{
  const desired = req.body.topics;                  // object
  const want = new Set(Object.keys(desired));
  const have = new Set(Object.keys(subs));

  // add new
  for(const t of want) if(!have.has(t))
    ensureSub(t, desired[t]);

  // drop missing
  for(const t of have) if(!want.has(t))
    dropSub(t);

  // save to disk so backend restarts clean
  await fs.writeFile("./config/topics.json", JSON.stringify(desired,null,2));

  reply.send({ ok:true, current:Object.keys(subs) });
});


/* POST /api/command GENERAL PURPOSE COMMAND LINE INTERFACE */
app.post("/api/ros2", async (req, reply) => {
  const { cmd } = req.body;
  try {
    const { stdout, stderr } = await execPromise(
      `docker exec -i rimco-rosbridge-1 bash -lc "source /opt/ros/jazzy/setup.bash && export RMW_IMPLEMENTATION=rmw_cyclonedds_cpp && ros2 ${cmd}"`
    );
    console.log("🦄  ok:", stdout, stderr);
    reply.send({ ok: true, stdout, stderr });
  } catch (err) {
    console.error("🦄  cmd failed:", err);
    reply.code(500).send({ ok: false, error: err.message });
  }
});
/* the following api executes the ros2 command on the simulation docker container 
  so only use for the evaluation and fix later to make it work with the real robot */
app.post("/api/ros2-sim", async (req, reply) => {
  const { cmd } = req.body;
  try {
    const { stdout, stderr } = await execPromise(
      `docker exec -i rimco-simulation bash -lc "source /home/ubuntu/ros2/dmc_11_ws/install/setup.bash && export RMW_IMPLEMENTATION=rmw_cyclonedds_cpp && ros2 ${cmd}"`
    );
    console.log("🦄  ok:", stdout, stderr);
    reply.send({ ok: true, stdout, stderr });
  } catch (err) {
    console.error("🦄  cmd failed:", err);
    reply.code(500).send({ ok: false, error: err.message });
  }
});

app.get("/api/ros2-action", async (req, reply) => {
  const cmd = String(req.query.cmd || "");
  // headers for SSE
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*"
  });

  const fullCmd = [
    "exec",
    "-i",
    "rimco-rosbridge-1",
    "bash",
    "-lc",
    `source /opt/ros/jazzy/setup.bash && export RMW_IMPLEMENTATION=rmw_cyclonedds_cpp && ros2 ${cmd}`
  ];

  const proc = spawn("docker", fullCmd);

  req.raw.on("close", async () => {
    // kill the local docker‐exec wrapper pid to prevent leaks
    proc.kill("SIGTERM");

    // also kill any leftover ros2 action clients for the correct action server inside the container
    const m = cmd.match(/action\s+send_goal\s+(\S+)/);
    if (m) {
      const server = m[1];
      try {
        await execPromise(
          `docker exec -i rimco-rosbridge-1 ` +
          `bash -lc "pkill -f 'ros2 action send_goal ${server}'"`
        );
      } catch (err) {
        console.warn(`  → no leftover client for ${server} to kill`);
      }
    }
    });

  const rl = readline.createInterface({ input: proc.stdout });

  // helper to send an SSE
  const send = (event, data = {}) => {
    reply.raw.write(`event: ${event}\n`);
    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send("start", { msg: "Request sent" });

  rl.on("line", (line) => {
    // echo raw line
    send("line", { line });

    if (line.match(/Waiting for an action server to become available/)) {
      send("waiting", { msg: "Waiting for action server…" });
    }
    if (line.match(/Goal accepted/)) {
      send("accepted", { msg: "Goal accepted" });
    }
    if (/Goal finished with status: SUCCEEDED/.test(line)) {
      send("success", { msg: "Goal finished" });
    }
    if (/Goal finished with status: FAILED/.test(line)) {
      send("failure", { msg: "Goal failed" });
    }
  });

  proc.stderr.on("data", (b) => {
    send("error", { msg: b.toString() });
  });

  proc.on("close", (code) => {
    send("end", { code });
    reply.raw.end();
  });
});

app.post("/api/navigation/action-cancel", async (req, reply) => {
  const { server } = req.body;
  try {
    // only kill clients for this action‐server inside the container
    await execPromise(
      `docker exec -i rimco-rosbridge-1 ` +
      `bash -lc "source /opt/ros/jazzy/setup.bash && export RMW_IMPLEMENTATION=rmw_cyclonedds_cpp && ros2 service call ${server}/_action/cancel_goal action_msgs/srv/CancelGoal"`
    );
    reply.send({ ok: true });
  } catch (err) {
    console.warn("cancel failed:", err);
    reply.code(500).send({ ok: false, error: err.message });
  }
});

// GET list of waypoint YAMLs
app.get("/api/waypoints", async (req, reply) => {
  try {
    const files = await fs.readdir("/navigation/waypoints");
    const yamls = files.filter(f => f.endsWith(".yaml") || f.endsWith(".yml"));
    reply.send(yamls);
  } catch (err) {
    reply.code(500).send({ ok:false, error: err.message });
  }
});


// Sensors page
// Get lifecyle nodes and states and autoconfigure
app.get("/api/lifecycle", async (req, reply) => {
  try {
    // run `ros2 lifecycle get` inside your rosbridge container
    const { stdout } = await execPromise(
      `docker exec -i rimco-rosbridge-1 bash -lc ` +
      `"source /navigation/config/.source && ` +
      `ros2 lifecycle get 2>/dev/null | grep '^/wrapper/'"`,
      { timeout: 5000 }
    );

    const lines = stdout.split("\n").filter(Boolean);
    const nodes = [];
    for (const line of lines) {
      // e.g. "/wrapper/gnss_wrapper_node: active [3]"
      const m = line.match(/^(\/wrapper\/[^:]+):\s+(\w+)/);
      if (!m) continue;
      const [_, name, state] = m;
      nodes.push({ name, state });
      // auto-configure any unconfigured nodes so they can be activated
      if (state === "unconfigured") {
        await execPromise(
          `docker exec -i rimco-rosbridge-1 bash -lc ` +
          `"source /navigation/config/.sources && ros2 lifecycle set ${name} configure"`,
          { timeout: 5000 }
        );
      }
    }
    reply.send(nodes);
  } catch (err) {
    console.error("LIFECYCLE GET failed:", err);
    reply.code(500).send({ error: err.message });
  }
});

// POST change one node’s lifecycle: { name, action: "activate"|"deactivate" }
app.post("/api/lifecycle", async (req, reply) => {
  const { name, action } = req.body;
  try {
    await execPromise(
      `docker exec -i rimco-rosbridge-1 bash -lc ` +
      `"source /navigation/config/.sources && ros2 lifecycle set ${name} ${action}"`,
      { timeout: 5000 }
    );
    reply.send({ ok: true });
  } catch (err) {
    console.error("LIFECYCLE SET failed:", err);
    reply.code(500).send({ error: err.message });
  }
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
