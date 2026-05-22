package com.aidivers.agenticstudio.guardrails;

import com.aidivers.agenticstudio.tools.ToolType;
import jakarta.validation.constraints.Min;
import java.util.List;

@lombok.Data
public class GuardrailRequest {

    @Min(1)
    private int maxSteps;

    private List<String> forbiddenTopics;

    private List<ToolType> requireHumanConfirmationForTools;
}