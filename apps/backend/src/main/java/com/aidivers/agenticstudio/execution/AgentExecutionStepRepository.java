package com.aidivers.agenticstudio.execution;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AgentExecutionStepRepository extends JpaRepository<AgentExecutionStep, UUID> {

    List<AgentExecutionStep> findByExecutionIdOrderByStepIndexAsc(UUID executionId);

    boolean existsByExecutionIdAndStepIndex(UUID executionId, int stepIndex);
}