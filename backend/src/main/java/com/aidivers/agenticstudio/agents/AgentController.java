package com.aidivers.agenticstudio.agents;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/agents")
@RequiredArgsConstructor
public class AgentController {

    private final AgentService agentService;

    @GetMapping
    public List<AgentResponse> list() {
        return agentService.findAll().stream()
                .map(AgentResponse::from)
                .toList();
    }

    @PostMapping
    public ResponseEntity<AgentResponse> create(@Valid @RequestBody AgentRequest request) {
        Agent agent = Agent.builder()
                .name(request.getName())
                .description(request.getDescription())
                .systemPrompt(request.getSystemPrompt())
                .modelProvider(request.getModelProvider())
                .modelName(request.getModelName())
                .build();

        Agent saved = agentService.save(agent);
        return ResponseEntity.status(HttpStatus.CREATED).body(AgentResponse.from(saved));
    }

    @PutMapping("/{agentId}")
    public ResponseEntity<AgentResponse> update(
            @PathVariable UUID agentId,
            @Valid @RequestBody AgentRequest request
    ) {
        Agent existing = agentService.getById(agentId);

        existing.setName(request.getName());
        existing.setDescription(request.getDescription());
        existing.setSystemPrompt(request.getSystemPrompt());
        existing.setModelProvider(request.getModelProvider());
        existing.setModelName(request.getModelName());

        Agent updated = agentService.save(existing);
        return ResponseEntity.ok(AgentResponse.from(updated));
    }

    @GetMapping("/{agentId}")
    public ResponseEntity<AgentResponse> get(@PathVariable UUID agentId) {
        return ResponseEntity.ok(AgentResponse.from(agentService.getById(agentId)));
    }
}
