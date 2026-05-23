package com.aidivers.agenticstudio.sessions;

import java.time.Instant;
import java.util.UUID;

@lombok.Data
@lombok.Builder
public class MessageResponse {

    private UUID id;
    private UUID sessionId;
    private MessageRole role;
    private String content;
    private Instant createdAt;
}