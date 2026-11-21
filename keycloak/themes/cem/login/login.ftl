<#import "template.ftl" as layout>
<#assign hasError = (messagesPerField.existsError('username','password'))!false>
<@layout.layout active="login" showTitle=true; section>
    <#if section = "title">Connexion
    <#elseif section = "header">Connexion à votre espace
    <#elseif section = "subtitle">
        <p class="cem-auth-subtitle">Entrez vos identifiants pour accéder à la plateforme.</p>
    <#elseif section = "form">
    <form id="kc-form-login" class="cem-auth-form" action="${url.loginAction}" method="post">
        <div class="cem-auth-field">
            <div class="cem-auth-field__heading">
                <label for="username">Adresse e-mail</label>
            </div>
            <input id="username"
                   name="username"
                   type="text"
                   value="${(login.username)!''}"
                   placeholder="prenom.nom@exemple.mg"
                   autocomplete="username"
                   autocapitalize="none"
                   spellcheck="false"
                   autofocus
                   <#if hasError>aria-invalid="true" aria-describedby="cem-auth-alert"</#if>
                   required>
        </div>

        <@layout.passwordField id="password" name="password" label="Mot de passe" autocomplete="current-password" invalid=hasError>
            <#if (realm.resetPasswordAllowed)!false>
                <a class="cem-auth-link" href="${url.loginResetCredentialsUrl}">Mot de passe oublié ?</a>
            </#if>
        </@layout.passwordField>

        <#if (realm.rememberMe)!false && !usernameHidden??>
            <label class="cem-auth-check">
                <input id="rememberMe" name="rememberMe" type="checkbox" <#if (login.rememberMe)??>checked</#if>>
                <span>Rester connecté sur cet appareil</span>
            </label>
        </#if>

        <button class="cem-auth-submit" type="submit" data-submit-label="Connexion en cours…">
            Se connecter
        </button>
    </form>
    </#if>
</@layout.layout>
