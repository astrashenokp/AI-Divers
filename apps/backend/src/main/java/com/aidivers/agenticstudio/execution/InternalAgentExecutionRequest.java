package com.aidivers.agenticstudio.execution;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class InternalAgentExecutionRequest {
    private String executionId;
    private String message;
    private String sessionId;
    private String domain;
    private String use_case;
    private int max_steps;
    private String system_prompt;
    private List<String> tools;
    private Map<String, Object> guardrails;
    private List<Map<String, String>> messages;
    private String model_provider;
    private String model_name;
    private Map<String, Object> metadata;
}
