package com.aidivers.agenticstudio.deployments;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DeploymentSettingsRequest {

    // Slug може бути порожнім при першому створенні (тоді бекенд згенерує його сам),
    // але якщо його передають на оновлення, він не має бути порожнім.
    private String deploymentSlug;

    private boolean restEnabled;
    private boolean webhookEnabled;
    private boolean widgetEnabled;
    private boolean publicAccessEnabled;
}