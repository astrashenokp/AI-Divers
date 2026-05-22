package com.aidivers.agenticstudio.execution;

import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

@Component
public class AgentServiceClient {

    private final WebClient webClient;

    public AgentServiceClient(WebClient agentServiceWebClient) {
        this.webClient = agentServiceWebClient;
    }

    public Flux<String> streamAgentExecution(AgentExecutionRequest request) {
        return webClient.post()
                .uri("/internal/v1/agent/stream")
                .bodyValue(request)
                .retrieve()
                .bodyToFlux(String.class);
    }
}