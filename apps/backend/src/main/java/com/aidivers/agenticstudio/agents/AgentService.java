package com.aidivers.agenticstudio.agents;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AgentService {

    private final AgentRepository agentRepository;

    public Agent save(Agent agent) {
        return agentRepository.save(agent);
    }

    @Transactional(readOnly = true)
    public List<Agent> findAll() {
        return agentRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Agent getById(UUID id) {
        return agentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Agent not found: " + id));
    }

    public void deleteById(UUID id) {
        agentRepository.deleteById(id);
    }
}