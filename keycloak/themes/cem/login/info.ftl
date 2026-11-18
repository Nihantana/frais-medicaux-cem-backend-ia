<#import "template.ftl" as layout>
<@layout.layout active="info" showTitle=true; section>
    <#if section = "title">${msg("accountUpdatedTitle")}
    <#elseif section = "header">${msg("accountUpdatedTitle")}
    <#elseif section = "form">
        <p class="cem-auth-description">
            ${kcSanitize(messageHeader)?no_esc}
        </p>
        <#if requiredActions??>
            <form class="cem-auth-form" action="${url.loginAction}" method="post">
                <#list requiredActions as action>
                    <button class="cem-auth-submit" type="submit" name="requiredAction" value="${action}">
                        Continuer
                    </button>
                </#list>
            </form>
        <#else>
            <a class="cem-auth-submit cem-auth-secondary" href="${url.loginUrl}">
                Retour à la connexion
            </a>
        </#if>
    </#if>
</@layout.layout>
