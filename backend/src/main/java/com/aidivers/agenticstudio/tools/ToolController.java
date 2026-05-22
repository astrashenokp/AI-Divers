package com.aidivers.agenticstudio.tools;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class ToolController {

    @GetMapping("/tool-types")
    public List<ToolTypeResponse> getToolTypes() {
        return List.of(
                ToolTypeResponse.builder().type("web_search").name("Web Search").build(),
                ToolTypeResponse.builder().type("http_request").name("HTTP Request").build(),
                ToolTypeResponse.builder().type("database_query").name("Database Query").build()
        );
    }

    @PostMapping("/agents/{agentId}/tools")
    @ResponseStatus(HttpStatus.CREATED)
    public AgentToolResponse addTool(@PathVariable UUID agentId,
                                     @Valid @RequestBody AgentToolRequest request) {
        return AgentToolResponse.builder()
                .id(UUID.randomUUID())
                .agentId(agentId)
                .type(request.getType())
                .name(request.getName())
                .configJson(request.getConfigJson())
                .enabled(request.isEnabled())
                .createdAt(Instant.now())
                .build();
    }
}
// поки захарджкожена відповідь, потім підтягнути з AgentToolService