const form = document.querySelector("#login-form");
const message = document.querySelector("#login-message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "Validando acceso...";

  try {
    const response = await fetch("api.php?route=login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.error || "No se pudo iniciar sesión.");
    window.location.href = "solicitudes.php";
  } catch (error) {
    message.textContent = error.message;
  }
});
