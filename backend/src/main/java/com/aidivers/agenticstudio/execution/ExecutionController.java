package com.aidivers.agenticstudio.execution;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ExecutionController {

    private final AgentExecutionService executionService;
    private final AgentServiceClient agentServiceClient;

    @PostMapping(value = "/agents/{agentId}/execute/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> executeStream(@PathVariable UUID agentId,

                                                       @RequestParam(required = false) UUID sessionId,
                                                       @RequestBody AgentExecutionRequest request) {


        AgentExecution execution = executionService.start(agentId, sessionId);

        request.setExecutionId(execution.getId().toString());

        if (request.getMaxSteps() == 0) {
            request.setMaxSteps(10);
        }
        request.setStepCount(0);

        return agentServiceClient.streamAgentExecution(request)

                .doOnComplete(() -> executionService.complete(execution.getId()))

                .doOnError(error -> executionService.fail(execution.getId(), error.getMessage()));
    }
}