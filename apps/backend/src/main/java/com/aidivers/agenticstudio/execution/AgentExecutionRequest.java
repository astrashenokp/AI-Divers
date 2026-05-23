package com.aidivers.agenticstudio.execution;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@lombok.Data
@lombok.Builder
public class AgentExecutionRequest {

    private List<Map<String, String>> messages;
    private String domain;
    private String useCase;
    private String executionId;
    private int stepCount;
    private int maxSteps;
}