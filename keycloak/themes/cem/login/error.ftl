<#import "template.ftl" as layout>
<@layout.layout active="error" showTitle=true displayMessage=false; section>
    <#if section = "title">Erreur de connexion
    <#elseif section = "header">Impossible de continuer
    <#elseif section = "form">
        <div class="cem-auth-alert cem-auth-alert--error" role="alert">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/></svg>
            <div>
                <#if message?has_content>
                    ${kcSanitize(message.summary)?no_esc}
                <#elseif messageSummary??>
                    ${kcSanitize(messageSummary)?no_esc}
                <#else>
                    Une erreur est survenue lors de la connexion. Vérifiez les informations puis réessayez.
                </#if>
            </div>
        </div>
        <#if client?? && client.baseUrl?has_content>
            <a class="cem-auth-submit cem-auth-submit--link" href="${client.baseUrl}">
                Retour à l’application
            </a>
        <#else>
            <a class="cem-auth-submit cem-auth-submit--link" href="${url.loginUrl}">
                Retour à la connexion
            </a>
        </#if>
    </#if>
</@layout.layout>
