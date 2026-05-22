package com.aidivers.agenticstudio.sessions;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@lombok.Data
public class ChatSessionRequest {

    @NotNull
    private SessionSource source;

    @NotBlank
    private String title;
}