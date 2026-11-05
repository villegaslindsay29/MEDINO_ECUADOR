const grid = document.querySelector("#disease-grid");
const search = document.querySelector("#disease-search");
const count = document.querySelector("#result-count");
const empty = document.querySelector("#empty-state");
const modal = document.querySelector("#disease-modal");
const modalContent = document.querySelector("#modal-content");
let diseases = [];
let carouselObservers = [];

const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function catalogCategory(disease) {
  const category = normalize(disease.categoria);
  const name = normalize(disease.nombre);
  if (category.includes("respiratori") || name === "tuberculosis") return "Respiratorias";
  if (category.includes("dermat") || category.includes("piel")) return "Piel";
  if (category.includes("digest")) return "Digestivas";
  if (category.includes("mental")) return "Salud mental";
  if (category.includes("materno")) return "Salud materno-infantil";
  if (/infeccio|vector|bacterian|transmisible/.test(category)) return "Infecciosas";
  if (category.includes("cronic")) return "Crónicas";
  return disease.categoria;
}

function compactCard(disease) {
  return `<article class="disease-card compact-disease-card">
    <div class="compact-photo"><img src="assets/reference/${window.diseasePhoto(disease)}.webp" alt="" width="400" height="140" loading="lazy"><span>${window.escapeHTML(catalogCategory(disease))}</span></div>
    <div class="compact-content"><h3>${window.escapeHTML(disease.nombre)}</h3><p>Síntomas, prevención y señales de alerta.</p>
    <div class="compact-actions"><button type="button" data-disease-id="${window.escapeHTML(disease.id)}"><i class="ph ph-list-checks" aria-hidden="true"></i> Síntomas</button><button type="button" data-disease-id="${window.escapeHTML(disease.id)}"><i class="ph ph-shield-check" aria-hidden="true"></i> Prevención</button><button type="button" class="compact-details" data-disease-id="${window.escapeHTML(disease.id)}">Ver información <i class="ph ph-arrow-right" aria-hidden="true"></i></button></div></div>
  </article>`;
}

function parseSearchTerms(value) {
  return value
    .split(",")
    .map((part) => normalize(part.trim()))
    .filter(Boolean);
}

function openDisease(id) {
  const disease = diseases.find((item) => item.id === id);
  if (!disease) return;

  modalContent.innerHTML = `
    <span class="prototype-badge">${window.escapeHTML(disease.categoria)} · ${window.escapeHTML(disease.zona)}</span>
    <h2 id="modal-title">${window.escapeHTML(disease.nombre)}</h2>
    <p class="modal-summary">${window.escapeHTML(disease.resumen)}</p>
    <div class="modal-columns">
      <section class="info-block"><h3><i class="ph ph-thermometer"></i>Síntomas frecuentes</h3><ul class="info-list">${disease.sintomas.map((item) => `<li>${window.escapeHTML(item)}</li>`).join("")}</ul></section>
      <section class="info-block"><h3><i class="ph ph-shield-check"></i>Prevención</h3><ul class="info-list">${disease.prevencion.map((item) => `<li>${window.escapeHTML(item)}</li>`).join("")}</ul></section>
      <section class="info-block"><h3><i class="ph ph-stethoscope"></i>Profesional de referencia</h3><p>${window.escapeHTML(disease.especialista)}</p><p class="muted specialist-note">Puedes comenzar por atención primaria. Esta referencia no confirma un diagnóstico ni constituye una derivación.</p></section>
      <section class="warning-block"><h3><i class="ph ph-warning"></i> Señales de alerta</h3><ul class="info-list">${disease.alertas.map((item) => `<li>${window.escapeHTML(item)}</li>`).join("")}</ul><p><strong>Busca atención médica urgente si aparece una de estas señales.</strong></p></section>
      <section class="info-block"><h3><i class="ph ph-map-pin"></i>Zonas de referencia</h3><p class="muted">${disease.provincias.map(window.escapeHTML).join(", ")}</p><a class="card-link" href="mapa.html?disease=${encodeURIComponent(disease.id)}">Explorar en el mapa <i class="ph ph-arrow-right"></i></a></section>
      <section class="info-block"><h3><i class="ph ph-book-open-text"></i>Fuentes de referencia</h3>${disease.fuentes.map((source) => `<a class="source-inline" href="${window.escapeHTML(source.url)}" target="_blank" rel="noopener"><strong>${window.escapeHTML(source.organismo)}</strong><span>${window.escapeHTML(source.titulo)}</span><i class="ph ph-arrow-up-right"></i></a>`).join("")}<p class="muted">Verifica siempre la publicación oficial más reciente.</p></section>
    </div>`;
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  modal.querySelector(".modal-close").focus();
}

