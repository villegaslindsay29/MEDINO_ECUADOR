const grid = document.querySelector("#disease-grid");
const search = document.querySelector("#disease-search");
const category = document.querySelector("#category-filter");
const count = document.querySelector("#result-count");
const empty = document.querySelector("#empty-state");
const modal = document.querySelector("#disease-modal");
const modalContent = document.querySelector("#modal-content");
let diseases = [];

const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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
  const terms = parseSearchTerms(search.value);
  const selectedCategory = category.value;
  const filtered = diseases.filter((disease) => {
    const searchable = normalize([disease.nombre, disease.resumen, disease.categoria, disease.especialista, ...disease.sintomas].join(" "));
    const matchesTerm = terms.length === 0 || terms.some((term) => searchable.includes(term));
    return matchesTerm && (!selectedCategory || disease.categoria === selectedCategory);
  });

  grid.innerHTML = filtered.map(window.createDiseaseCard).join("");
  count.textContent = `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`;
  empty.style.display = filtered.length ? "none" : "block";
  grid.querySelectorAll("[data-disease-id]").forEach((button) => button.addEventListener("click", () => openDisease(button.dataset.diseaseId)));
}

modal.querySelector(".modal-close").addEventListener("click", closeModal);
modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && modal.classList.contains("open")) closeModal(); });
search.addEventListener("input", render);
category.addEventListener("change", render);

window.loadDiseases()
  .then((data) => {
    diseases = data;
    [...new Set(diseases.map((item) => item.categoria))].sort().forEach((item) => category.insertAdjacentHTML("beforeend", `<option value="${window.escapeHTML(item)}">${window.escapeHTML(item)}</option>`));
    const urlSymptoms = new URLSearchParams(window.location.search).get("symptoms");
    if (urlSymptoms) search.value = urlSymptoms;
    render();
    const requestedId = new URLSearchParams(window.location.search).get("id");
    if (requestedId) openDisease(requestedId);
  })
  .catch(() => {
    count.textContent = "No fue posible cargar el catálogo.";
    empty.style.display = "block";
  });
