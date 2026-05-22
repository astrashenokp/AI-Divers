package com.aidivers.agenticstudio.tools;

import java.time.Instant;
import java.util.UUID;

@lombok.Data
@lombok.Builder
public class AgentToolResponse {

    private UUID id;
    private UUID agentId;
    private String type;
    private String name;
    private String configJson;
    private boolean enabled;
    private Instant createdAt;
}