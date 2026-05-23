package com.aidivers.agenticstudio.sessions;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {

    List<ChatSession> findByAgentIdOrderByUpdatedAtDesc(UUID agentId);

    List<ChatSession> findBySourceOrderByCreatedAtDesc(SessionSource source);
}