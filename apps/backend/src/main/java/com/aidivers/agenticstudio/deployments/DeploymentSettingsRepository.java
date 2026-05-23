package com.aidivers.agenticstudio.deployments;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DeploymentSettingsRepository extends JpaRepository<DeploymentSettings, UUID> {

    Optional<DeploymentSettings> findByAgentId(UUID agentId);

    Optional<DeploymentSettings> findByDeploymentSlug(String deploymentSlug);

    boolean existsByDeploymentSlug(String deploymentSlug);
}