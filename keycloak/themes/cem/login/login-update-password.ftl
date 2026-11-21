<#import "template.ftl" as layout>
<#assign hasError = (messagesPerField.existsError('password','password-confirm'))!false>
<@layout.layout active="update-password" showTitle=true; section>
    <#if section = "title">Modifier le mot de passe
    <#elseif section = "header">Nouveau mot de passe
    <#elseif section = "subtitle">
        <p class="cem-auth-subtitle">
            Choisissez un nouveau mot de passe sécurisé pour accéder à votre compte.
        </p>
    <#elseif section = "form">
    <form class="cem-auth-form" action="${url.loginAction}" method="post">
        <@layout.passwordField id="password-new" name="password-new" label="Nouveau mot de passe" autocomplete="new-password" autofocus=true invalid=hasError />
        <@layout.passwordField id="password-confirm" name="password-confirm" label="Confirmer le mot de passe" autocomplete="new-password" invalid=hasError />

        <div class="cem-auth-actions">
            <#if isAppInitiatedAction??>
                <button class="cem-auth-secondary" name="cancel-aia" type="submit" value="true" formnovalidate>
                    Annuler
                </button>
            </#if>
            <button class="cem-auth-submit" type="submit" data-submit-label="Enregistrement…">
                Modifier le mot de passe
            </button>
        </div>
    </form>
    </#if>
</@layout.layout>
