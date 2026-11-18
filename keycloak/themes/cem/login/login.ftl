<#import "template.ftl" as layout>
<@layout.layout active="login" showTitle=true; section>
    <#if section = "title">Connexion
    <#elseif section = "header">Connexion à votre espace
    <#elseif section = "form">
    <form id="kc-form-login" class="cem-auth-form" action="${url.loginAction}" method="post">
        <div class="cem-auth-field">
            <label for="username">${msg("username")}</label>
            <input id="username"
                   name="username"
                   type="text"
                   value="${(login.username)!''}"
                   autocomplete="username"
                   autofocus
                   required>
        </div>

        <div class="cem-auth-field">
            <div class="cem-auth-field__heading">
                <label for="password">${msg("password")}</label>
                <#if (realm.resetPasswordAllowed)!false>
                    <a class="cem-auth-link" href="${url.loginResetCredentialsUrl}">
                        Mot de passe oublié ?
                    </a>
                </#if>
            </div>
            <div class="cem-auth-password">
                <input id="password"
                       name="password"
                       type="password"
                       autocomplete="current-password"
                       required>
                <button type="button"
                        class="cem-auth-password__toggle"
                        data-password-toggle
                        aria-label="Afficher le mot de passe"
                        aria-controls="password"
                        aria-pressed="false">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z"/>
                        <circle cx="12" cy="12" r="2.5"/>
                    </svg>
                </button>
            </div>
        </div>

        <#if (realm.rememberMe)!false && !usernameHidden??>
            <label class="cem-auth-check">
                <input id="rememberMe" name="rememberMe" type="checkbox" <#if (login.rememberMe)??>checked</#if>>
                <span>${msg("rememberMe")}</span>
            </label>
        </#if>

        <button class="cem-auth-submit" type="submit">
            Se connecter
        </button>
    </form>
    </#if>
</@layout.layout>
