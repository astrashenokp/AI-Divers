package com.aidivers.agenticstudio.guardrails;

import com.aidivers.agenticstudio.agents.Agent;
import com.aidivers.agenticstudio.agents.AgentService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class GuardrailService {

    private final GuardrailRepository guardrailRepository;
    private final AgentService agentService;

    public Guardrail save(UUID agentId, Guardrail guardrail) {
        Agent agent = agentService.getById(agentId);
        guardrail.setAgent(agent);
        return guardrailRepository.save(guardrail);
    }

    @Transactional(readOnly = true)
    public Guardrail getByAgentId(UUID agentId) {
        return guardrailRepository.findByAgentId(agentId)
                .orElseThrow(() -> new EntityNotFoundException("Guardrail not found for agent: " + agentId));
    }

    @Transactional(readOnly = true)
    public Optional<Guardrail> findByAgentId(UUID agentId) {
        return guardrailRepository.findByAgentId(agentId);
    }
}