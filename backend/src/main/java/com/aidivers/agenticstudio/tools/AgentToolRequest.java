package com.aidivers.agenticstudio.tools;

import jakarta.validation.constraints.NotBlank;

@lombok.Data
public class AgentToolRequest {

    @NotBlank
    private String type;

    @NotBlank
    private String name;

    private String configJson;

    private boolean enabled;
}