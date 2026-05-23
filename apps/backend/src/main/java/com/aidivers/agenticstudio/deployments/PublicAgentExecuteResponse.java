package com.aidivers.agenticstudio.deployments;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class PublicAgentExecuteResponse {
    private UUID executionId;
    private UUID sessionId;
    private PublicAgentMessageResponse message;
}
