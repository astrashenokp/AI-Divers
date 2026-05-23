package com.aidivers.agenticstudio.deployments;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Map;

@Data
public class PublicAgentExecuteRequest {

    private String sessionId;

    @NotBlank
    private String message;

    private Map<String, Object> metadata;
}
