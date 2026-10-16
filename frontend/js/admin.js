const list = document.querySelector("#admin-list");
const modal = document.querySelector("#editor-modal");
const form = document.querySelector("#content-form");
const newButton = document.querySelector("#new-content");
const cancelButton = document.querySelector("#cancel-editor");
const authGate = document.querySelector("#auth-gate");
const authForm = document.querySelector("#auth-form");
const provincePicker = document.querySelector("#province-picker");
const fields = {
  id: document.querySelector("#content-id"), name: document.querySelector("#content-name"),
  category: document.querySelector("#content-category"), specialist: document.querySelector("#content-specialist"), zone: document.querySelector("#content-zone"),
  summary: document.querySelector("#content-summary"), symptoms: document.querySelector("#content-symptoms"),
  prevention: document.querySelector("#content-prevention"), alerts: document.querySelector("#content-alerts"),
  source: document.querySelector("#content-source"), organization: document.querySelector("#content-organization"),
};
let diseases = [];

provincePicker.innerHTML = window.ECUADOR_PROVINCES.map((province) => `<label class="province-option"><input type="checkbox" value="${window.escapeHTML(province)}"><span>${window.escapeHTML(province)}</span></label>`).join("");

const splitItems = (value) => value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12);
const slugify = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90);

function selectedProvinces() {
  return [...provincePicker.querySelectorAll("input:checked")].map((input) => input.value);
}

function updateStats() {
  document.querySelector("#visible-count").textContent = diseases.filter((item) => item.publicada).length;
  document.querySelector("#category-count").textContent = new Set(diseases.map((item) => item.categoria)).size;
  document.querySelector("#change-count").textContent = diseases.filter((item) => item.origen === "ALBA").length;
}

function render() {
  list.innerHTML = diseases.map((disease) => `
    <article class="admin-row">
      <div><strong>${window.escapeHTML(disease.nombre)}</strong><small>${window.escapeHTML(disease.especialista)} · ${window.escapeHTML(disease.resumen)}</small>${disease.estado_revision === "pendiente" ? '<span class="ai-origin"><i class="ph ph-sparkle"></i> Pendiente de revisión</span>' : ""}</div>
      <span>${window.escapeHTML(disease.categoria)}</span><span>${window.escapeHTML(disease.zona)}</span>
      <div class="row-actions">${disease.estado_revision === "pendiente" ? `<button class="icon-button approve" type="button" data-approve="${window.escapeHTML(disease.id)}" aria-label="Verificar ${window.escapeHTML(disease.nombre)}" title="Verificar y publicar"><i class="ph ph-check"></i></button>` : ""}<button class="icon-button" type="button" data-edit="${window.escapeHTML(disease.id)}" aria-label="Editar ${window.escapeHTML(disease.nombre)}"><i class="ph ph-pencil-simple"></i></button><button class="icon-button delete" type="button" data-delete="${window.escapeHTML(disease.id)}" aria-label="Eliminar ${window.escapeHTML(disease.nombre)}"><i class="ph ph-trash"></i></button></div>
    </article>`).join("");
  list.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => openEditor(button.dataset.edit)));
  list.querySelectorAll("[data-approve]").forEach((button) => button.addEventListener("click", () => approveDisease(button.dataset.approve)));
  list.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => removeDisease(button.dataset.delete)));
  updateStats();
}

async function refresh() {
  const data = await window.apiRequest("/api/diseases?all=true");
  diseases = data.diseases.map(window.normalizeDisease);
  render();
}

async function verifySession() {
  if (!window.getAdminToken()) return false;
  try { await window.apiRequest("/api/auth/me"); authGate.classList.add("hidden"); await refresh(); return true; }
  catch { sessionStorage.removeItem("mediinfo_admin_token"); return false; }
}

