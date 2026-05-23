package com.aidivers.agenticstudio.agents;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AgentRepository extends JpaRepository<Agent, UUID> { }