function closeModal() {
  modal.classList.remove("open");
  document.body.style.overflow = "";
}

function render() {
  carouselObservers.forEach((observer) => observer.disconnect());
  carouselObservers = [];
  const terms = parseSearchTerms(search.value);
  const filtered = diseases.filter((disease) => {
    const searchable = normalize([disease.nombre, disease.resumen, disease.categoria, disease.especialista, ...disease.sintomas].join(" "));
    const matchesTerm = terms.length === 0 || terms.some((term) => searchable.includes(term));
    return matchesTerm;
  });

  const groups = new Map();
  filtered.forEach((disease) => {
    const category = catalogCategory(disease);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(disease);
  });
  grid.innerHTML = [...groups].map(([name, items], index) => `
    <section class="category-collection" aria-labelledby="category-title-${index}">
      <header class="collection-heading"><h2 id="category-title-${index}">${window.escapeHTML(name)}</h2><span>${items.length} ${items.length === 1 ? "enfermedad" : "enfermedades"}</span></header>
      <div class="disease-carousel" id="category-track-${index}" role="region" aria-label="Enfermedades: ${window.escapeHTML(name)}" tabindex="0">${items.map(compactCard).join("")}</div>
      <div class="carousel-controls"><button type="button" data-direction="-1" aria-controls="category-track-${index}" aria-label="Anteriores de ${window.escapeHTML(name)}"><i class="ph ph-caret-left" aria-hidden="true"></i></button><button type="button" data-direction="1" aria-controls="category-track-${index}" aria-label="Siguientes de ${window.escapeHTML(name)}"><i class="ph ph-caret-right" aria-hidden="true"></i></button></div>
    </section>`).join("");
  grid.querySelectorAll(".category-collection").forEach((section) => {
    const track = section.querySelector(".disease-carousel");
    const controls = section.querySelector(".carousel-controls");
    const buttons = controls.querySelectorAll("button");
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      controls.hidden = max <= 2;
      buttons[0].disabled = track.scrollLeft <= 2;
      buttons[1].disabled = track.scrollLeft >= max - 2;
    };
    track.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(track);
    carouselObservers.push(resize);
    update();
  });
  count.textContent = `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`;
  empty.style.display = filtered.length ? "none" : "block";
  empty.querySelector("h2").textContent = diseases.length ? "No encontramos coincidencias" : "El catálogo todavía no tiene fichas";
  grid.querySelectorAll("[data-disease-id]").forEach((button) => button.addEventListener("click", () => openDisease(button.dataset.diseaseId)));
}

modal.querySelector(".modal-close").addEventListener("click", closeModal);
modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && modal.classList.contains("open")) closeModal(); });
search.addEventListener("input", render);
grid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-direction]");
  if (!button) return;
  const track = document.getElementById(button.getAttribute("aria-controls"));
  track.scrollBy({ left: Number(button.dataset.direction) * track.clientWidth * .85, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
});

window.loadDiseases()
  .then((data) => {
    diseases = data;
    const urlSymptoms = new URLSearchParams(window.location.search).get("symptoms");
    if (urlSymptoms) search.value = urlSymptoms;
    render();
    const requestedId = new URLSearchParams(window.location.search).get("id");
    if (requestedId) openDisease(requestedId);
  })
  .catch(() => {
    count.textContent = "No fue posible cargar el catálogo.";
    empty.querySelector("h2").textContent = "No pudimos cargar el catálogo";
    empty.querySelector("p").textContent = "Comprueba tu conexión e inténtalo de nuevo más tarde.";
    empty.style.display = "block";
  });
