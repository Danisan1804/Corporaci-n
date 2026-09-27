const MODULES = {
  1: "Liderazgo personal y comunitario",
  2: "Pensamiento emprendedor",
  3: "Diseño y validación de proyectos",
  4: "Marketing y transformación digital",
  5: "Gestión, sostenibilidad y cierre",
};

const $ = (selector) => document.querySelector(selector);
const phpHosting = !["localhost", "127.0.0.1", ""].includes(
  window.location.hostname,
);

async function api(path, options = {}) {
  const request = {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  };
  if (phpHosting && path.startsWith("/api/")) {
    const route = path.slice(5);
    request.method = request.method === "PATCH" ? "POST" : request.method;
    path = `api.php?route=${encodeURIComponent(route)}`;
  }
  const response = await fetch(path, {
    credentials: "same-origin",
    ...request,
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && phpHosting) {
    showLogin();
    throw new Error(data.error || "Sesión requerida.");
  }
  if (!response.ok)
    throw new Error(data.error || "No se pudo completar la solicitud.");
  return data;
}

function showLogin() {
  const screen = $("#login-screen");
  screen.classList.add("visible");
  screen.style.setProperty("display", "flex", "important");
}
function hideLogin() {
  const screen = $("#login-screen");
  screen.classList.remove("visible");
  screen.style.setProperty("display", "none", "important");
}

function show(id) {
  document
    .querySelectorAll(".view")
    .forEach((view) => view.classList.toggle("active", view.id === id));
  document
    .querySelectorAll(".nav button")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.view === id),
    );
  const titles = {
    dashboard: "Gestión del programa",
    participants: "Participantes y trazabilidad",
    formation: "Ruta formativa",
    reports: "Informes e indicadores",
    team: "Equipo del proyecto",
  };
  $("#page-title").textContent = titles[id] || titles.dashboard;
  if (id === "reports") loadReport();
}

function openModal() {
  $("#registration-modal").classList.add("open");
  $("#registration-modal").setAttribute("aria-hidden", "false");
  $("#registration-form").reset();
  $("#form-error").textContent = "";
  $("#registration-form input").focus();
}

function closeModal() {
  $("#registration-modal").classList.remove("open");
  $("#registration-modal").setAttribute("aria-hidden", "true");
}

function toast(message, error = false) {
  const box = $("#toast");
  box.textContent = message;
  box.className = `toast show${error ? " error" : ""}`;
  setTimeout(() => (box.className = "toast"), 3000);
}

async function login(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  try {
    await api("/api/login", { method: "POST", body: JSON.stringify(data) });
    $("#login-error").textContent = "";
    window.location.href = "solicitudes.php";
  } catch (error) {
    $("#login-error").textContent = error.message;
  }
}

function stageLabel(stage) {
  return `Módulo ${stage}`;
}

function renderParticipants(participants) {
  const body = $("#participants-body");
  if (!participants.length) {
    body.innerHTML =
      '<tr><td colspan="6" class="empty">Todavía no hay participantes registrados.</td></tr>';
    return;
  }
  body.innerHTML = participants
    .map(
      (p) => `<tr>
        <td><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.email)}</small></td>
        <td>${stageLabel(p.stage)}<small>${escapeHtml(p.module_name)}</small></td>
        <td><input class="inline-input" data-field="attendance" data-id="${p.id}" value="${p.attendance}" type="number" min="0" max="100">%</td>
        <td>${p.deliverables_done}/${p.deliverables_total || 0}</td>
        <td><span class="pill ${p.status === "Retirado" ? "red" : p.status === "Graduado" ? "green" : p.status === "Pendiente" ? "gold" : ""}">${escapeHtml(p.status)}</span></td>
        <td>${p.status === "Pendiente" ? `<button class="small-btn" data-action="approve" data-id="${p.id}">Aprobar</button> <button class="small-btn" data-action="reject" data-id="${p.id}">Rechazar</button>` : `<button class="small-btn" data-action="evidence" data-id="${p.id}">Evidencias</button> <button class="small-btn" data-action="advance" data-id="${p.id}" ${p.stage >= 5 ? "disabled" : ""}>${p.stage >= 5 ? "Último módulo" : "Avanzar"}</button>`}</td>
    </tr>`,
    )
    .join("");
}

