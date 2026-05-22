package com.aidivers.agenticstudio.agents;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 255, message = "Name must be 255 characters or fewer")
    private String name;

    @Size(max = 1000, message = "Description must be 1000 characters or fewer")
    private String description;

    @NotBlank(message = "System prompt is required")
    private String systemPrompt;

    @NotBlank(message = "Model provider is required")
    private String modelProvider;

    @NotBlank(message = "Model name is required")
    private String modelName;
}