package com.aidivers.agenticstudio.deployments;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DeploymentController {

    private final DeploymentSettingsService deploymentSettingsService;

    @PutMapping("/agents/{agentId}/deployment")
    public DeploymentSettingsResponse upsertDeploymentSettings(
            @PathVariable UUID agentId,
            @Valid @RequestBody DeploymentSettingsRequest request) {

        DeploymentSettings settings;

        try {
            // Спроба знайти існуючі налаштування
            settings = deploymentSettingsService.getByAgentId(agentId);
        } catch (EntityNotFoundException e) {
            // Якщо немає - створюємо нові
            settings = new DeploymentSettings();

            // Якщо slug не передали при першому збереженні - генеруємо унікальний
            if (request.getDeploymentSlug() == null || request.getDeploymentSlug().isBlank()) {
                String generatedSlug = generateUniqueSlug();
                settings.setDeploymentSlug(generatedSlug);
            } else {
                settings.setDeploymentSlug(request.getDeploymentSlug());
            }
        }

        // Якщо це оновлення і нам передали новий slug
        if (request.getDeploymentSlug() != null && !request.getDeploymentSlug().isBlank()) {
            settings.setDeploymentSlug(request.getDeploymentSlug());
        }

        settings.setRestEnabled(request.isRestEnabled());
        settings.setWebhookEnabled(request.isWebhookEnabled());
        settings.setWidgetEnabled(request.isWidgetEnabled());
        settings.setPublicAccessEnabled(request.isPublicAccessEnabled());

        DeploymentSettings savedSettings = deploymentSettingsService.save(agentId, settings);

        return mapToResponse(savedSettings);
    }


    private DeploymentSettingsResponse mapToResponse(DeploymentSettings settings) {
        return DeploymentSettingsResponse.builder()
                .id(settings.getId())
                .agentId(settings.getAgent().getId())
                .deploymentSlug(settings.getDeploymentSlug())
                .restEnabled(settings.isRestEnabled())
                .webhookEnabled(settings.isWebhookEnabled())
                .widgetEnabled(settings.isWidgetEnabled())
                .publicAccessEnabled(settings.isPublicAccessEnabled())
                .createdAt(settings.getCreatedAt())
                .updatedAt(settings.getUpdatedAt())
                .build();
    }

    private String generateUniqueSlug() {
        return "ag-" + UUID.randomUUID().toString().substring(0, 8);
    }
}