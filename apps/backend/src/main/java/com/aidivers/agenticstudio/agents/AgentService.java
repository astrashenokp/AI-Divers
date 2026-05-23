package com.aidivers.agenticstudio.agents;

import com.aidivers.agenticstudio.auth.User;
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
    public List<Agent> findAllByOwner(User owner) {
        if (owner == null) {
            return agentRepository.findAll();
        }
        return agentRepository.findByOwnerId(owner.getId());
    }

    @Transactional(readOnly = true)
    public Agent getByIdForOwner(UUID id, User owner) {
        if (owner == null) {
            return agentRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("Agent not found: " + id));
        }
        return agentRepository.findByIdAndOwnerId(id, owner.getId())
                .orElseThrow(() -> new EntityNotFoundException("Agent not found: " + id));
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