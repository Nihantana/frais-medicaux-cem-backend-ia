document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(
        button.getAttribute("aria-controls") || "",
      );
      if (!(input instanceof HTMLInputElement)) return;
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      button.setAttribute("aria-pressed", visible ? "false" : "true");
      button.setAttribute(
        "aria-label",
        visible ? "Afficher le mot de passe" : "Masquer le mot de passe",
      );
    });
  });
});
