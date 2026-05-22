package com.aidivers.agenticstudio.execution;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

@Component
public class AgentServiceClient {

    private final WebClient webClient;

    public AgentServiceClient(WebClient agentServiceWebClient) {
        this.webClient = agentServiceWebClient;
    }

    public Flux<ServerSentEvent<String>> streamAgentExecution(AgentExecutionRequest request) {
        ParameterizedTypeReference<ServerSentEvent<String>> typeRef = new ParameterizedTypeReference<>() {};

        return webClient.post()
                .uri("/internal/v1/agent/stream")
                .bodyValue(request)
                .retrieve()
                .bodyToFlux(typeRef);
    }
}