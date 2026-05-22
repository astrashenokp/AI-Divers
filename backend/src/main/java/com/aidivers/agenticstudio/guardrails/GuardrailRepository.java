package com.aidivers.agenticstudio.guardrails;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface GuardrailRepository extends JpaRepository<Guardrail, UUID> {

    Optional<Guardrail> findByAgentId(UUID agentId);

    boolean existsByAgentId(UUID agentId);
}