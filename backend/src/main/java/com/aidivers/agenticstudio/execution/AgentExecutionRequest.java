package com.aidivers.agenticstudio.execution;

import java.util.UUID;

@lombok.Data
@lombok.Builder
public class AgentExecutionRequest {

    private UUID agentId;
    private UUID sessionId;
    private String userMessage;
    private String systemPrompt;
    private String modelProvider;
    private String modelName;
    private int maxSteps;
}

//узгодити, поки домисли