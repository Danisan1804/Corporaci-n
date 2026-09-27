const form = document.querySelector("#registration-form");
const message = document.querySelector("#form-message");
const menu = document.querySelector(".menu");
const nav = document.querySelector("#main-nav");

menu?.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  menu.setAttribute("aria-expanded", String(open));
});

nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    menu?.setAttribute("aria-expanded", "false");
  });
});

const revealItems = document.querySelectorAll(".section, .impact-strip, .cards article, .steps div");
if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  revealItems.forEach((item) => item.classList.add("reveal"));
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => observer.observe(item));
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.className = "message";
  message.textContent = "Enviando solicitud...";
  const data = Object.fromEntries(new FormData(form));
  try {
    const response = await fetch("admin/api.php?route=participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "No se pudo enviar la solicitud.");
    message.textContent =
      "Solicitud enviada correctamente. Quedó en revisión por el equipo de LEL.";
    form.reset();
  } catch (error) {
    message.className = "message error";
    message.textContent = error.message;
  }
});
