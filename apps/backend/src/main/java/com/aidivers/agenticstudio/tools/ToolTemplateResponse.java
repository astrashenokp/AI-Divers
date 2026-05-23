package com.aidivers.agenticstudio.tools;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class ToolTemplateResponse {
    private String type;
    private String name;
    private String description;
    private String category;
    private boolean requiresHumanConfirmation;
    private Map<String, Object> configSchema;
}
