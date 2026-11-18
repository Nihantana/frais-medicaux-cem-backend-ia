<#import "template.ftl" as layout>
<@layout.layout active="reset" showTitle=true; section>
    <#if section = "title">Réinitialisation du mot de passe
    <#elseif section = "header">Mot de passe oublié
    <#elseif section = "form">
    <p class="cem-auth-description">
        Indiquez votre nom d’utilisateur ou votre adresse e-mail.
        Vous recevrez les instructions de réinitialisation.
    </p>
    <form class="cem-auth-form" action="${url.loginAction}" method="post">
        <div class="cem-auth-field">
            <label for="username">${msg("username")}</label>
            <input id="username"
                   name="username"
                   type="text"
                   value="${(auth.attemptedUsername!'')}"
                   autocomplete="username"
                   autofocus
                   required>
        </div>
        <button class="cem-auth-submit" type="submit">
            Envoyer les instructions
        </button>
        <a class="cem-auth-secondary" href="${url.loginUrl}">
            Retour à la connexion
        </a>
    </form>
    </#if>
</@layout.layout>