let evidenceParticipant = null;

async function openEvidence(id) {
  const all = await api("/api/participants");
  evidenceParticipant = all.participants.find((item) => item.id === Number(id));
  if (!evidenceParticipant) return;
  $("#evidence-modal").classList.add("open");
  $("#evidence-modal").setAttribute("aria-hidden", "false");
  $("#evidence-form").reset();
  $("#evidence-error").textContent = "";
  $("#evidence-subtitle").textContent =
    `${evidenceParticipant.name} · ${stageLabel(evidenceParticipant.stage)} · ${evidenceParticipant.module_name}`;
  await loadEvidence();
}

async function loadEvidence() {
  const data = await api(
    `/api/participants/${evidenceParticipant.id}/evidence`,
  );
  $("#evidence-list").innerHTML = data.evidences.length
    ? data.evidences
        .map(
          (e) =>
            `<div class="evidence-item"><strong>${escapeHtml(e.title)}</strong><small>${escapeHtml(e.description || "Sin descripción")} · ${new Date(e.created_at).toLocaleDateString("es-CO")}${e.link ? ` · <a href="${escapeHtml(e.link)}" target="_blank" rel="noopener">Abrir enlace</a>` : ""}</small></div>`,
        )
        .join("")
    : '<p class="muted">Todavía no hay evidencias para este módulo.</p>';
}

function closeEvidence() {
  $("#evidence-modal").classList.remove("open");
  $("#evidence-modal").setAttribute("aria-hidden", "true");
  evidenceParticipant = null;
}

function renderDashboard(data) {
  $("#kpi-total").textContent = data.total;
  $("#kpi-active").textContent = data.active;
  $("#kpi-graduated").textContent = data.graduated;
  $("#kpi-alerts").textContent = data.low_attendance;
  $("#stage-pipeline").innerHTML = Object.entries(MODULES)
    .map(
      ([number, name]) =>
        `<div class="stage"><b>${stageLabel(number)}</b><div class="num">${data.by_stage[number] || 0}</div><span class="pill">${name}</span></div>`,
    )
    .join("");
}

async function refresh() {
  try {
    const [participants, dashboard] = await Promise.all([
      api("/api/participants"),
      api("/api/dashboard"),
    ]);
    renderParticipants(participants.participants);
    renderDashboard(dashboard);
    await loadReport();
  } catch (error) {
    toast(error.message, true);
  }
}

async function loadReport() {
  const report = await api("/api/report");
  $("#report-date").textContent =
    `Generado: ${new Date(report.generated_at).toLocaleString("es-CO")}`;
  const counts = Object.keys(MODULES)
    .map(
      (key) =>
        `<div class="row"><strong>${stageLabel(key)}</strong><span>${report.participants.filter((p) => String(p.stage) === key).length}</span></div>`,
    )
    .join("");
  $("#report-content").innerHTML =
    `<div class="report-summary"><div><b>${report.total}</b><small>inscritos</small></div><div><b>${report.participants.filter((p) => p.status === "Graduado").length}</b><small>graduados</small></div></div>${counts}<h3>Detalle</h3><div class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Módulo</th><th>Asistencia</th><th>Estado</th></tr></thead><tbody>${report.participants.map((p) => `<tr><td>${escapeHtml(p.name)}</td><td>${stageLabel(p.stage)}</td><td>${p.attendance}%</td><td>${escapeHtml(p.status)}</td></tr>`).join("")}</tbody></table></div>`;
}

