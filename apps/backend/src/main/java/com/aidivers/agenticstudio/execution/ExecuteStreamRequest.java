package com.aidivers.agenticstudio.execution;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class ExecuteStreamRequest {
    private String sessionId;
    private String message;
    private Metadata metadata;

    @Data
    public static class Metadata {
        private String domain;

        @JsonAlias("use_case")
        private String useCase;
    }
}
