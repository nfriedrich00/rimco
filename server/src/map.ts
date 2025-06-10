import { createWriteStream, mkdirSync } from 'fs';
import path from 'path';
import ROSLIB from 'roslib';

export interface TrackConfig {
  source: string;
  pose_topic: string;
  origin?: [number, number];
  orientation_topic?: string;
  color?: string;
  displayName?: string;
}

export interface TrackState {
  tail: [number, number][];
  last?: any;
  yaw: number | null;
  color?: string;
  displayName: string;
}

export type TrackCache = Record<string, TrackState>;

export function setupTracks(
  ros: ROSLIB.Ros,
  cfg: Record<string, TrackConfig>,
  dir: string,
  maxMB: number,
  sessionId: string,
  broadcast: (obj: any) => void
): TrackCache {
  mkdirSync(dir, { recursive: true });
  const cache: TrackCache = {};
  const writers: Record<string, import('fs').WriteStream> = {};
  const fileCounts: Record<string, number> = {};

  function openWriter(name: string) {
    const count = fileCounts[name] ?? 0;
    const filename = `track-${sessionId}-${name}-${count}.jsonl`;
    return createWriteStream(path.join(dir, filename), { flags: 'a' });
  }
  function getWriter(name: string) {
    if (!writers[name]) {
      fileCounts[name] = 0;
      writers[name] = openWriter(name);
    }
    return writers[name];
  }
  function writeTrack(line: any, name = 'undefined') {
    let w = getWriter(name);
    if (w.bytesWritten / 1_048_576 > maxMB) {
      w.end();
      fileCounts[name] = (fileCounts[name] ?? 0) + 1;
      w = openWriter(name);
      writers[name] = w;
    }
    w.write(JSON.stringify(line) + '\n');
  }

  const TAIL_LEN = 3600;
  Object.entries(cfg).forEach(([name, config]) => {
    cache[name] = {
      tail: [],
      last: undefined,
      yaw: config.source === 'odometry' ? 0 : null,
      color: config.color,
      displayName: config.displayName || name,
    };
  });

  function enuToLatLon(e: number, n: number, lat0: number, lon0: number) {
    const R = 6378137;
    const dLat = n / R;
    const dLon = e / (R * Math.cos((Math.PI * lat0) / 180));
    return [lat0 + (dLat * 180) / Math.PI, lon0 + (dLon * 180) / Math.PI];
  }

  function pushPoint(name: string, ll: [number, number]) {
    const t = cache[name];
    if (!t) return;
    t.tail.push(ll);
    if (t.tail.length > TAIL_LEN) t.tail.shift();
    writeTrack({ point: ll, yaw: t.yaw, color: t.color }, name);
    broadcast({ kind: 'track', name, data: { point: ll, yaw: t.yaw, color: t.color } });
  }

  function pushYaw(name: string, q: { x: number; y: number; z: number; w: number }) {
    const { x, y, z, w } = q;
    const yaw = -Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)) + Math.PI / 2;
    const t = cache[name];
    if (!t) return;
    t.yaw = yaw;
    writeTrack({ yaw }, name);
    broadcast({ kind: 'track', name, data: { yaw } });
  }

  Object.entries(cfg).forEach(([name, c]) => {
    if (c.source === 'navsat') {
      new ROSLIB.Topic({ ros, name: c.pose_topic, messageType: 'sensor_msgs/msg/NavSatFix' }).subscribe((m: any) =>
        pushPoint(name, [m.latitude, m.longitude])
      );
    } else if (c.source === 'odometry') {
      const poseSub = new ROSLIB.Topic({ ros, name: c.pose_topic, messageType: 'nav_msgs/msg/Odometry' });
      poseSub.subscribe((m: any) => {
        const { x, y } = m.pose.pose.position;
        if (c.origin) pushPoint(name, enuToLatLon(x, y, c.origin[0], c.origin[1]));
        pushYaw(name, m.pose.pose.orientation);
      });
      if (c.orientation_topic && c.orientation_topic !== c.pose_topic) {
        new ROSLIB.Topic({ ros, name: c.orientation_topic, messageType: 'nav_msgs/msg/Odometry' }).subscribe((m: any) =>
          pushYaw(name, m.pose.pose.orientation)
        );
      }
    }
  });

  return cache;
}

