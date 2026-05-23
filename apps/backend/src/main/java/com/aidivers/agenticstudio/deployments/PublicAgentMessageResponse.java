package com.aidivers.agenticstudio.deployments;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class PublicAgentMessageResponse {
    private UUID id;
    private UUID sessionId;
    private String role;
    private String content;
    private Instant createdAt;
}
