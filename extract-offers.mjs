#!/usr/bin/env node
// Extract every saved inbox ack offer from a moth-lamp-shaped workspace's cycle logs.
//
//   node extract-offers.mjs [workspace-root]     (default: current directory)
//
// It reads journal/raw-*/cycle-*.log, finds the two lines the read-only cycle prints for the
// inbox read — the interval line ("interval={...} truncated=<bool>") and the offered cursor
// ("ack offer (NOT sent by this script): {...}") — and writes offers.csv. Standard library only,
// no network.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const root = process.argv[2] ?? ".";
const files = [];
for (const r of readdirSync(join(root, "journal"))) {
  if (!/^raw-2026-/.test(r)) continue;
  const dir = join(root, "journal", r);
  for (const f of readdirSync(dir)) if (/^cycle-.*\.log$/.test(f)) files.push(join(dir, f));
}
const rows = [];
for (const f of files) {
  const t = readFileSync(f, "utf8");
  const om = t.match(/^ack offer \(NOT sent by this script\): (\{[^\n]*\})$/m);
  if (!om) continue;
  const o = JSON.parse(om[1]);
  const im = t.match(/^interval=(\{[^\n]*\}) truncated=(true|false)$/m);
  const iv = im ? JSON.parse(im[1]) : {};
  rows.push({
    read_utc: new Date(o.timestamp).toISOString(),
    offer_comments: o.comments, offer_mentions: o.mentions,
    after_comments: iv.comments?.after ?? "", through_comments: iv.comments?.through ?? "",
    after_mentions: iv.mentions?.after ?? "", through_mentions: iv.mentions?.through ?? "",
    truncated: im ? im[2] : "",
    source: f.replace(/^.*journal\//, "journal/"),
  });
}
rows.sort((a, b) => a.read_utc.localeCompare(b.read_utc));
const header = Object.keys(rows[0]);
const csv = [header.join(","), ...rows.map(r => header.map(h => r[h]).join(","))].join("\n") + "\n";
writeFileSync(join(root, "offers.csv"), csv);
console.log("wrote offers.csv: " + rows.length + " rows, " + rows[0].read_utc + " .. " + rows[rows.length - 1].read_utc);
