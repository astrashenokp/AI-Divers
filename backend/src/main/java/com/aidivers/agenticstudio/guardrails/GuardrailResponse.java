package com.aidivers.agenticstudio.guardrails;

import com.aidivers.agenticstudio.tools.ToolType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@lombok.Data
@lombok.Builder
public class GuardrailResponse {

    private UUID id;
    private UUID agentId;
    private int maxSteps;
    private List<String> forbiddenTopics;
    private List<ToolType> requireHumanConfirmationForTools;
    private Instant createdAt;
    private Instant updatedAt;
}