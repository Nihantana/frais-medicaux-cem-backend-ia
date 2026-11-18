<#import "template.ftl" as layout>
<@layout.layout active="error" showTitle=true; section>
    <#if section = "title">Erreur de connexion
    <#elseif section = "header">Impossible de continuer
    <#elseif section = "form">
        <p class="cem-auth-description">
            <#if messageSummary??>
                ${kcSanitize(messageSummary)?no_esc}
            <#else>
                Une erreur est survenue lors de la connexion. Vérifiez les informations puis réessayez.
            </#if>
        </p>
        <#if client?? && client.baseUrl?has_content>
            <a class="cem-auth-submit cem-auth-secondary" href="${client.baseUrl}">
                Retour à l’application
            </a>
        <#else>
            <a class="cem-auth-submit cem-auth-secondary" href="${url.loginUrl}">
                Retour à la connexion
            </a>
        </#if>
    </#if>
</@layout.layout>
