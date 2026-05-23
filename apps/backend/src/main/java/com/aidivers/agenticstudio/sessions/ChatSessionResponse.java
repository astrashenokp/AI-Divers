package com.aidivers.agenticstudio.sessions;

import java.time.Instant;
import java.util.UUID;

@lombok.Data
@lombok.Builder
public class ChatSessionResponse {

    private UUID id;
    private UUID agentId;
    private SessionSource source;
    private String title;
    private Instant createdAt;
    private Instant updatedAt;
}