package com.aidivers.agenticstudio.deployments;

import com.aidivers.agenticstudio.agents.Agent;
import com.aidivers.agenticstudio.execution.AgentExecution;
import com.aidivers.agenticstudio.execution.AgentExecutionService;
import com.aidivers.agenticstudio.execution.AgentServiceClient;
import com.aidivers.agenticstudio.execution.InternalAgentExecutionRequest;
import com.aidivers.agenticstudio.guardrails.Guardrail;
import com.aidivers.agenticstudio.guardrails.GuardrailService;
import com.aidivers.agenticstudio.sessions.*;
import com.aidivers.agenticstudio.tools.AgentTool;
import com.aidivers.agenticstudio.tools.AgentToolService;
import com.aidivers.agenticstudio.tools.ToolType;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DeploymentController {

    private final DeploymentSettingsService deploymentSettingsService;
    private final ChatSessionService chatSessionService;
    private final MessageService messageService;
    private final AgentExecutionService executionService;
    private final AgentServiceClient agentServiceClient;
    private final AgentToolService agentToolService;
    private final GuardrailService guardrailService;
    private final ObjectMapper objectMapper;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @PostMapping("/agents/{agentId}/deployment/generate")
    @ResponseStatus(HttpStatus.CREATED)
    public DeploymentSettingsResponse generateRestDeployment(@PathVariable UUID agentId) {
        DeploymentSettings settings;

        try {
            settings = deploymentSettingsService.getByAgentId(agentId);
        } catch (EntityNotFoundException e) {
            settings = new DeploymentSettings();
            settings.setDeploymentSlug(generateUniqueSlug());
            settings.setWebhookEnabled(false);
            settings.setWidgetEnabled(false);
        }

        if (settings.getDeploymentSlug() == null || settings.getDeploymentSlug().isBlank()) {
            settings.setDeploymentSlug(generateUniqueSlug());
        }

        settings.setRestEnabled(true);
        settings.setPublicAccessEnabled(true);

        return mapToResponse(deploymentSettingsService.save(agentId, settings));
    }

    @PutMapping("/agents/{agentId}/deployment")
    public DeploymentSettingsResponse upsertDeploymentSettings(
            @PathVariable UUID agentId,
            @Valid @RequestBody DeploymentSettingsRequest request) {

        DeploymentSettings settings;

        try {
            // Спроба знайти існуючі налаштування
            settings = deploymentSettingsService.getByAgentId(agentId);
        } catch (EntityNotFoundException e) {
            // Якщо немає - створюємо нові
            settings = new DeploymentSettings();

            // Якщо slug не передали при першому збереженні - генеруємо унікальний
            if (request.getDeploymentSlug() == null || request.getDeploymentSlug().isBlank()) {
                String generatedSlug = generateUniqueSlug();
                settings.setDeploymentSlug(generatedSlug);
            } else {
                settings.setDeploymentSlug(request.getDeploymentSlug());
            }
        }

        // Якщо це оновлення і нам передали новий slug
        if (request.getDeploymentSlug() != null && !request.getDeploymentSlug().isBlank()) {
            settings.setDeploymentSlug(request.getDeploymentSlug());
        }

        settings.setRestEnabled(request.isRestEnabled());
        settings.setWebhookEnabled(request.isWebhookEnabled());
        settings.setWidgetEnabled(request.isWidgetEnabled());
        settings.setPublicAccessEnabled(request.isPublicAccessEnabled());

        DeploymentSettings savedSettings = deploymentSettingsService.save(agentId, settings);

        return mapToResponse(savedSettings);
    }

    @GetMapping("/public/widgets/{deploymentSlug}/config")
    public WidgetConfigResponse getWidgetConfig(@PathVariable String deploymentSlug) {
        DeploymentSettings settings;

        try {
            settings = deploymentSettingsService.getByDeploymentSlug(deploymentSlug);
        } catch (EntityNotFoundException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Widget deployment not found");
        }

        if (!settings.isPublicAccessEnabled() || !settings.isWidgetEnabled()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Widget deployment is not enabled");
        }

        return WidgetConfigResponse.builder()
                .deploymentSlug(settings.getDeploymentSlug())
                .agentName(settings.getAgent().getName())
                .welcomeMessage("Вітаю! Чим можу допомогти?")
                .primaryColor("#2563eb")
                .allowedOrigins(List.of(frontendUrl))
                .build();
    }

    @PostMapping("/public/agents/{deploymentSlug}/execute")
    public PublicAgentExecuteResponse executePublicAgent(
            @PathVariable String deploymentSlug,
            @Valid @RequestBody PublicAgentExecuteRequest request) {

        DeploymentSettings settings = getPublicDeployment(deploymentSlug, true, false);
        return executePublicRequest(settings, request, SessionSource.REST_API);
    }

    @PostMapping("/public/widgets/{deploymentSlug}/chat")
    public PublicAgentExecuteResponse executePublicWidgetChat(
            @PathVariable String deploymentSlug,
            @Valid @RequestBody PublicAgentExecuteRequest request) {

        DeploymentSettings settings = getPublicDeployment(deploymentSlug, false, false);
        if (!settings.isWidgetEnabled()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Widget deployment is not enabled");
        }
        return executePublicRequest(settings, request, SessionSource.WIDGET);
    }

    private PublicAgentExecuteResponse executePublicRequest(DeploymentSettings settings,
                                                            PublicAgentExecuteRequest request,
                                                            SessionSource source) {
        Agent agent = settings.getAgent();
        ChatSession session = resolvePublicSession(agent.getId(), request.getSessionId(), source);

        messageService.save(session.getId(), MessageRole.USER, request.getMessage());

        AgentExecution execution = executionService.start(agent.getId(), session.getId());
        InternalAgentExecutionRequest pythonRequest = buildInternalRequest(execution.getId(), agent, session, request);
        AtomicReference<String> finalMessage = new AtomicReference<>();
        AtomicReference<String> streamError = new AtomicReference<>();

        try {
            agentServiceClient.streamAgentExecution(pythonRequest)
                    .doOnNext(event -> processPublicEvent(event, finalMessage, streamError))
                    .blockLast();
        } catch (Exception e) {
            executionService.fail(execution.getId(), e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Agent runtime is unavailable");
        }

        if (streamError.get() != null) {
            executionService.fail(execution.getId(), streamError.get());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, streamError.get());
        }

        String answer = finalMessage.get();
        if (answer == null || answer.isBlank()) {
            executionService.fail(execution.getId(), "Agent runtime returned empty response");
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Agent runtime returned empty response");
        }

        Message assistantMessage = messageService.save(session.getId(), MessageRole.ASSISTANT, answer);
        executionService.complete(execution.getId());

        return PublicAgentExecuteResponse.builder()
                .executionId(execution.getId())
                .sessionId(session.getId())
                .message(toPublicMessage(assistantMessage))
                .build();
    }


    private DeploymentSettingsResponse mapToResponse(DeploymentSettings settings) {
        return DeploymentSettingsResponse.builder()
                .id(settings.getId())
                .agentId(settings.getAgent().getId())
                .deploymentSlug(settings.getDeploymentSlug())
                .restEnabled(settings.isRestEnabled())
                .webhookEnabled(settings.isWebhookEnabled())
                .widgetEnabled(settings.isWidgetEnabled())
                .publicAccessEnabled(settings.isPublicAccessEnabled())
                .createdAt(settings.getCreatedAt())
                .updatedAt(settings.getUpdatedAt())
                .build();
    }

    private String generateUniqueSlug() {
        String slug;
        do {
            slug = "ag-" + UUID.randomUUID().toString().substring(0, 8);
        } while (deploymentSettingsService.slugExists(slug));
        return slug;
    }

    private DeploymentSettings getPublicDeployment(String deploymentSlug, boolean requireRest, boolean requireWebhook) {
        DeploymentSettings settings;

        try {
            settings = deploymentSettingsService.getByDeploymentSlug(deploymentSlug);
        } catch (EntityNotFoundException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Deployment not found");
        }

        if (!settings.isPublicAccessEnabled()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Deployment is not enabled");
        }
        if (requireRest && !settings.isRestEnabled()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "REST deployment is not enabled");
        }
        if (requireWebhook && !settings.isWebhookEnabled()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Webhook deployment is not enabled");
        }
        return settings;
    }

    private ChatSession resolvePublicSession(UUID agentId, String sessionId, SessionSource source) {
        UUID parsedSessionId = parseSessionId(sessionId);
        if (parsedSessionId == null) {
            return chatSessionService.create(agentId, source, "Public chat");
        }

        ChatSession session = chatSessionService.getById(parsedSessionId);
        if (!session.getAgent().getId().equals(agentId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found for deployment");
        }
        return session;
    }

    private InternalAgentExecutionRequest buildInternalRequest(UUID executionId,
                                                               Agent agent,
                                                               ChatSession session,
                                                               PublicAgentExecuteRequest request) {
        List<AgentTool> tools = agentToolService.findEnabledByAgentId(agent.getId());
        Guardrail guardrail = guardrailService.findByAgentId(agent.getId()).orElse(null);
        String effectiveDomain = resolveDomain(readString(request.getMetadata(), "domain"));
        String effectiveUseCase = resolveUseCase(effectiveDomain, readString(request.getMetadata(), "useCase", "use_case"));
        int effectiveMaxSteps = effectiveMaxSteps(guardrail, effectiveDomain);

        return InternalAgentExecutionRequest.builder()
                .executionId(executionId.toString())
                .message(request.getMessage())
                .sessionId(session.getId().toString())
                .domain(effectiveDomain)
                .use_case(effectiveUseCase)
                .max_steps(effectiveMaxSteps)
                .system_prompt(agent.getSystemPrompt())
                .tools(tools.stream()
                        .map(tool -> tool.getType().getId())
                        .toList())
                .guardrails(toGuardrailsMap(guardrail, effectiveMaxSteps))
                .messages(toPythonMessages(session))
                .model_provider(agent.getModelProvider())
                .model_name(agent.getModelName())
                .metadata(Map.of(
                        "springExecutionId", executionId.toString(),
                        "agentId", agent.getId().toString(),
                        "sessionSource", session.getSource().name()
                ))
                .build();
    }

    private void processPublicEvent(ServerSentEvent<String> event,
                                    AtomicReference<String> finalMessage,
                                    AtomicReference<String> streamError) {
        if (event.data() == null) {
            return;
        }

        try {
            Map<String, Object> data = objectMapper.readValue(event.data(), new TypeReference<>() {});
            String eventName = event.event() == null ? readString(data, "event", "type") : event.event();

            if ("execution_completed".equals(eventName)) {
                String answer = extractFinalMessage(data);
                if (answer != null && !answer.isBlank()) {
                    finalMessage.set(answer);
                }
            } else if ("execution_failed".equals(eventName)) {
                streamError.set(readString(data, "error", "errorMessage", "message"));
            }
        } catch (Exception e) {
            streamError.set("Failed to parse agent runtime event");
        }
    }

    private String extractFinalMessage(Map<String, Object> data) {
        String direct = readString(data, "finalMessage", "answer", "content");
        if (direct != null) {
            return direct;
        }
        if (data.containsKey("output") && data.get("output") instanceof Map<?, ?> output) {
            return readString((Map<String, Object>) output, "finalMessage", "answer", "content");
        }
        return null;
    }

    private List<Map<String, String>> toPythonMessages(ChatSession session) {
        return messageService.findBySessionId(session.getId()).stream()
                .filter(message -> message.getRole() != MessageRole.TOOL)
                .map(message -> Map.of(
                        "role", toPythonRole(message.getRole()),
                        "content", message.getContent()
                ))
                .toList();
    }

    private String toPythonRole(MessageRole role) {
        return switch (role) {
            case USER -> "user";
            case ASSISTANT -> "assistant";
            case SYSTEM -> "system";
            case TOOL -> "tool";
        };
    }

    private Map<String, Object> toGuardrailsMap(Guardrail guardrail, int effectiveMaxSteps) {
        if (guardrail == null) {
            return Map.of(
                    "maxSteps", effectiveMaxSteps,
                    "forbiddenTopics", List.of(),
                    "requireHumanConfirmationForTools", List.of()
            );
        }

        return Map.of(
                "maxSteps", effectiveMaxSteps,
                "forbiddenTopics", guardrail.getForbiddenTopicsJson() == null ? List.of() : guardrail.getForbiddenTopicsJson(),
                "requireHumanConfirmationForTools", guardrail.getHumanConfirmationToolsJson() == null
                        ? List.of()
                        : guardrail.getHumanConfirmationToolsJson().stream()
                        .map(ToolType::getId)
                        .toList()
        );
    }

    private int effectiveMaxSteps(Guardrail guardrail, String domain) {
        int ceiling = domainMaxSteps(domain);
        int requested = guardrail == null || guardrail.getMaxSteps() <= 0
                ? ceiling
                : guardrail.getMaxSteps();

        return Math.min(requested, ceiling);
    }

    private int domainMaxSteps(String domain) {
        return switch (domain) {
            case "ecommerce" -> 8;
            case "education", "tourism" -> 10;
            case "general" -> 6;
            default -> 10;
        };
    }

    private String resolveDomain(String domain) {
        if (domain == null || domain.isBlank()) {
            return "general";
        }
        return switch (domain) {
            case "ecommerce", "education", "tourism", "general" -> domain;
            default -> "general";
        };
    }

    private String resolveUseCase(String domain, String useCase) {
        if (useCase == null || useCase.isBlank()) {
            return null;
        }

        String normalized = useCase.trim();
        return switch (domain) {
            case "ecommerce" -> switch (normalized) {
                case "customer_support", "order_tracking", "product_recommendation" -> normalized;
                default -> null;
            };
            case "education" -> switch (normalized) {
                case "learning_support", "course_info", "skill_development" -> normalized;
                default -> null;
            };
            case "tourism" -> switch (normalized) {
                case "trip_planning", "destination_info", "booking_support" -> normalized;
                default -> null;
            };
            case "general" -> "general_assistance".equals(normalized) ? normalized : null;
            default -> null;
        };
    }

    private String readString(Map<String, Object> data, String... keys) {
        if (data == null) {
            return null;
        }
        for (String key : keys) {
            Object value = data.get(key);
            if (value != null) {
                return String.valueOf(value);
            }
        }
        return null;
    }

    private UUID parseSessionId(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return null;
        }

        try {
            return UUID.fromString(sessionId);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private PublicAgentMessageResponse toPublicMessage(Message message) {
        return PublicAgentMessageResponse.builder()
                .id(message.getId())
                .sessionId(message.getSession().getId())
                .role(message.getRole().name().toLowerCase())
                .content(message.getContent())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
