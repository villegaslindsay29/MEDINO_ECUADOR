const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const messages = document.querySelector("#chat-messages");
const ageRange = document.querySelector("#age-range");
const sendButton = document.querySelector("#send-button");
const statusText = document.querySelector("#assistant-status");
const clearButton = document.querySelector("#clear-chat");
let quickPrompts = document.querySelector("#quick-prompts");
let history = [];
let loading = false;
const initialMessages = messages.innerHTML;
let activeRequest = null;
let conversationVersion = 0;

function setBusy(busy) {
  loading = busy;
  sendButton.disabled = busy;
  ageRange.disabled = busy;
  messages.setAttribute("aria-busy", String(busy));
  messages.querySelectorAll("button").forEach((button) => { button.disabled = busy; });
  statusText.textContent = busy ? "ALBA está preparando tu respuesta" : "Disponible";
}

function bindInitialPrompts() {
  quickPrompts = document.querySelector("#quick-prompts");
  quickPrompts?.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => sendMessage(button.textContent)));
}

const emergencyPattern = /(no puedo respirar|dificultad para respirar|me desmay|inconsciente|convulsi|sangrado (fuerte|abundante)|dolor (fuerte|intenso) (en el pecho|de pecho)|debilidad.*lado|labios azules)/i;

function createMessage(role) {
  const wrapper = document.createElement("div"); wrapper.className = `message ${role}`;
  const bubble = document.createElement("div"); bubble.className = "message-bubble"; wrapper.appendChild(bubble); messages.appendChild(wrapper); return bubble;
}

function addTextMessage(content, role) {
  const bubble = createMessage(role); const paragraph = document.createElement("p"); paragraph.textContent = content; bubble.appendChild(paragraph); messages.scrollTop = messages.scrollHeight;
}

function appendList(container, title, icon, items, className = "") {
  if (!items?.length) return;
  const section = document.createElement("section"); section.className = `alba-section ${className}`;
  const heading = document.createElement("strong"); heading.innerHTML = `<i class="ph ph-${icon}" aria-hidden="true"></i> ${window.escapeHTML(title)}`; section.appendChild(heading);
  const list = document.createElement("ul"); items.forEach((item) => { const li = document.createElement("li"); li.textContent = item; list.appendChild(li); }); section.appendChild(list); container.appendChild(section);
}

function renderQuickReplies(items) {
  document.querySelector("#dynamic-prompts")?.remove();
  if (!items?.length) return;
  const group = document.createElement("div"); group.className = "quick-prompts"; group.id = "dynamic-prompts";
  items.forEach((item) => { const button = document.createElement("button"); button.className = "quick-prompt"; button.type = "button"; button.textContent = item; button.addEventListener("click", () => sendMessage(item)); group.appendChild(button); });
  messages.appendChild(group); messages.scrollTop = messages.scrollHeight;
}

function appendDiseaseSuggestions(container, suggestions) {
  if (!suggestions?.length) return;
  const section = document.createElement("section"); section.className = "disease-suggestions";
  const heading = document.createElement("div"); heading.className = "suggestion-heading";
  heading.innerHTML = '<div><span class="mono">NUEVOS TEMAS</span><strong>Elige una para investigarla</strong></div><i class="ph ph-compass" aria-hidden="true"></i>';
  section.appendChild(heading);
  const grid = document.createElement("div"); grid.className = "suggestion-grid";
  suggestions.forEach((suggestion) => {
    const button = document.createElement("button"); button.className = "suggestion-card"; button.type = "button";
    const category = document.createElement("span"); category.textContent = suggestion.categoria;
    const name = document.createElement("strong"); name.textContent = suggestion.nombre;
    const reason = document.createElement("p"); reason.textContent = suggestion.motivo;
    const matching = document.createElement("small");
    if (suggestion.matchingSymptoms && suggestion.matchingSymptoms.length > 0) {
      matching.textContent = `Coincide con: ${suggestion.matchingSymptoms.slice(0, 3).join(", ")}${suggestion.matchingSymptoms.length > 3 ? " + más" : ""}`;
    } else {
      matching.textContent = "";
    }
    const action = document.createElement("small"); action.innerHTML = 'Investigar y agregar <i class="ph ph-arrow-right"></i>';
    button.append(category, name, reason, matching, action);
    button.addEventListener("click", () => sendMessage(
      `Investiga y agrega ${suggestion.nombre} a MedInfo Ecuador.`,
      { nombre: suggestion.nombre, categoria: suggestion.categoria },
    ));
    grid.appendChild(button);
  });
  section.appendChild(grid);
  const more = document.createElement("button"); more.className = "more-suggestions"; more.type = "button"; more.innerHTML = '<i class="ph ph-arrows-clockwise"></i> Mostrar otras opciones';
  more.addEventListener("click", () => sendMessage("Sugiere otras enfermedades relevantes de Ecuador que no estén registradas y no repitas las opciones anteriores."));
  section.appendChild(more); container.appendChild(section);
}

function parseSymptomsFromMessage(message) {
  if (!message) return [];
  const parts = message.split(",").map((part) => part.trim());
  return parts.filter((part) => part.length >= 2);
}

