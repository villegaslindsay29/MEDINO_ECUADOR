const mapElement = document.querySelector("#ecuador-map");
const panel = document.querySelector("#province-panel");
const filter = document.querySelector("#map-disease-filter");
const geoJsonUrl = "/api/map/ecuador";
let diseases = [];
let geoLayer;
let islandLayer;
let selectedProvince = "";

const normalize = (value = "") => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const provinceAliases = new Map(window.ECUADOR_PROVINCES.map((name) => [normalize(name), name]));

function officialProvince(feature) {
  const raw = feature.properties.shapeName || feature.properties.name || feature.properties.NAME_1 || "";
  return provinceAliases.get(normalize(raw)) || raw;
}

function relatedDiseases(province) {
  const selectedId = filter.value;
  return diseases.filter((disease) => disease.provincias.includes(province) && (!selectedId || disease.id === selectedId));
}

function mapIntensity(province) {
  if (filter.value) return relatedDiseases(province).length;
  return diseases.filter((disease) => disease.provincias.includes(province) && disease.zona !== "Todo el país").length;
}

function fillColor(count, active) {
  if (active) return "#5b3765";
  if (filter.value && count) return "#9e6899";
  if (count >= 3) return "#9e6899";
  if (count >= 2) return "#ba88ae";
  if (count >= 1) return "#d6a8c4";
  return "#f3ccde";
}

function styleFeature(feature) {
  const province = officialProvince(feature); const count = mapIntensity(province);
  return { color: "#fdf9fb", weight: 1.4, fillColor: fillColor(count, province === selectedProvince), fillOpacity: 0.95 };
}

function renderPanel(province) {
  selectedProvince = province; const related = relatedDiseases(province);
  panel.innerHTML = `<div class="province-panel-head"><span class="mono">${related.length.toString().padStart(2, "0")} referencias</span><h2>${window.escapeHTML(province)}</h2><p>Enfermedades con información preventiva asociada a esta provincia.</p></div><div class="province-diseases">${related.length ? related.map((disease) => `<a class="province-disease" href="enfermedades.html?id=${encodeURIComponent(disease.id)}"><span class="disease-color" data-color="${disease.color}"></span><div><strong>${window.escapeHTML(disease.nombre)}</strong><small>${window.escapeHTML(disease.categoria)}</small></div><i class="ph ph-arrow-up-right"></i></a>`).join("") : '<div class="panel-empty compact"><i class="ph ph-info"></i><p>No hay referencias para el filtro seleccionado.</p></div>'}</div>`;
  geoLayer.setStyle(styleFeature);
  islandLayer?.setStyle(styleFeature);
}

function bindFeature(feature, layer) {
  const province = officialProvince(feature);
  layer.bindTooltip(() => `<strong>${window.escapeHTML(province)}</strong><br>${relatedDiseases(province).length} referencias`, { sticky: true, direction: "top" });
  layer.on({
    mouseover: () => layer.setStyle({ weight: 3, color: "#ffffff" }),
    mouseout: () => {
      const owner = province === "Galápagos" ? islandLayer : geoLayer;
      owner?.resetStyle(layer);
    },
    click: () => { renderPanel(province); layer.bringToFront(); },
  });
}

async function initializeMap() {
  try {
    const [catalog, geoResponse] = await Promise.all([window.loadDiseases(), fetch(geoJsonUrl)]);
    if (!geoResponse.ok) throw new Error("No se pudo cargar la geometría del mapa.");
    diseases = catalog; const geoData = await geoResponse.json();
    document.querySelector("#mapped-count").textContent = diseases.length;
    document.querySelector("#source-count").textContent = new Set(diseases.flatMap((item) => item.fuentes.map((source) => source.organismo))).size;
    diseases.forEach((disease) => filter.insertAdjacentHTML("beforeend", `<option value="${window.escapeHTML(disease.id)}">${window.escapeHTML(disease.nombre)}</option>`));

    mapElement.innerHTML = '<div class="map-canvas" id="main-map-canvas"></div><div class="map-caption"><span>ECUADOR CONTINENTAL</span><small>Zonas educativas de referencia</small></div><div class="galapagos-inset"><div class="inset-label"><strong>Galápagos</strong><span>Región Insular</span></div><div id="galapagos-map"></div></div>';
    const map = L.map("main-map-canvas", { zoomControl: false, attributionControl: false, scrollWheelZoom: false, minZoom: 5, maxZoom: 9, zoomSnap: .25 });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    const mainland = { ...geoData, features: geoData.features.filter((feature) => officialProvince(feature) !== "Galápagos") };
    const islands = { ...geoData, features: geoData.features.filter((feature) => officialProvince(feature) === "Galápagos") };
    geoLayer = L.geoJSON(mainland, { style: styleFeature, onEachFeature: bindFeature }).addTo(map);
    map.fitBounds(geoLayer.getBounds(), { paddingTopLeft: [52, 76], paddingBottomRight: [52, 38] });

    const islandMap = L.map("galapagos-map", { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false });
    islandLayer = L.geoJSON(islands, { style: styleFeature, onEachFeature: bindFeature }).addTo(islandMap);
    islandMap.fitBounds(islandLayer.getBounds(), { padding: [13, 13] });

    const requested = new URLSearchParams(window.location.search).get("disease");
    if (requested && diseases.some((item) => item.id === requested)) { filter.value = requested; geoLayer.setStyle(styleFeature); islandLayer.setStyle(styleFeature); }
    filter.addEventListener("change", () => { geoLayer.setStyle(styleFeature); islandLayer.setStyle(styleFeature); if (selectedProvince) renderPanel(selectedProvince); });
  } catch (error) {
    mapElement.innerHTML = `<div class="map-loading error"><i class="ph ph-warning-circle"></i><span>${window.escapeHTML(error.message)}</span></div>`;
  }
}

initializeMap();
