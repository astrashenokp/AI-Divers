package com.aidivers.agenticstudio.tools;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ToolCategoryResponse {
    private String id;
    private String label;
    private String description;
    private List<ToolTemplateResponse> tools;
}
