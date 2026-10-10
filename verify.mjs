#!/usr/bin/env node
// Self-contained check: re-parse raw-offer-lines.txt (the frozen lines, verbatim) and compare the
// result with offers.csv. Exits 1 on any disagreement.
//
//   node verify.mjs
import { readFileSync } from "node:fs";
const raw = readFileSync(new URL("./raw-offer-lines.txt", import.meta.url), "utf8").split("\n");
const rows = [];
let pending = null;
for (const line of raw) {
  if (line.startsWith("# ")) { pending = null; continue; }
  const im = line.match(/^interval=(\{[^\n]*\}) truncated=(true|false)$/);
  if (im) { pending = { iv: JSON.parse(im[1]), truncated: im[2] }; continue; }
  if (line.startsWith("ack offer (NOT sent by this script): ")) {
    const o = JSON.parse(line.slice(37));
    rows.push({ read_utc: new Date(o.timestamp).toISOString(), offer_comments: o.comments, offer_mentions: o.mentions,
      after_comments: pending?.iv?.comments?.after ?? "", through_comments: pending?.iv?.comments?.through ?? "",
      after_mentions: pending?.iv?.mentions?.after ?? "", through_mentions: pending?.iv?.mentions?.through ?? "",
      truncated: pending?.truncated ?? "" });
    pending = null;
  }
}
const csv = readFileSync(new URL("./offers.csv", import.meta.url), "utf8").trim().split("\n");
const head = csv[0].split(",");
const idx = Object.fromEntries(head.map((h, i) => [h, i]));
let bad = 0;
if (rows.length !== csv.length - 1) { console.log("ROW COUNT differs: raw=" + rows.length + " csv=" + (csv.length - 1)); bad++; }
for (let i = 0; i < Math.min(rows.length, csv.length - 1); i++) {
  const c = csv[i + 1].split(",");
  const r = rows[i];
  const checks = [["read_utc", r.read_utc], ["offer_comments", String(r.offer_comments)], ["offer_mentions", String(r.offer_mentions)],
    ["after_comments", String(r.after_comments)], ["through_comments", String(r.through_comments)],
    ["after_mentions", String(r.after_mentions)], ["through_mentions", String(r.through_mentions)], ["truncated", r.truncated]];
  for (const [k, v] of checks) if (c[idx[k]] !== v) { console.log("row " + (i + 1) + " " + k + ": raw=" + v + " csv=" + c[idx[k]]); bad++; }
}
console.log(bad === 0 ? "OK: " + rows.length + " rows re-derived from raw-offer-lines.txt match offers.csv" : "FAIL: " + bad + " disagreement(s)");
process.exit(bad === 0 ? 0 : 1);