function addAlbaResponse(data) {
  const bubble = createMessage("assistant"); bubble.classList.add("alba-response");
  if (["alta", "emergencia"].includes(data.urgency)) {
    const urgency = document.createElement("span"); urgency.className = `urgency urgency-${data.urgency}`; urgency.textContent = data.urgency === "emergencia" ? "Atención inmediata" : "Busca atención pronto"; bubble.appendChild(urgency);
  }
  const orientation = document.createElement("p"); orientation.textContent = data.orientation; bubble.appendChild(orientation);
  if (data.relatedDiseaseDetails && data.urgency !== "emergencia") {
    const match = document.createElement("section"); match.className = "compatibility-result";
    const copy = document.createElement("p");
    copy.append("Los síntomas que describes pueden ser compatibles con ");
    const diseaseName = document.createElement("strong"); diseaseName.textContent = data.relatedDiseaseDetails.nombre;
    copy.append(diseaseName, ", pero también pueden aparecer en otras condiciones. Esto no confirma un diagnóstico.");
    const specialist = document.createElement("p"); specialist.className = "compatibility-specialist";
    specialist.textContent = `Profesional de referencia: ${data.relatedDiseaseDetails.especialista}. También puedes comenzar por atención primaria.`;
    const link = document.createElement("a"); link.href = `enfermedades.html?id=${encodeURIComponent(data.relatedDiseaseDetails.id)}`; link.textContent = "Consultar la ficha";
    match.append(copy, specialist, link); bubble.appendChild(match);
  }
  appendList(bubble, "Qué hacer ahora", "check-circle", data.actions);
  appendList(bubble, "Señales de alerta", "warning", data.warnings, "alert-section");
  if (data.question) { const question = document.createElement("p"); question.className = "alba-question"; question.textContent = data.question; bubble.appendChild(question); }
  appendDiseaseSuggestions(bubble, data.suggestedDiseases);
  if (data.savedDisease) {
    const discovery = document.createElement("div"); discovery.className = "discovery-card";
    const text = document.createElement("div"); const strong = document.createElement("strong");
    strong.textContent = data.savedDiseaseStatus === "existing"
      ? `${data.savedDisease.nombre} ya estaba registrada`
      : `${data.savedDisease.nombre} añadida a Enfermedades`;
    const small = document.createElement("span"); small.textContent = data.savedDisease.estado_revision === "pendiente"
      ? `Profesional de referencia: ${data.savedDisease.especialista}. La ficha ya es visible con aviso de revisión pendiente.`
      : `Profesional de referencia: ${data.savedDisease.especialista}.`;
    text.append(strong, small); discovery.appendChild(text);
    const links = document.createElement("div"); links.className = "discovery-links";
    links.innerHTML = `<a href="enfermedades.html?id=${encodeURIComponent(data.savedDisease.id)}">Ver en Enfermedades</a><a href="mapa.html?disease=${encodeURIComponent(data.savedDisease.id)}">Ver en el mapa</a>`;
    discovery.appendChild(links);
    bubble.appendChild(discovery);
  }
  renderQuickReplies(data.quickReplies); messages.scrollTop = messages.scrollHeight;
}

function addTyping() {
  const wrapper = document.createElement("div"); wrapper.className = "message assistant"; wrapper.id = "typing-message";
  wrapper.innerHTML = '<div class="message-bubble typing" aria-label="ALBA está respondiendo"><span></span><span></span><span></span></div>'; messages.appendChild(wrapper); messages.scrollTop = messages.scrollHeight;
}

async function sendMessage(text, selectedDisease = null) {
  const message = text.trim(); if (loading || message.length < 3) return;
  quickPrompts?.remove(); quickPrompts = null; document.querySelector(".chat-empty")?.remove(); document.querySelector("#dynamic-prompts")?.remove(); addTextMessage(message, "user"); input.value = "";
  if (emergencyPattern.test(message)) {
    const data = { orientation: "Lo que describes podría ser una emergencia. Llama al ECU 911 ahora o acude inmediatamente a emergencias.", actions: ["Pide ayuda a una persona cercana", "No conduzcas si estás débil o confundido"], warnings: ["No esperes una respuesta adicional en línea"], question: null, quickReplies: [], urgency: "emergencia" };
    addAlbaResponse(data); history.push({ role: "user", content: message }, { role: "assistant", content: data.orientation }); return;
  }
  const version = conversationVersion;
  activeRequest = new AbortController();
  setBusy(true); addTyping();
  try {
    const userSymptoms = parseSymptomsFromMessage(message);
    const response = await fetch("/api/assistant", { method: "POST", signal: activeRequest.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, ageRange: ageRange.value, history: history.slice(-6), selectedDisease, symptoms: userSymptoms }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || "No fue posible obtener una respuesta.");
    if (version !== conversationVersion) return;
    document.querySelector("#typing-message")?.remove(); addAlbaResponse(data);
    const suggestedNames = data.suggestedDiseases?.map((item) => item.nombre).join(", ");
    const symptomsInfo = userSymptoms.length > 0 ? `Síntomas analizados: ${userSymptoms.join(", ")}. ` : "";
    const summary = [data.orientation, data.question, suggestedNames ? `Enfermedades sugeridas: ${suggestedNames}.` : "", data.savedDisease ? ` ${data.savedDisease ? "Guardada." : ""}` : ""].filter(Boolean).join(" "); history.push({ role: "user", content: message }, { role: "assistant", content: summary }); history = history.slice(-6);
  } catch (error) {
    if (version !== conversationVersion || error.name === "AbortError") return;
    document.querySelector("#typing-message")?.remove();
    addTextMessage(error.message || "No fue posible conectar con ALBA.", "assistant");
    input.value = message;
  } finally {
    if (version === conversationVersion) { activeRequest = null; setBusy(false); input.focus(); }
  }
}

form.addEventListener("submit", (event) => { event.preventDefault(); sendMessage(input.value); });
input.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); } });
bindInitialPrompts();
clearButton.addEventListener("click", () => {
  conversationVersion += 1;
  activeRequest?.abort(); activeRequest = null;
  history = []; messages.innerHTML = initialMessages; input.value = "";
  bindInitialPrompts(); setBusy(false); input.focus();
  window.showToast("Conversación reiniciada.");
});
