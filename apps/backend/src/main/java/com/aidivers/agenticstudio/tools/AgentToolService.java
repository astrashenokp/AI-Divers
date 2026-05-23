package com.aidivers.agenticstudio.tools;

import com.aidivers.agenticstudio.agents.Agent;
import com.aidivers.agenticstudio.agents.AgentService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AgentToolService {

    private final AgentToolRepository agentToolRepository;
    private final AgentService agentService;

    public AgentTool save(UUID agentId, AgentTool tool) {
        Agent agent = agentService.getById(agentId);
        tool.setAgent(agent);
        return agentToolRepository.save(tool);
    }

    @Transactional(readOnly = true)
    public AgentTool getById(UUID id) {
        return agentToolRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Agent tool not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<AgentTool> findByAgentId(UUID agentId) {
        return agentToolRepository.findByAgentId(agentId);
    }

    @Transactional(readOnly = true)
    public List<AgentTool> findEnabledByAgentId(UUID agentId) {
        return agentToolRepository.findByAgentIdAndEnabledTrue(agentId);
    }

    public void deleteById(UUID id) {
        agentToolRepository.deleteById(id);
    }
}