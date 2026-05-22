package com.aidivers.agenticstudio.deployments;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class DeploymentSettingsResponse {
    private UUID id;
    private UUID agentId;
    private String deploymentSlug;
    private boolean restEnabled;
    private boolean webhookEnabled;
    private boolean widgetEnabled;
    private boolean publicAccessEnabled;
    private Instant createdAt;
    private Instant updatedAt;
}