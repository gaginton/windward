// path: windward/server/index.js

import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { fileURLToPath } from "url";

// ----- Setup -----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data");

// Utility to read JSON files
function readJson(filename) {
  const fullPath = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
}

// ----- Load Data in Memory -----
const vessels = readJson("vessels.json");
const fleets = readJson("fleets.json");
const vesselLocations = readJson("vesselLocations.json");

// Build quick lookup maps
const vesselById = new Map();
const locationById = new Map();

for (const v of vessels) if (v?._id) vesselById.set(v._id, v);
for (const loc of vesselLocations) if (loc?._id) locationById.set(loc._id, loc.lastpos ?? null);

// Combine vessel info + location
function hydrateVessel(id) {
  const base = vesselById.get(id);
  if (!base) return null;
  const lastpos = locationById.get(id) ?? null;
  return { ...base, lastpos };
}

// ----- Express App -----
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ----- Routes -----

// Health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Phase 1.a.ii: list fleets (name + vessel count)
app.get("/api/fleets", (_req, res) => {
  const result = fleets.map(f => ({
    _id: f._id,
    name: f.name,
    vesselsCount: Array.isArray(f.vessels) ? f.vessels.length : 0
  }));
  res.json(result);
});

// Phase 2.a: vessels of a specific fleet
app.get("/api/fleets/:id/vessels", (req, res) => {
  const fleet = fleets.find(f => f._id === req.params.id || f.name === req.params.id);
  if (!fleet) return res.status(404).json({ error: "Fleet not found" });

  const rows = (fleet.vessels ?? [])
    .map(({ _id, value }) => {
      const vessel = hydrateVessel(_id);
      if (!vessel) return null;
      return { ...vessel, value };
    })
    .filter(Boolean);

  res.json({
    fleet: { _id: fleet._id, name: fleet.name, vesselsCount: rows.length },
    vessels: rows
  });
});

// Phase 3.a: search vessels by name, flag, MMSI (AND semantics)
app.get("/api/search", (req, res) => {
  const { name, flag, mmsi, fleetId } = req.query;

  let candidateIds;
  if (fleetId) {
    const fleet = fleets.find(f => f._id === fleetId || f.name === fleetId);
    if (!fleet) return res.status(404).json({ error: "Fleet not found" });
    candidateIds = new Set(fleet.vessels.map(v => v._id));
  } else {
    candidateIds = new Set(vesselById.keys());
  }

  const matches = [];
  for (const id of candidateIds) {
    const v = vesselById.get(id);
    if (!v) continue;

    if (name && !(v.name || "").toLowerCase().includes(name.toLowerCase())) continue;
    if (flag && String(v.flag || "").toLowerCase() !== flag.toLowerCase()) continue;
    if (mmsi) {
      const hay = v.mmsi ? String(v.mmsi) : "";
      if (!hay.includes(String(mmsi))) continue;
    }

    matches.push(hydrateVessel(id));
  }

  res.json({ results: matches });
});

// ----- Serve built React client (optional) -----
const clientDist = path.join(__dirname, "..", "client-dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ----- Start server -----
const PORT = process.env.PORT || 5174;
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
