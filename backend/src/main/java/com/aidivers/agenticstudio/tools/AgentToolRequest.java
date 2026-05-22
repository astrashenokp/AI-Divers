package com.aidivers.agenticstudio.tools;

import jakarta.validation.constraints.NotBlank;

import java.util.Map;

@lombok.Data
public class AgentToolRequest {

    @NotBlank
    private String type;

    @NotBlank
    private String name;

    private String configJson;

    private Map<String, Object> config;

    private boolean enabled;
}