async function register(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const data = Object.fromEntries(form.entries());
  $("#form-error").textContent = "";
  try {
    await api("/api/participants", {
      method: "POST",
      body: JSON.stringify(data),
    });
    closeModal();
    toast("Inscripción guardada.");
    await refresh();
    show("participants");
  } catch (error) {
    $("#form-error").textContent = error.message;
  }
}

async function advance(id) {
  const participants = await api("/api/participants");
  const p = participants.participants.find((item) => item.id === Number(id));
  if (!p || p.stage >= 5) return;
  try {
    await api(`/api/participants/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ stage: p.stage + 1, status: "Activo" }),
    });
    toast(`${p.name} avanzó al módulo ${p.stage + 1}.`);
    closeEvidence();
    await refresh();
  } catch (error) {
    toast(error.message, true);
  }
}

async function saveEvidence(event) {
  event.preventDefault();
  if (!evidenceParticipant) return;
  const data = Object.fromEntries(new FormData(event.target).entries());
  try {
    await api(`/api/participants/${evidenceParticipant.id}/evidence`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    $("#evidence-form").reset();
    $("#evidence-error").textContent = "";
    toast("Evidencia guardada.");
    await loadEvidence();
    await refresh();
  } catch (error) {
    $("#evidence-error").textContent = error.message;
  }
}

async function decideParticipant(id, decision) {
  try {
    await api(`/api/participants/${id}/${decision}`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    toast(
      decision === "approve"
        ? "Participante aprobado."
        : "Participante rechazado.",
    );
    await refresh();
  } catch (error) {
    toast(error.message, true);
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ],
  );
}

document.querySelectorAll(".nav button").forEach((button) =>
  button.addEventListener("click", () => {
    if (phpHosting && button.dataset.view === "reports")
      window.location.href = "informes.php";
    else show(button.dataset.view);
  }),
);
document
  .querySelectorAll("[data-go]")
  .forEach((button) =>
    button.addEventListener("click", () => show(button.dataset.go)),
  );
[
  "#new-registration",
  "#new-registration-quick",
  "#new-registration-list",
].forEach((id) => {
  if ($(id))
    $(id).addEventListener("click", () => {
      window.location.href = "../#inscripcion";
    });
});
$("#close-modal").addEventListener("click", closeModal);
$("#cancel-modal").addEventListener("click", closeModal);
$("#registration-form").addEventListener("submit", register);
$("#login-form").addEventListener("submit", login);
$("#close-evidence").addEventListener("click", closeEvidence);
$("#cancel-evidence").addEventListener("click", closeEvidence);
$("#evidence-form").addEventListener("submit", saveEvidence);
$("#report-quick").addEventListener("click", () => {
  if (phpHosting) window.location.href = "informes.php";
  else show("reports");
});
$("#print-report").addEventListener("click", () => window.print());
$("#download-sql").addEventListener("click", () =>
  toast("La exportación SQL se hará desde phpMyAdmin en esta primera prueba."),
);
$("#participants-body").addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  if (target.dataset.action === "evidence") openEvidence(target.dataset.id);
  if (target.dataset.action === "advance") openEvidence(target.dataset.id);
  if (target.dataset.action === "approve")
    decideParticipant(target.dataset.id, "approve");
  if (target.dataset.action === "reject")
    decideParticipant(target.dataset.id, "reject");
});
$("#advance-from-evidence").addEventListener("click", () => {
  if (evidenceParticipant) advance(evidenceParticipant.id);
});
$("#participants-body").addEventListener("change", async (event) => {
  const input = event.target.closest('[data-field="attendance"]');
  if (!input) return;
  try {
    await api(`/api/participants/${input.dataset.id}`, {
      method: "PATCH",
      body: JSON.stringify({ attendance: Number(input.value) }),
    });
    toast("Asistencia actualizada.");
    await refresh();
  } catch (error) {
    toast(error.message, true);
  }
});
if (phpHosting) {
  showLogin();
  api("/api/me")
    .then((data) => {
      if (data.authenticated) {
        hideLogin();
        refresh();
      }
    })
    .catch(() => {});
} else {
  refresh();
}
