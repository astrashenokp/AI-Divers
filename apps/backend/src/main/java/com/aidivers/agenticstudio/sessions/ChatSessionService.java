package com.aidivers.agenticstudio.sessions;

import com.aidivers.agenticstudio.agents.Agent;
import com.aidivers.agenticstudio.agents.AgentService;
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
public class ChatSessionService {

    private final ChatSessionRepository chatSessionRepository;
    private final AgentService agentService;

    public ChatSession create(UUID agentId, SessionSource source, String title) {
        Agent agent = agentService.getById(agentId);

        ChatSession session = ChatSession.builder()
                .agent(agent)
                .source(source)
                .title(title)
                .build();

        return chatSessionRepository.save(session);
    }

    public ChatSession createForOwner(UUID agentId, SessionSource source, String title, User owner) {
        Agent agent = agentService.getByIdForOwner(agentId, owner);

        ChatSession session = ChatSession.builder()
                .agent(agent)
                .source(source)
                .title(title)
                .build();

        return chatSessionRepository.save(session);
    }

    @Transactional(readOnly = true)
    public ChatSession getById(UUID id) {
        return chatSessionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Chat session not found: " + id));
    }

    @Transactional(readOnly = true)
    public ChatSession getByIdForOwner(UUID id, User owner) {
        if (owner == null) {
            return getById(id);
        }
        return chatSessionRepository.findById(id)
                .filter(session -> session.getAgent().getOwner() != null)
                .filter(session -> session.getAgent().getOwner().getId().equals(owner.getId()))
                .orElseThrow(() -> new EntityNotFoundException("Chat session not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<ChatSession> findByAgentId(UUID agentId) {
        return chatSessionRepository.findByAgentIdOrderByUpdatedAtDesc(agentId);
    }
}