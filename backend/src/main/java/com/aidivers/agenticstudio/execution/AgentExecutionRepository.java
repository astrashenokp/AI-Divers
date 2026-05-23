package com.aidivers.agenticstudio.execution;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AgentExecutionRepository extends JpaRepository<AgentExecution, UUID> {

    List<AgentExecution> findByAgentIdOrderByStartedAtDesc(UUID agentId);

    List<AgentExecution> findBySessionIdOrderByStartedAtDesc(UUID sessionId);

    List<AgentExecution> findByStatus(ExecutionStatus status);
}