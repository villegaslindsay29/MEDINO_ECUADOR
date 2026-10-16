import { Router } from "express";

const router = Router();
const geoJsonUrl = "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/ECU/ADM1/geoBoundaries-ECU-ADM1_simplified.geojson";
let cachedMap: unknown = null;

router.get("/ecuador", async (_req, res) => {
  if (cachedMap) {
    res.set("Cache-Control", "public, max-age=86400").json(cachedMap);
    return;
  }

  try {
    const response = await fetch(geoJsonUrl, {
      headers: { "User-Agent": "MedInfo-Ecuador/1.0" },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`GeoJSON respondió ${response.status}`);

    cachedMap = await response.json();
    res.set("Cache-Control", "public, max-age=86400").json(cachedMap);
  } catch (error) {
    console.error("Error cargando el mapa de Ecuador:", error instanceof Error ? error.message : error);
    res.status(502).json({ error: "No fue posible cargar los límites provinciales." });
  }
});

export default router;
