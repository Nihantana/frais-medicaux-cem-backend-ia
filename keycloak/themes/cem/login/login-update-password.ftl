<#import "template.ftl" as layout>
<@layout.layout active="update-password" showTitle=true; section>
    <#if section = "title">Modifier le mot de passe
    <#elseif section = "header">Définir un nouveau mot de passe
    <#elseif section = "form">
    <p class="cem-auth-description">
        Choisissez un nouveau mot de passe sécurisé pour accéder à votre compte.
    </p>
    <form class="cem-auth-form" action="${url.loginAction}" method="post">
        <div class="cem-auth-field">
            <label for="password-new">Nouveau mot de passe</label>
            <input id="password-new"
                   name="password-new"
                   type="password"
                   autocomplete="new-password"
                   autofocus
                   required>
        </div>
        <div class="cem-auth-field">
            <label for="password-confirm">Confirmer le mot de passe</label>
            <input id="password-confirm"
                   name="password-confirm"
                   type="password"
                   autocomplete="new-password"
                   required>
        </div>
        <div class="cem-auth-actions">
            <#if isAppInitiatedAction??>
                <button class="cem-auth-secondary" name="cancel-aia" type="submit" value="true">
                    Annuler
                </button>
            </#if>
            <button class="cem-auth-submit" type="submit">
                Modifier le mot de passe
            </button>
        </div>
    </form>
    </#if>
</@layout.layout>
