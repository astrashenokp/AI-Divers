package com.aidivers.agenticstudio.agents;

import com.aidivers.agenticstudio.deployments.DeploymentSettingsResponse;
import com.aidivers.agenticstudio.guardrails.GuardrailResponse;
import com.aidivers.agenticstudio.tools.AgentToolResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentResponse {

    private UUID id;
    private String name;
    private String description;
    private String systemPrompt;
    private String modelProvider;
    private String modelName;
    private String status;
    private List<AgentToolResponse> tools;
    private GuardrailResponse guardrails;
    private DeploymentSettingsResponse deployment;
    private Instant createdAt;
    private Instant updatedAt;

    public static AgentResponse from(Agent agent) {
        return AgentResponse.builder()
                .id(agent.getId())
                .name(agent.getName())
                .description(agent.getDescription())
                .systemPrompt(agent.getSystemPrompt())
                .modelProvider(agent.getModelProvider())
                .modelName(agent.getModelName())
                .status("draft")
                .tools(Collections.emptyList())
                .guardrails(GuardrailResponse.builder()
                        .agentId(agent.getId())
                        .maxSteps(10)
                        .forbiddenTopics(Collections.emptyList())
                        .requireHumanConfirmationForTools(Collections.emptyList())
                        .build())
                .deployment(DeploymentSettingsResponse.builder()
                        .agentId(agent.getId())
                        .deploymentSlug("")
                        .restEnabled(false)
                        .webhookEnabled(false)
                        .widgetEnabled(false)
                        .publicAccessEnabled(false)
                        .build())
                .createdAt(agent.getCreatedAt())
                .updatedAt(agent.getUpdatedAt())
                .build();
    }
}