function openEditor(id = "") {
  form.reset();
  provincePicker.querySelectorAll("input").forEach((input) => { input.checked = false; });
  fields.id.value = id;
  document.querySelector("#editor-title").textContent = id ? "Editar enfermedad" : "Nueva enfermedad";
  const disease = diseases.find((item) => item.id === id);
  if (disease) {
    fields.name.value = disease.nombre; fields.category.value = disease.categoria; fields.specialist.value = disease.especialista; fields.zone.value = disease.zona;
    fields.summary.value = disease.resumen; fields.symptoms.value = (disease.sintomas || []).join(", ");
    fields.prevention.value = (disease.prevencion || []).join(", "); fields.alerts.value = (disease.alertas || []).join(", ");
    fields.source.value = disease.fuentes[0]?.url || ""; fields.organization.value = disease.fuentes[0]?.organismo || "";
    provincePicker.querySelectorAll("input").forEach((input) => { input.checked = disease.provincias.includes(input.value); });
  }
  modal.classList.add("open"); document.body.style.overflow = "hidden"; fields.name.focus();
}

function closeEditor() { modal.classList.remove("open"); document.body.style.overflow = ""; }

async function removeDisease(id) {
  const disease = diseases.find((item) => item.id === id);
  if (!disease || !window.confirm(`¿Eliminar permanentemente "${disease.nombre}"? También desaparecerá del mapa.`)) return;
  try { await window.apiRequest(`/api/diseases/${encodeURIComponent(id)}`, { method: "DELETE" }); await refresh(); window.showToast("Enfermedad eliminada."); }
  catch (error) { window.showToast(error.message); }
}

async function approveDisease(id) {
  const disease = diseases.find((item) => item.id === id);
  if (!disease || !window.confirm(`¿Marcar "${disease.nombre}" como verificada?`)) return;
  try {
    await window.apiRequest(`/api/diseases/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ ...disease, estado_revision: "verificada", publicada: true }),
    });
    await refresh(); window.showToast("Enfermedad verificada.");
  } catch (error) { window.showToast(error.message); }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const provinces = selectedProvinces();
  const existing = diseases.find((item) => item.id === fields.id.value);
  const name = fields.name.value.trim();
  if (!name) { window.showToast("El nombre de la enfermedad es obligatorio."); return; }
  const source = fields.source.value.trim();
  const sourceUrl = source && !/^https?:\/\//i.test(source) ? `https://${source}` : source;
  const extraSources = existing?.fuentes?.slice(1) || [];
  const disease = {
    id: existing?.id || slugify(name), nombre: name,
    categoria: fields.category.value.trim() || "General", especialista: fields.specialist.value.trim() || "Medicina general",
    zona: fields.zone.value.trim() || "Todo el país", resumen: fields.summary.value.trim(), sintomas: splitItems(fields.symptoms.value),
    prevencion: splitItems(fields.prevention.value), alertas: splitItems(fields.alerts.value), provincias: provinces,
    fuentes: sourceUrl
      ? [{ titulo: name || "Fuente", organismo: fields.organization.value.trim() || "Fuente por verificar", url: sourceUrl }, ...extraSources]
      : extraSources,
    color: existing?.color || "green", origen: existing?.origen || "manual", estado_revision: "verificada", publicada: true,
  };
  try {
    await window.apiRequest(existing ? `/api/diseases/${encodeURIComponent(existing.id)}` : "/api/diseases", { method: existing ? "PUT" : "POST", body: JSON.stringify(disease) });
    closeEditor(); await refresh(); window.showToast("Enfermedad guardada en Supabase.");
  } catch (error) { window.showToast(error.message); }
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault(); document.querySelector("#auth-error").textContent = "";
  try {
    const data = await window.apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify({ email: document.querySelector("#auth-email").value, password: document.querySelector("#auth-password").value }) });
    sessionStorage.setItem("mediinfo_admin_token", data.accessToken); authGate.classList.add("hidden"); await refresh();
  } catch (error) { document.querySelector("#auth-error").textContent = error.message; }
});

document.querySelector("#register-admin").addEventListener("click", async () => {
  const email = document.querySelector("#auth-email").value; const password = document.querySelector("#auth-password").value;
  try { const data = await window.apiRequest("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }); window.showToast(data.message); }
  catch (error) { document.querySelector("#auth-error").textContent = error.message; }
});

document.querySelector("#logout").addEventListener("click", () => { sessionStorage.removeItem("mediinfo_admin_token"); window.location.reload(); });
newButton.addEventListener("click", () => openEditor()); cancelButton.addEventListener("click", closeEditor);
modal.querySelector(".modal-close").addEventListener("click", closeEditor);
modal.addEventListener("click", (event) => { if (event.target === modal) closeEditor(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && modal.classList.contains("open")) closeEditor(); });
verifySession();
