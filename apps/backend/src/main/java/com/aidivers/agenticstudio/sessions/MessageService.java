package com.aidivers.agenticstudio.sessions;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class MessageService {

    private final MessageRepository messageRepository;
    private final ChatSessionService chatSessionService;

    public Message save(UUID sessionId, MessageRole role, String content) {
        ChatSession session = chatSessionService.getById(sessionId);

        Message message = Message.builder()
                .session(session)
                .role(role)
                .content(content)
                .build();

        return messageRepository.save(message);
    }

    @Transactional(readOnly = true)
    public List<Message> findBySessionId(UUID sessionId) {
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }
}