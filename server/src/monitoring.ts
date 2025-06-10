import { createWriteStream, mkdirSync } from 'fs';
import path from 'path';
import ROSLIB from 'roslib';

export interface MonitoringEntry {
  stamp: number;
  name: string;
  level: number;
  [key: string]: any;
}

export interface MonitoringCache {
  [name: string]: { level: number; stamp: number };
}

export function setupMonitoring(
  ros: ROSLIB.Ros,
  dir: string,
  maxMB: number,
  broadcast: (obj: any) => void
): MonitoringCache {
  mkdirSync(dir, { recursive: true });
  let writer = openWriter();
  const cache: MonitoringCache = {};

  function openWriter() {
    const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 13);
    return createWriteStream(path.join(dir, `monitoring-${stamp}.jsonl`), {
      flags: 'a',
    });
  }

  function writeMon(line: any) {
    if (writer.bytesWritten / 1_048_576 > maxMB) {
      writer.end();
      writer = openWriter();
    }
    writer.write(JSON.stringify(line) + '\n');
  }

  new ROSLIB.Topic({
    ros,
    name: '/monitoring',
    messageType: 'diagnostic_msgs/msg/DiagnosticStatus',
  }).subscribe((msg: any) => {
    cache[msg.name] = { level: msg.level, stamp: Date.now() };
    broadcast({
      kind: 'monitoring',
      name: msg.name,
      level: msg.level,
      stamp: cache[msg.name].stamp,
    });
    writeMon({ stamp: Date.now(), ...msg });
  });

  return cache;
}

