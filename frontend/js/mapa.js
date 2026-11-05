const mapElement = document.querySelector("#ecuador-map");
const panel = document.querySelector("#province-panel");
const geoJsonUrl = "/api/map/ecuador";
let diseases = [];
let geoLayer;
let islandLayer;
let selectedProvince = "";
let mainMap;
let panelTab = "resumen";
const searchProvince = document.querySelector("#province-search");
const provinceList = document.createElement("div");
provinceList.className = "province-list";
provinceList.hidden = true;
mapElement.after(provinceList);
document.querySelector("#province-names").innerHTML = window.ECUADOR_PROVINCES.map((name) => `<option value="${window.escapeHTML(name)}"></option>`).join("");

function renderProvinceList() {
  const names = window.ECUADOR_PROVINCES.filter((name) => normalize(name).includes(normalize(searchProvince.value)));
  provinceList.innerHTML = names.length ? names.map((name) => `<button type="button" data-province="${window.escapeHTML(name)}" aria-pressed="${name === selectedProvince}"><strong>${window.escapeHTML(name)}</strong><span>${relatedDiseases(name).length} referencias educativas</span></button>`).join("") : '<p>No encontramos esa provincia.</p>';
}
function switchView(list) {
  provinceList.hidden = !list;
  mapElement.hidden = list;
  document.querySelector("#show-map").setAttribute("aria-pressed", String(!list));
  document.querySelector("#show-list").setAttribute("aria-pressed", String(list));
  if (list) renderProvinceList(); else mainMap?.invalidateSize();
}
document.querySelector("#show-map").addEventListener("click", () => switchView(false));
document.querySelector("#show-list").addEventListener("click", () => switchView(true));
searchProvince.addEventListener("input", () => { switchView(true); });
provinceList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-province]");
  if (button) { panelTab = "resumen"; renderPanel(button.dataset.province); renderProvinceList(); }
});
panel.addEventListener("click", (event) => {
  const button = event.target.closest("[data-panel-tab]");
  if (button) { panelTab = button.dataset.panelTab; renderPanel(selectedProvince); panel.querySelector(`[data-panel-tab="${panelTab}"]`).focus(); }
});

const normalize = (value = "") => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const provinceAliases = new Map(window.ECUADOR_PROVINCES.map((name) => [normalize(name), name]));

function officialProvince(feature) {
  const raw = feature.properties.shapeName || feature.properties.name || feature.properties.NAME_1 || "";
  return provinceAliases.get(normalize(raw)) || raw;
}

function relatedDiseases(province) {
  return diseases.filter((disease) => disease.provincias.includes(province));
}

function styleFeature(feature) {
  const province = officialProvince(feature);
  return { color: "#ffffff", weight: 1.4, fillColor: province === selectedProvince ? "#0077b6" : "#b8dfe9", fillOpacity: 0.95 };
}

function renderPanel(province) {
  selectedProvince = province; const related = relatedDiseases(province);
  panel.innerHTML = `<div class="province-panel-head"><span class="mono">${related.length.toString().padStart(2, "0")} referencias</span><h2>${window.escapeHTML(province)}</h2><p>Enfermedades con información preventiva asociada a esta provincia.</p></div><div class="province-diseases">${related.length ? related.map((disease) => `<a class="province-disease" href="enfermedades.html?id=${encodeURIComponent(disease.id)}"><span class="disease-color" data-color="${disease.color}"></span><div><strong>${window.escapeHTML(disease.nombre)}</strong><small>${window.escapeHTML(disease.categoria)}</small></div><i class="ph ph-arrow-up-right"></i></a>`).join("") : '<div class="panel-empty compact"><i class="ph ph-info"></i><p>No hay referencias para el filtro seleccionado.</p></div>'}</div>`;
  const tabBar = `<div class="province-tabs" aria-label="Información de la provincia">${["resumen", "prevencion", "fuentes"].map((tab, index) => `<button type="button" data-panel-tab="${tab}" aria-pressed="${panelTab === tab}">${["Resumen", "Prevención", "Fuentes"][index]}</button>`).join("")}</div>`;
  panel.querySelector(".province-panel-head").insertAdjacentHTML("afterend", tabBar);
  const content = panel.querySelector(".province-diseases");
  if (panelTab === "prevencion") content.innerHTML = related.map((disease) => `<section class="province-info"><h3>${window.escapeHTML(disease.nombre)}</h3><ul>${disease.prevencion.map((item) => `<li>${window.escapeHTML(item)}</li>`).join("") || '<li>No hay medidas registradas en esta ficha.</li>'}</ul></section>`).join("") || '<p>No hay referencias para el filtro seleccionado.</p>';
  if (panelTab === "fuentes") content.innerHTML = related.flatMap((disease) => disease.fuentes).filter((source, index, all) => all.findIndex((item) => item.url === source.url) === index).map((source) => `<a class="source-inline" href="${window.escapeHTML(source.url)}" target="_blank" rel="noopener"><strong>${window.escapeHTML(source.organismo)}</strong><span>${window.escapeHTML(source.titulo)}</span></a>`).join("") || '<p>No hay fuentes registradas para este filtro.</p>';
  geoLayer?.setStyle(styleFeature);
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

    mapElement.innerHTML = '<div class="map-canvas" id="main-map-canvas"></div><div class="map-caption"><span>ECUADOR CONTINENTAL</span><small>Zonas educativas de referencia</small></div><div class="galapagos-inset"><div class="inset-label"><strong>Galápagos</strong><span>Región Insular</span></div><div id="galapagos-map"></div></div>';
    const map = L.map("main-map-canvas", { zoomControl: false, attributionControl: false, scrollWheelZoom: false, minZoom: 5, maxZoom: 9, zoomSnap: .25 });
    mainMap = map;
    L.control.zoom({ position: "bottomright" }).addTo(map);
    const mainland = { ...geoData, features: geoData.features.filter((feature) => officialProvince(feature) !== "Galápagos") };
    const islands = { ...geoData, features: geoData.features.filter((feature) => officialProvince(feature) === "Galápagos") };
    geoLayer = L.geoJSON(mainland, { style: styleFeature, onEachFeature: bindFeature }).addTo(map);
    map.fitBounds(geoLayer.getBounds(), { paddingTopLeft: [52, 76], paddingBottomRight: [52, 38] });

    const islandMap = L.map("galapagos-map", { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false });
    islandLayer = L.geoJSON(islands, { style: styleFeature, onEachFeature: bindFeature }).addTo(islandMap);
    islandMap.fitBounds(islandLayer.getBounds(), { padding: [13, 13] });

    const requested = new URLSearchParams(window.location.search).get("disease");
    const requestedDisease = diseases.find((item) => item.id === requested);
    if (requestedDisease?.provincias.length) renderPanel(requestedDisease.provincias[0]);
    renderProvinceList();
  } catch (error) {
    mapElement.innerHTML = `<div class="map-loading error"><i class="ph ph-warning-circle"></i><span>${window.escapeHTML(error.message)}</span></div>`;
  }
}

initializeMap();
