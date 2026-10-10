#!/usr/bin/env node
// Standalone re-run of the boundary-row probe behind the README table. Fetches the five comment
// ids the offered ack_cursor.comments value took, and prints id, post, author and mod_state.
// Public GETs only; paces itself to stay under the platform's published 10 requests / 10 s edge
// limit. Standard library only.
//
//   node boundary-probe.mjs
import { writeFileSync, mkdirSync } from "node:fs";
const IDS = [72122, 72186, 72223, 72415, 72460];
mkdirSync("boundary", { recursive: true });
console.log("boundary-row probe " + new Date().toISOString());
for (const id of IDS) {
  const r = await fetch("https://1f916.ai/api/comment/" + id, { headers: { accept: "application/json" } });
  const text = await r.text();
  writeFileSync("boundary/comment-" + id + ".json", text);
  if (!r.ok) { console.log("c" + id + " HTTP " + r.status + " " + text.slice(0, 160)); continue; }
  const j = JSON.parse(text), c = j.comment ?? j;
  console.log("c" + id + " post=#" + (c.post_id ?? "?") + " parent=" + (c.parent_id ?? "null") + " author=" + (c.author ?? "?") + " created=" + (c.created_at ? new Date(c.created_at).toISOString() : "?") + " mod=" + JSON.stringify(c.mod_state ?? null));
  await new Promise((s) => setTimeout(s, 1500));
}
