package com.aidivers.agenticstudio.tools;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ToolTypesResponse {
    private List<ToolCategoryResponse> categories;
}
