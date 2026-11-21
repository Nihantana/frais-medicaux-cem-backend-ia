<#import "template.ftl" as layout>
<@layout.layout active="reset" showTitle=true; section>
    <#if section = "title">Réinitialisation du mot de passe
    <#elseif section = "header">Mot de passe oublié
    <#elseif section = "subtitle">
        <p class="cem-auth-subtitle">
            Indiquez votre adresse e-mail ou votre identifiant. Vous recevrez les instructions de réinitialisation.
        </p>
    <#elseif section = "form">
    <form class="cem-auth-form" action="${url.loginAction}" method="post">
        <div class="cem-auth-field">
            <div class="cem-auth-field__heading">
                <label for="username">Adresse e-mail ou identifiant</label>
            </div>
            <input id="username"
                   name="username"
                   type="text"
                   value="${(auth.attemptedUsername!'')}"
                   placeholder="prenom.nom@exemple.mg"
                   autocomplete="username"
                   autocapitalize="none"
                   spellcheck="false"
                   autofocus
                   required>
        </div>
        <button class="cem-auth-submit" type="submit" data-submit-label="Envoi en cours…">
            Envoyer les instructions
        </button>
        <a class="cem-auth-secondary" href="${url.loginUrl}">
            <svg class="cem-auth-secondary__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
            Retour à la connexion
        </a>
    </form>
    </#if>
</@layout.layout>
