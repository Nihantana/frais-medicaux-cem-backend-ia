<#--
  Champ mot de passe avec bouton afficher/masquer.
  Usage : <@layout.passwordField id="password" name="password" label="Mot de passe" autocomplete="current-password" />
-->
<#macro passwordField id name label autocomplete="current-password" autofocus=false invalid=false>
    <div class="cem-auth-field">
        <div class="cem-auth-field__heading">
            <label for="${id}">${label}</label>
            <#nested>
        </div>
        <div class="cem-auth-password">
            <input id="${id}"
                   name="${name}"
                   type="password"
                   autocomplete="${autocomplete}"
                   <#if autofocus>autofocus</#if>
                   <#if invalid>aria-invalid="true" aria-describedby="cem-auth-alert"</#if>
                   required>
            <button type="button"
                    class="cem-auth-password__toggle"
                    data-password-toggle
                    aria-label="Afficher le mot de passe"
                    aria-controls="${id}"
                    aria-pressed="false">
                <svg class="icon-eye" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg class="icon-eye-off" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 3l18 18"/>
                    <path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a16.6 16.6 0 0 1-3.2 3.9M6.6 7.6A16.5 16.5 0 0 0 2.5 12S6 18 12 18a9.7 9.7 0 0 0 4.2-.9"/>
                    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>
                </svg>
            </button>
        </div>
    </div>
</#macro>

<#macro layout active="" showTitle=true displayMessage=true displayInfo=false>
<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'fr'}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <meta name="color-scheme" content="light">
    <title><#nested "title"> · Frais médicaux CEM</title>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet">
        </#list>
    </#if>
    <#if properties.scripts?has_content>
        <#list properties.scripts?split(' ') as script>
            <script src="${url.resourcesPath}/${script}" defer></script>
        </#list>
    </#if>
</head>
<body>
    <main class="cem-auth-shell">
        <section class="cem-auth-brand" aria-label="Frais médicaux CEM">
            <div class="cem-auth-brand__inner">
                <p class="cem-auth-brand__eyebrow">Plateforme de gestion</p>
                <h1>Frais médicaux <br>CEM</h1>
                <p class="cem-auth-brand__lead">
                    Un espace unique pour piloter les prises en charge, de la demande jusqu’à la validation.
                </p>
                <ul class="cem-auth-points">
                    <li>
                        <span class="cem-auth-points__icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>
                        </span>
                        Suivi des dossiers en temps réel
                    </li>
                    <li>
                        <span class="cem-auth-points__icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>
                        </span>
                        Contrôle et traçabilité
                    </li>
                    <li>
                        <span class="cem-auth-points__icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/></svg>
                        </span>
                        Validation des prises en charge
                    </li>
                </ul>
            </div>
        </section>

        <section class="cem-auth-panel">
            <div class="cem-auth-card">
                <div class="cem-auth-card__header">
                    <img class="cem-auth-card__logo" src="${url.resourcesPath}/img/logo.png" alt="Caisse d'Épargne de Madagascar">
                    <#if showTitle>
                        <h2><#nested "header"></h2>
                    </#if>
                    <#nested "subtitle">
                </div>

                <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                    <div id="cem-auth-alert" class="cem-auth-alert cem-auth-alert--${message.type}" role="alert">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <#if message.type = 'success'>
                                <circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>
                            <#elseif message.type = 'info'>
                                <circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/>
                            <#else>
                                <circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>
                            </#if>
                        </svg>
                        <div>${kcSanitize(message.summary)?no_esc}</div>
                    </div>
                </#if>

                <#nested "form">
                <#if displayInfo>
                    <#nested "info">
                </#if>

                <p class="cem-auth-help">
                    Un problème de connexion ? Contactez l’administrateur.
                </p>
            </div>
            <p class="cem-auth-footer">Caisse d'Épargne de Madagascar</p>
        </section>
    </main>
</body>
</html>
</#macro>

<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false showAnotherWayIfPresent=true>
    <@layout active="" showTitle=true displayMessage=displayMessage displayInfo=displayInfo>
        <#nested>
    </@layout>
</#macro>
