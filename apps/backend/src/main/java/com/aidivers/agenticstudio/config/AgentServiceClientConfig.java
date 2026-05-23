package com.aidivers.agenticstudio.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class AgentServiceClientConfig {

    @Value("${agent-service.url}")
    private String agentServiceUrl;

    @Bean
    public WebClient agentServiceWebClient() {
        return WebClient.builder()
                .baseUrl(agentServiceUrl)
                .build();
    }
}