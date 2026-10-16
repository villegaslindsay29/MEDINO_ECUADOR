const menuButton = document.querySelector("[data-menu-toggle]");
const navLinks = document.querySelector("[data-nav-links]");
document.querySelectorAll(".nav-link.active").forEach((link) => link.setAttribute("aria-current", "page"));

if (menuButton && navLinks) {
  navLinks.id = "primary-navigation";
  menuButton.setAttribute("aria-controls", navLinks.id);
  const closeMenu = () => {
    navLinks.classList.remove("open"); document.body.classList.remove("menu-open");
    menuButton.setAttribute("aria-expanded", "false"); menuButton.setAttribute("aria-label", "Abrir menú");
    menuButton.innerHTML = '<i class="ph ph-list" aria-hidden="true"></i>';
  };
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navLinks.classList.contains("open")) { closeMenu(); menuButton.focus(); }
  });
  document.addEventListener("click", (event) => {
    if (!navLinks.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
  window.matchMedia("(min-width: 901px)").addEventListener("change", (event) => { if (event.matches) closeMenu(); });
}

if (menuButton && navLinks) {
  menuButton.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    document.body.classList.toggle("menu-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
    menuButton.innerHTML = `<i class="ph ph-${isOpen ? "x" : "list"}" aria-hidden="true"></i>`;
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      navLinks.classList.remove("open");
      document.body.classList.remove("menu-open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.innerHTML = '<i class="ph ph-list" aria-hidden="true"></i>';
    }
  });
}

document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 },
);

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

window.showToast = (message) => {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(window.mediinfoToastTimer);
  window.mediinfoToastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
};

window.escapeHTML = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
})[character]);

window.ECUADOR_PROVINCES = ["Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja", "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", "Pastaza", "Pichincha", "Santa Elena", "Santo Domingo de los Tsáchilas", "Sucumbíos", "Tungurahua", "Zamora Chinchipe"];

const coastalAndAmazon = ["Esmeraldas", "Manabí", "Santo Domingo de los Tsáchilas", "Los Ríos", "Guayas", "Santa Elena", "El Oro", "Sucumbíos", "Napo", "Orellana", "Pastaza", "Morona Santiago", "Zamora Chinchipe"];

window.normalizeDisease = (disease) => ({
  ...disease,
  categoria: disease.categoria?.trim() || "General",
  especialista: disease.especialista?.trim() || "Medicina general",
  resumen: disease.resumen?.trim() || "Información educativa en revisión.",
  sintomas: disease.sintomas || [],
  prevencion: disease.prevencion || [],
  alertas: disease.alertas || [],
  zona: disease.zona?.trim() || "Todo el país",
  color: disease.color || "green",
  provincias: disease.provincias?.length
    ? disease.provincias
    : disease.zona === "Todo el país" ? window.ECUADOR_PROVINCES : coastalAndAmazon,
  fuentes: disease.fuentes?.length
    ? disease.fuentes
    : [{ titulo: disease.nombre, organismo: disease.fuente || "Fuente por verificar", url: "https://www.salud.gob.ec/" }],
  origen: disease.origen || "catalogo",
  estado_revision: disease.estado_revision || "verificada",
  publicada: disease.publicada ?? true,
});

window.createDiseaseCard = (disease) => `
  <article class="disease-card" data-color="${disease.color}">
    <div class="card-meta">
      <span>${window.escapeHTML(disease.categoria)}</span>
      <span>${window.escapeHTML(disease.zona)}</span>
    </div>
    <h3>${window.escapeHTML(disease.nombre)}</h3>
    <p>${window.escapeHTML(disease.resumen)}</p>
    <span class="disease-specialist"><i class="ph ph-stethoscope" aria-hidden="true"></i> ${window.escapeHTML(disease.especialista)}</span>
    ${disease.origen === "ALBA" ? `<span class="ai-origin"><i class="ph ph-sparkle"></i> Generada por ALBA · ${disease.estado_revision === "pendiente" ? "Pendiente de revisión" : "Verificada"}</span>` : ""}
    <button class="card-link" type="button" data-disease-id="${window.escapeHTML(disease.id)}">
      Ver información <i class="ph ph-arrow-up-right" aria-hidden="true"></i>
    </button>
  </article>`;

window.loadDiseases = async () => {
  try {
    const apiResponse = await fetch("/api/diseases");
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      return data.diseases.map(window.normalizeDisease);
    }
    throw new Error("El catálogo actualizado no está disponible.");
  } catch {
    if (window.location.protocol !== "file:") throw new Error("No se pudo conectar con el catálogo actualizado.");
  }

  const response = await fetch("data/enfermedades.json");
  if (!response.ok) throw new Error("No se pudo cargar la información.");
  const baseDiseases = (await response.json()).map(window.normalizeDisease);
  const customDiseases = JSON.parse(localStorage.getItem("mediinfo_custom_diseases") || "[]");
  const overrides = JSON.parse(localStorage.getItem("mediinfo_disease_overrides") || "{}");
  const hidden = JSON.parse(localStorage.getItem("mediinfo_hidden_diseases") || "[]");
  const visibleBase = baseDiseases
    .filter((item) => !hidden.includes(item.id))
    .map((item) => ({ ...item, ...overrides[item.id], _isBase: true }));
  return [...visibleBase, ...customDiseases.map((item) => ({ ...window.normalizeDisease(item), _isBase: false }))];
};

window.getAdminToken = () => sessionStorage.getItem("mediinfo_admin_token") || "";

// Keep keyboard focus inside an open dialog and restore it on close.
document.querySelectorAll('.modal-backdrop[role="dialog"]').forEach((dialog) => {
  let trigger = null;
  const focusable = () => [...dialog.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, [tabindex="0"]')]
    .filter((element) => !element.disabled && element.getClientRects().length);
  const changeObserver = new MutationObserver(() => {
    if (dialog.classList.contains("open")) {
      document.querySelectorAll("body > header, body > main, body > footer").forEach((element) => { element.inert = true; });
    } else {
      document.querySelectorAll("body > header, body > main, body > footer").forEach((element) => { element.inert = false; });
      trigger?.focus(); trigger = null;
    }
  });
  document.addEventListener("click", (event) => {
    if (!dialog.classList.contains("open") && event.target.closest("button")) trigger = event.target.closest("button");
  }, true);
  changeObserver.observe(dialog, { attributes: true, attributeFilter: ["class"] });
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const elements = focusable(); const first = elements[0]; const last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
});

window.apiRequest = async (url, options = {}) => {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = window.getAdminToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "No fue posible completar la solicitud.");
  return data;
};
