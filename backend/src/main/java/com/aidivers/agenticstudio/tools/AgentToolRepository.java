package com.aidivers.agenticstudio.tools;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AgentToolRepository extends JpaRepository<AgentTool, UUID> {

    List<AgentTool> findByAgentId(UUID agentId);

    List<AgentTool> findByAgentIdAndEnabledTrue(UUID agentId);

    List<AgentTool> findByAgentIdAndType(UUID agentId, ToolType type);
}