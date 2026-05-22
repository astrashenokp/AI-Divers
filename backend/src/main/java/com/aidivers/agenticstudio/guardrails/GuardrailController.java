package com.aidivers.agenticstudio.guardrails;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/agents")
@RequiredArgsConstructor
public class GuardrailController {

    private final GuardrailService guardrailService;

    @PutMapping("/{agentId}/guardrails")
    public GuardrailResponse updateGuardrails(@PathVariable UUID agentId,
                                              @Valid @RequestBody GuardrailRequest request) {
        Guardrail guardrail = guardrailService.findByAgentId(agentId)
                .orElse(new Guardrail());

        guardrail.setMaxSteps(request.getMaxSteps());
        guardrail.setForbiddenTopicsJson(request.getForbiddenTopics());
        guardrail.setHumanConfirmationToolsJson(request.getRequireHumanConfirmationForTools());

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