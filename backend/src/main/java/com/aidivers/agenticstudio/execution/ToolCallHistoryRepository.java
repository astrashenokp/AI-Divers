package com.aidivers.agenticstudio.execution;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ToolCallHistoryRepository extends JpaRepository<ToolCallHistory, UUID> {

    List<ToolCallHistory> findByExecutionIdOrderByCreatedAtAsc(UUID executionId);

    List<ToolCallHistory> findByAgentToolIdOrderByCreatedAtDesc(UUID agentToolId);

    List<ToolCallHistory> findByStatus(ToolCallStatus status);
}