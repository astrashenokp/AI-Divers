package com.aidivers.agenticstudio.tools;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ToolController {

    private final AgentToolService agentToolService;
    private final ObjectMapper objectMapper;

    @GetMapping("/tool-types")
    public List<ToolTypeResponse> getToolTypes() {
        return Arrays.stream(ToolType.values())
                .map(type -> ToolTypeResponse.builder()
                        .type(type.name())
                        .name(type.name)
                        .build())
                .collect(Collectors.toList());
    }

    @PostMapping("/agents/{agentId}/tools")
    @ResponseStatus(HttpStatus.CREATED)
    public AgentToolResponse addTool(@PathVariable UUID agentId,
                                     @Valid @RequestBody AgentToolRequest request) {
        try {
            AgentTool tool = new AgentTool();
            tool.setType(ToolType.valueOf(request.getType().toUpperCase()));
            tool.setName(request.getName());
            tool.setEnabled(request.isEnabled());

            if (request.getConfigJson() != null && !request.getConfigJson().isBlank()) {
                Map<String, Object> configMap = objectMapper.readValue(
                        request.getConfigJson(),
                        new TypeReference<Map<String, Object>>() {}
                );
                tool.setConfigJson(configMap);
            }

            AgentTool savedTool = agentToolService.save(agentId, tool);

            String responseConfig = null;
            if (savedTool.getConfigJson() != null) {
                responseConfig = objectMapper.writeValueAsString(savedTool.getConfigJson());
            }

            return AgentToolResponse.builder()
                    .id(savedTool.getId())
                    .agentId(savedTool.getAgent().getId())
                    .type(savedTool.getType().name())
                    .name(savedTool.getName())
                    .configJson(responseConfig)
                    .enabled(savedTool.isEnabled())
                    .createdAt(savedTool.getCreatedAt())
                    .build();

        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Невідомий тип інструмента: " + request.getType());
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Помилка формату configJson. Очікується валідний JSON.");
        }
    }
}