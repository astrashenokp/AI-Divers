package com.aidivers.agenticstudio.sessions;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    List<Message> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    List<Message> findBySessionIdAndRoleOrderByCreatedAtAsc(UUID sessionId, MessageRole role);
}