package com.aidivers.agenticstudio.execution;

import com.aidivers.agenticstudio.agents.Agent;
import com.aidivers.agenticstudio.agents.AgentService;
import com.aidivers.agenticstudio.guardrails.Guardrail;
import com.aidivers.agenticstudio.guardrails.GuardrailService;
import com.aidivers.agenticstudio.sessions.*;
import com.aidivers.agenticstudio.tools.AgentTool;
import com.aidivers.agenticstudio.tools.AgentToolService;
import com.aidivers.agenticstudio.tools.ToolType;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ExecutionController {

    private final AgentExecutionService executionService;
    private final AgentServiceClient agentServiceClient;
    private final AgentService agentService;
    private final ChatSessionService chatSessionService;
    private final MessageService messageService;
    private final AgentToolService agentToolService;
    private final GuardrailService guardrailService;
    private final AgentExecutionStepService stepService;
    private final ToolCallHistoryService toolCallHistoryService;
    private final ObjectMapper objectMapper;

    @PostMapping(value = "/agents/{agentId}/execute/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> executeStream(@PathVariable UUID agentId,
                                                       @RequestBody ExecuteStreamRequest request) {

        if (request.getMessage() == null || request.getMessage().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message is required");
        }

        Agent agent = agentService.getById(agentId);

        ChatSession session;
        UUID sessionId = parseSessionId(request.getSessionId());
        if (sessionId != null) {
            session = chatSessionService.getById(sessionId);
        } else {
            session = chatSessionService.create(agentId, SessionSource.STUDIO, "New chat");
        }

        // Зберігаємо запит юзера
        messageService.save(session.getId(), MessageRole.USER, request.getMessage());

        AgentExecution execution = executionService.start(agentId, session.getId());

        InternalAgentExecutionRequest pythonRequest = buildInternalRequest(execution.getId(), agent, session, request);
        AtomicBoolean finalMessageSaved = new AtomicBoolean(false);

        return agentServiceClient.streamAgentExecution(pythonRequest)

                .doOnNext(event -> processSseEvent(event, execution.getId(), session.getId(), agentId, finalMessageSaved))

                .doOnComplete(() -> completeIfRunning(execution.getId()))
                .doOnError(error -> executionService.fail(execution.getId(), error.getMessage()));
    }


    private void processSseEvent(ServerSentEvent<String> event,
                                 UUID executionId,
                                 UUID sessionId,
                                 UUID agentId,
                                 AtomicBoolean finalMessageSaved) {
        if (event.data() == null) {
            return;
        }

        try {
            Map<String, Object> data = objectMapper.readValue(event.data(), new TypeReference<>() {
            });

            String eventName = event.event() == null ? readString(data, "event", "type") : event.event();
            if (eventName == null) {
                return;
            }

            int stepIndex = readInt(data, -1, "stepIndex", "step_index", "stepNumber", "step_number", "stepCount", "step_count");
            String summary = readString(data, "summary", "thought", "answer", "error", "errorMessage", "result");

            switch (eventName) {
                case "execution_started":
                    saveStepSafely(executionId, stepIndex, ExecutionStepType.EXECUTION_STARTED, summary, data, null);
                    break;

                case "tool_call_started":
                    saveStepSafely(executionId, stepIndex, ExecutionStepType.TOOL_CALL_STARTED, summary, data, null);

                    String toolName = readString(data, "toolName", "tool_name", "tool");
                    if (toolName != null) {
                        UUID toolId = findToolIdByType(agentId, toolName);
                        toolCallHistoryService.save(executionId, toolId, toolName, data, null, ToolCallStatus.STARTED);
                    }
                    break;

                case "tool_call_finished":
                    saveStepSafely(executionId, stepIndex, ExecutionStepType.TOOL_CALL_FINISHED, summary, null, data);
                    String finishedToolName = readString(data, "toolName", "tool_name", "tool");
                    if (finishedToolName != null) {
                        UUID finishedToolId = findToolIdByType(agentId, finishedToolName);
                        ToolCallStatus status = mapToolCallStatus(readString(data, "status"));
                        toolCallHistoryService.save(executionId, finishedToolId, finishedToolName, null, data, status);
                    }
                    break;

                case "reasoning_step":
                    saveStepSafely(executionId, stepIndex, ExecutionStepType.REASONING_STEP, summary, data, null);
                    break;

                case "message_delta":
                    saveStepSafely(executionId, stepIndex, ExecutionStepType.MESSAGE_DELTA, summary, data, null);
                    break;

                case "guardrail_blocked":
                    saveStepSafely(executionId, stepIndex, ExecutionStepType.GUARDRAIL_BLOCKED, summary, data, null);
                    executionService.block(executionId, summary);
                    break;

                case "human_confirmation_required":
                    saveStepSafely(executionId, stepIndex, ExecutionStepType.HUMAN_CONFIRMATION_REQUIRED, summary, data, null);
                    break;

                case "execution_completed":
                    String finalMessage = extractFinalMessage(data);
                    if (finalMessage != null && !finalMessage.isBlank() && finalMessageSaved.compareAndSet(false, true)) {
                        messageService.save(sessionId, MessageRole.ASSISTANT, finalMessage);
                    }
                    saveStepSafely(executionId, stepIndex, ExecutionStepType.EXECUTION_COMPLETED, summary, null, data);
                    break;

                case "execution_failed":
                    saveStepSafely(executionId, stepIndex, ExecutionStepType.EXECUTION_FAILED, summary, null, data);
                    executionService.fail(executionId, readString(data, "error", "errorMessage", "message"));
                    break;
            }
        } catch (Exception e) {
            log.error("Failed to parse/save SSE event: {}", event.event(), e);
        }
    }


    private String extractFinalMessage(Map<String, Object> data) {
        String direct = readString(data, "finalMessage", "answer", "content");
        if (direct != null) {
            return direct;
        }
        if (data.containsKey("output") && data.get("output") instanceof Map) {
            Map<String, Object> output = (Map<String, Object>) data.get("output");
            return readString(output, "finalMessage", "answer", "content");
        }
        return null;
    }

    private UUID findToolIdByType(UUID agentId, String toolTypeName) {
        try {
            ToolType type = ToolType.fromId(toolTypeName);
            List<AgentTool> tools = agentToolService.findEnabledByAgentId(agentId);
            return tools.stream()
                    .filter(t -> t.getType() == type)
                    .map(AgentTool::getId)
                    .findFirst()
                    .orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private InternalAgentExecutionRequest buildInternalRequest(UUID executionId, Agent agent, ChatSession session, ExecuteStreamRequest request) {
        List<AgentTool> tools = agentToolService.findEnabledByAgentId(agent.getId());
        Guardrail guardrail = guardrailService.findByAgentId(agent.getId()).orElse(null);
        String domain = request.getMetadata() == null ? null : request.getMetadata().getDomain();
        String effectiveDomain = resolveDomain(domain);
        int effectiveMaxSteps = effectiveMaxSteps(guardrail, effectiveDomain);

        return InternalAgentExecutionRequest.builder()
                .executionId(executionId.toString())
                .message(request.getMessage())
                .sessionId(session.getId().toString())
                .domain(effectiveDomain)
                .use_case(null)
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

    private String resolveDomain(String domain) {
        if (domain == null || domain.isBlank()) {
            return "general";
        }
        return switch (domain) {
            case "ecommerce", "education", "tourism", "general" -> domain;
            default -> "general";
        };
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
                    "requireHumanConfirmationForTools", List.of(
                            ToolType.HTTP_REQUEST.getId(),
                            ToolType.SAVE_PROGRESS.getId(),
                            ToolType.SAVE_NOTE.getId()
                    )
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

    private void completeIfRunning(UUID executionId) {
        AgentExecution execution = executionService.getById(executionId);
        if (execution.getStatus() == ExecutionStatus.RUNNING) {
            executionService.complete(executionId);
        }
    }

    private void saveStepSafely(UUID executionId,
                                int stepIndex,
                                ExecutionStepType type,
                                String summary,
                                Map<String, Object> inputJson,
                                Map<String, Object> outputJson) {
        int resolvedStepIndex = stepIndex >= 0 ? stepIndex : stepService.findByExecutionId(executionId).size();
        try {
            stepService.save(executionId, resolvedStepIndex, type, summary, inputJson, outputJson);
        } catch (Exception e) {
            int fallbackStepIndex = stepService.findByExecutionId(executionId).size();
            if (fallbackStepIndex != resolvedStepIndex) {
                try {
                    stepService.save(executionId, fallbackStepIndex, type, summary, inputJson, outputJson);
                    return;
                } catch (Exception retryError) {
                    log.warn("Failed to save execution step retry | executionId={} | type={} | stepIndex={}", executionId, type, fallbackStepIndex, retryError);
                }
            }
            log.warn("Failed to save execution step | executionId={} | type={} | stepIndex={}", executionId, type, resolvedStepIndex, e);
        }
    }

    private ToolCallStatus mapToolCallStatus(String status) {
        if ("blocked".equalsIgnoreCase(status)) {
            return ToolCallStatus.BLOCKED;
        }
        if ("failed".equalsIgnoreCase(status) || "error".equalsIgnoreCase(status)) {
            return ToolCallStatus.FAILED;
        }
        return ToolCallStatus.COMPLETED;
    }

    private String readString(Map<String, Object> data, String... keys) {
        for (String key : keys) {
            Object value = data.get(key);
            if (value instanceof String stringValue && !stringValue.isBlank()) {
                return stringValue;
            }
        }
        return null;
    }

    private int readInt(Map<String, Object> data, int fallback, String... keys) {
        for (String key : keys) {
            Object value = data.get(key);
            if (value instanceof Number numberValue) {
                return numberValue.intValue();
            }
            if (value instanceof String stringValue) {
                try {
                    return Integer.parseInt(stringValue);
                } catch (NumberFormatException ignored) {
                    // Try the next key.
                }
            }
        }
        return fallback;
    }
}
