package com.aidivers.agenticstudio.sessions;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SessionController {

    private final ChatSessionService chatSessionService;
    private final MessageService messageService;

    @PostMapping("/agents/{agentId}/sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatSessionResponse createSession(@PathVariable UUID agentId,
                                             @Valid @RequestBody ChatSessionRequest request) {
        SessionSource source = request.getSource() == null ? SessionSource.STUDIO : request.getSource();
        String title = request.getTitle() == null || request.getTitle().isBlank()
                ? "New chat"
                : request.getTitle();

        ChatSession session = chatSessionService.create(agentId, source, title);

        return ChatSessionResponse.builder()
                .id(session.getId())
                .agentId(session.getAgent().getId())
                .source(session.getSource())
                .title(session.getTitle())
                .createdAt(session.getCreatedAt())
                .updatedAt(session.getUpdatedAt())
                .build();
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public List<MessageResponse> getMessages(@PathVariable UUID sessionId) {
        return messageService.findBySessionId(sessionId).stream()
                .map(m -> MessageResponse.builder()
                        .id(m.getId())
                        .sessionId(m.getSession().getId())
                        .role(m.getRole())
                        .content(m.getContent())
                        .createdAt(m.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }
}