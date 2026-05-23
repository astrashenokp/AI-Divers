package com.aidivers.agenticstudio.execution;

import com.aidivers.agenticstudio.agents.Agent;
import com.aidivers.agenticstudio.agents.AgentService;
import com.aidivers.agenticstudio.sessions.ChatSession;
import com.aidivers.agenticstudio.sessions.ChatSessionService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AgentExecutionService {

    private final AgentExecutionRepository agentExecutionRepository;
    private final AgentService agentService;
    private final ChatSessionService chatSessionService;

    public AgentExecution start(UUID agentId, UUID sessionId) {
        Agent agent = agentService.getById(agentId);
        ChatSession session = sessionId == null ? null : chatSessionService.getById(sessionId);

        AgentExecution execution = AgentExecution.builder()
                .agent(agent)
                .session(session)
                .status(ExecutionStatus.RUNNING)
                .startedAt(Instant.now())
                .build();

        return agentExecutionRepository.save(execution);
    }

    public AgentExecution complete(UUID executionId) {
        AgentExecution execution = getById(executionId);
        execution.setStatus(ExecutionStatus.COMPLETED);
        execution.setCompletedAt(Instant.now());
        return agentExecutionRepository.save(execution);
    }

    public AgentExecution fail(UUID executionId, String errorMessage) {
        AgentExecution execution = getById(executionId);
        execution.setStatus(ExecutionStatus.FAILED);
        execution.setErrorMessage(errorMessage);
        execution.setCompletedAt(Instant.now());
        return agentExecutionRepository.save(execution);
    }

    public AgentExecution block(UUID executionId, String errorMessage) {
        AgentExecution execution = getById(executionId);
        execution.setStatus(ExecutionStatus.BLOCKED);
        execution.setErrorMessage(errorMessage);
        execution.setCompletedAt(Instant.now());
        return agentExecutionRepository.save(execution);
    }

    @Transactional(readOnly = true)
    public AgentExecution getById(UUID id) {
        return agentExecutionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Agent execution not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<AgentExecution> findBySessionId(UUID sessionId) {
        return agentExecutionRepository.findBySessionIdOrderByStartedAtDesc(sessionId);
    }
}