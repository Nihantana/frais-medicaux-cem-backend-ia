document.addEventListener("DOMContentLoaded", () => {
  // Afficher / masquer le mot de passe
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
      input.focus();
    });
  });

  // Efface l'état d'erreur dès que l'utilisateur modifie un champ
  document.querySelectorAll('input[aria-invalid="true"]').forEach((input) => {
    input.addEventListener("input", () => {
      document
        .querySelectorAll('input[aria-invalid="true"]')
        .forEach((el) => el.removeAttribute("aria-invalid"));
    });
  });

  // Évite le double envoi et donne un retour visuel pendant la connexion
  document.querySelectorAll("form.cem-auth-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      const submitter = event.submitter;
      if (
        !(submitter instanceof HTMLButtonElement) ||
        !submitter.hasAttribute("data-submit-label")
      ) {
        return;
      }
      // Laisse le navigateur construire les données avant de désactiver le bouton
      setTimeout(() => {
        submitter.dataset.originalLabel = submitter.textContent.trim();
        submitter.textContent = submitter.getAttribute("data-submit-label");
        submitter.disabled = true;
      }, 0);
    });
  });

  // Retour arrière du navigateur : réactive le bouton
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    document.querySelectorAll("[data-submit-label][disabled]").forEach((btn) => {
      btn.disabled = false;
      if (btn.dataset.originalLabel) btn.textContent = btn.dataset.originalLabel;
    });
  });
});
