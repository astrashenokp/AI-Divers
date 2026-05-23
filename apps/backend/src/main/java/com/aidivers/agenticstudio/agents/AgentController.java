package com.aidivers.agenticstudio.agents;

import com.aidivers.agenticstudio.auth.User;
import com.aidivers.agenticstudio.deployments.DeploymentSettings;
import com.aidivers.agenticstudio.deployments.DeploymentSettingsResponse;
import com.aidivers.agenticstudio.deployments.DeploymentSettingsService;
import com.aidivers.agenticstudio.guardrails.Guardrail;
import com.aidivers.agenticstudio.guardrails.GuardrailResponse;
import com.aidivers.agenticstudio.guardrails.GuardrailService;
import com.aidivers.agenticstudio.tools.AgentTool;
import com.aidivers.agenticstudio.tools.AgentToolResponse;
import com.aidivers.agenticstudio.tools.AgentToolService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/agents")
@RequiredArgsConstructor
public class AgentController {

    private final AgentService agentService;
    private final AgentToolService agentToolService;
    private final GuardrailService guardrailService;
    private final DeploymentSettingsService deploymentSettingsService;

    @GetMapping
    public List<AgentResponse> list(@AuthenticationPrincipal User currentUser) {
        return agentService.findAllByOwner(currentUser).stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping
    public ResponseEntity<AgentResponse> create(@Valid @RequestBody AgentRequest request,
                                                @AuthenticationPrincipal User currentUser) {
        Agent agent = Agent.builder()
                .name(request.getName())
                .description(request.getDescription())
                .systemPrompt(request.getSystemPrompt())
                .modelProvider(request.getModelProvider())
                .modelName(request.getModelName())
                .owner(currentUser)
                .build();

        Agent saved = agentService.save(agent);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(saved));
    }

    @PutMapping("/{agentId}")
    public ResponseEntity<AgentResponse> update(
            @PathVariable UUID agentId,
            @Valid @RequestBody AgentRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        Agent existing = agentService.getByIdForOwner(agentId, currentUser);

        existing.setName(request.getName());
        existing.setDescription(request.getDescription());
        existing.setSystemPrompt(request.getSystemPrompt());
        existing.setModelProvider(request.getModelProvider());
        existing.setModelName(request.getModelName());

        Agent updated = agentService.save(existing);
        return ResponseEntity.ok(toResponse(updated));
    }

    @GetMapping("/{agentId}")
    public ResponseEntity<AgentResponse> get(@PathVariable UUID agentId,
                                             @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(toResponse(agentService.getByIdForOwner(agentId, currentUser)));
    }

    private AgentResponse toResponse(Agent agent) {
        UUID agentId = agent.getId();

        return AgentResponse.builder()
                .id(agentId)
                .name(agent.getName())
                .description(agent.getDescription())
                .systemPrompt(agent.getSystemPrompt())
                .modelProvider(agent.getModelProvider())
                .modelName(agent.getModelName())
                .status("draft")
                .tools(agentToolService.findByAgentId(agentId).stream()
                        .map(tool -> toToolResponse(agentId, tool))
                        .toList())
                .guardrails(guardrailService.findByAgentId(agentId)
                        .map(guardrail -> toGuardrailResponse(agentId, guardrail))
                        .orElseGet(() -> defaultGuardrails(agentId)))
                .deployment(deploymentResponse(agentId))
                .createdAt(agent.getCreatedAt())
                .updatedAt(agent.getUpdatedAt())
                .build();
    }

    private AgentToolResponse toToolResponse(UUID agentId, AgentTool tool) {
        return AgentToolResponse.builder()
                .id(tool.getId())
                .agentId(agentId)
                .type(tool.getType().getId())
                .category(tool.getType().getCategory())
                .name(tool.getName())
                .config(tool.getConfigJson() == null ? Collections.emptyMap() : tool.getConfigJson())
                .enabled(tool.isEnabled())
                .createdAt(tool.getCreatedAt())
                .updatedAt(tool.getUpdatedAt())
                .build();
    }

    private GuardrailResponse toGuardrailResponse(UUID agentId, Guardrail guardrail) {
        return GuardrailResponse.builder()
                .id(guardrail.getId())
                .agentId(agentId)
                .maxSteps(guardrail.getMaxSteps())
                .forbiddenTopics(guardrail.getForbiddenTopicsJson() == null
                        ? Collections.emptyList()
                        : guardrail.getForbiddenTopicsJson())
                .requireHumanConfirmationForTools(guardrail.getHumanConfirmationToolsJson() == null
                        ? Collections.emptyList()
                        : guardrail.getHumanConfirmationToolsJson())
                .createdAt(guardrail.getCreatedAt())
                .updatedAt(guardrail.getUpdatedAt())
                .build();
    }

    private GuardrailResponse defaultGuardrails(UUID agentId) {
        return GuardrailResponse.builder()
                .agentId(agentId)
                .maxSteps(10)
                .forbiddenTopics(Collections.emptyList())
                .requireHumanConfirmationForTools(Collections.emptyList())
                .build();
    }

    private DeploymentSettingsResponse deploymentResponse(UUID agentId) {
        try {
            DeploymentSettings settings = deploymentSettingsService.getByAgentId(agentId);
            return DeploymentSettingsResponse.builder()
                    .id(settings.getId())
                    .agentId(agentId)
                    .deploymentSlug(settings.getDeploymentSlug())
                    .restEnabled(settings.isRestEnabled())
                    .webhookEnabled(settings.isWebhookEnabled())
                    .widgetEnabled(settings.isWidgetEnabled())
                    .publicAccessEnabled(settings.isPublicAccessEnabled())
                    .createdAt(settings.getCreatedAt())
                    .updatedAt(settings.getUpdatedAt())
                    .build();
        } catch (EntityNotFoundException ignored) {
            return DeploymentSettingsResponse.builder()
                    .agentId(agentId)
                    .deploymentSlug("")
                    .restEnabled(false)
                    .webhookEnabled(false)
                    .widgetEnabled(false)
                    .publicAccessEnabled(false)
                    .build();
        }
    }
}