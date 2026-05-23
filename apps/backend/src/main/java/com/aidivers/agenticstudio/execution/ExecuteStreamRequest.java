package com.aidivers.agenticstudio.execution;

import lombok.Data;

@Data
public class ExecuteStreamRequest {
    private String sessionId;
    private String message;
    private Metadata metadata;

    @Data
    public static class Metadata {
        private String domain;
    }
}
