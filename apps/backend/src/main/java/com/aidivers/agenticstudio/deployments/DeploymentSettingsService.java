package com.aidivers.agenticstudio.deployments;

import com.aidivers.agenticstudio.agents.Agent;
import com.aidivers.agenticstudio.agents.AgentService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class DeploymentSettingsService {

    private final DeploymentSettingsRepository deploymentSettingsRepository;
    private final AgentService agentService;

    public DeploymentSettings save(UUID agentId, DeploymentSettings settings) {
        Agent agent = agentService.getById(agentId);
        settings.setAgent(agent);
        return deploymentSettingsRepository.save(settings);
    }

    @Transactional(readOnly = true)
    public DeploymentSettings getByAgentId(UUID agentId) {
        return deploymentSettingsRepository.findByAgentId(agentId)
                .orElseThrow(() -> new EntityNotFoundException("Deployment settings not found for agent: " + agentId));
    }

    @Transactional(readOnly = true)
    public DeploymentSettings getByDeploymentSlug(String slug) {
        return deploymentSettingsRepository.findByDeploymentSlug(slug)
                .orElseThrow(() -> new EntityNotFoundException("Deployment settings not found: " + slug));
    }

    @Transactional(readOnly = true)
    public boolean slugExists(String slug) {
        return deploymentSettingsRepository.existsByDeploymentSlug(slug);
    }
}