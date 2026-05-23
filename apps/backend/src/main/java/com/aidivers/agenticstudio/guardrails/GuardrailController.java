package com.aidivers.agenticstudio.guardrails;

import com.aidivers.agenticstudio.agents.AgentService;
import com.aidivers.agenticstudio.auth.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/agents")
@RequiredArgsConstructor
public class GuardrailController {

    private final GuardrailService guardrailService;
    private final AgentService agentService;

    @PutMapping("/{agentId}/guardrails")
    public GuardrailResponse updateGuardrails(
            @PathVariable UUID agentId,
            @Valid @RequestBody GuardrailRequest request,
            @AuthenticationPrincipal User currentUser) {

        // ownership validation
        agentService.getByIdForOwner(agentId, currentUser);

        Guardrail guardrail = guardrailService.findByAgentId(agentId)
                .orElse(new Guardrail());

        guardrail.setMaxSteps(request.getMaxSteps());
        guardrail.setForbiddenTopicsJson(request.getForbiddenTopics());
        guardrail.setHumanConfirmationToolsJson(
                request.getRequireHumanConfirmationForTools()
        );

        Guardrail saved = guardrailService.save(agentId, guardrail);

        return GuardrailResponse.builder()
                .id(saved.getId())
                .agentId(saved.getAgent().getId())
                .maxSteps(saved.getMaxSteps())
                .forbiddenTopics(saved.getForbiddenTopicsJson())
                .requireHumanConfirmationForTools(saved.getHumanConfirmationToolsJson())
                .createdAt(saved.getCreatedAt())
                .updatedAt(saved.getUpdatedAt())
                .build();
    }
}