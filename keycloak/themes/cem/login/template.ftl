<#macro layout active="" showTitle=true displayMessage=true displayInfo=false>
<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'fr'}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title><#nested "title"></title>
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
        <section class="cem-auth-brand" aria-label="Caisse d'Épargne de Madagascar">
            <div class="cem-auth-brand__inner">
                <img class="cem-auth-logo" src="${url.resourcesPath}/img/logo.jpg" alt="Caisse d'Épargne de Madagascar">
                <div class="cem-auth-brand__copy">
                    <p>Plateforme de gestion</p>
                    <h1>Frais médicaux CEM</h1>
                    <span>Suivi, contrôle et validation des prises en charge</span>
                </div>
            </div>
        </section>

        <section class="cem-auth-panel">
            <div class="cem-auth-card">
                <div class="cem-auth-card__header">
                    <img class="cem-auth-card__logo" src="${url.resourcesPath}/img/logo.jpg" alt="">
                    <#if showTitle>
                        <h2><#nested "header"></h2>
                    </#if>
                    <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                        <div class="cem-auth-alert cem-auth-alert--${message.type}" role="alert">
                            ${kcSanitize(message.summary)?no_esc}
                        </div>
                    </#if>
                </div>
                <#nested "form">
                <#if displayInfo>
                    <#nested "info">
                </#if>
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
