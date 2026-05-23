package com.aidivers.agenticstudio.deployments;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class WidgetConfigResponse {
    private String deploymentSlug;
    private String agentName;
    private String welcomeMessage;
    private String primaryColor;
    private List<String> allowedOrigins;
}
