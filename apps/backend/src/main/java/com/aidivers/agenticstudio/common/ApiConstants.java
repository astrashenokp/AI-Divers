package com.aidivers.agenticstudio.common;

public final class ApiConstants {

    private ApiConstants() {}

    public static final String API_V1_PREFIX = "/api/v1";

    public static final String EVENT_EXECUTION_STARTED = "execution_started";
    public static final String EVENT_REASONING_STEP = "reasoning_step";
    public static final String EVENT_TOOL_CALL_STARTED = "tool_call_started";
    public static final String EVENT_TOOL_CALL_FINISHED = "tool_call_finished";
    public static final String EVENT_GUARDRAIL_BLOCKED = "guardrail_blocked";
    public static final String EVENT_HUMAN_CONFIRMATION_REQUIRED = "human_confirmation_required";
    public static final String EVENT_MESSAGE_DELTA = "message_delta";
    public static final String EVENT_EXECUTION_COMPLETED = "execution_completed";
    public static final String EVENT_EXECUTION_FAILED = "execution_failed";
}