export type GuideTrigger =
  | "first_visit"
  | "builder_empty"
  | "agent_missing_prompt"
  | "no_tools_selected"
  | "backend_unreachable"
  | "stream_failed"
  | "guardrail_blocked"
  | "human_confirmation_required"
  | "deployment_not_configured"
  | "demo_mode";

export type GuideActionType =
  | "start_guided_setup"
  | "explain_screen"
  | "insert_template"
  | "add_default_tool"
  | "set_safe_guardrails"
  | "check_backend_health"
  | "retry_stream"
  | "run_mock_mode"
  | "open_widget_preview"
  | "dismiss";

export type GuideExecutionStatus =
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "BLOCKED"
  | "WAITING_FOR_HUMAN"
  | "running"
  | "completed"
  | "failed"
  | "blocked"
  | "waiting_for_human";

export type GuideAction = {
  id: string;
  label: string;
  type: GuideActionType;
};

export type GuideMessage = {
  id: string;
  trigger: GuideTrigger;
  title: string;
  body: string;
  actions: GuideAction[];
};

export type GuideContext = {
  route: string;
  isFirstVisit: boolean;
  hasSelectedAgent: boolean;
  hasSystemPrompt: boolean;
  enabledToolCount: number;
  backendReachable: boolean | null;
  isStreaming: boolean;
  latestExecutionStatus?: GuideExecutionStatus;
  latestErrorMessage?: string;
  deploymentConfigured: boolean;
};
