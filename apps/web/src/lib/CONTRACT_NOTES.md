# Frontend Contract Notes

These notes track open frontend/backend contract questions for Polina and Stas API.

## Health

- Confirm `GET /api/v1/health` response shape.
- Frontend currently accepts:

```json
{
  "status": "UP",
  "service": "agentic-studio-backend",
  "version": "optional",
  "timestamp": "optional"
}
```

## Tool Types

- Confirm `GET /api/v1/tool-types` returns an object with `categories`.
- Confirm category ids are exactly:
  - `education`
  - `stores`
  - `tourism`
  - `finance`
- Confirm whether tool templates use `name` or `displayName`.
- Confirm whether `requiresHumanConfirmation` belongs on the template, attached tool, or both.

## Agent Tool Attach

- Confirm `POST /api/v1/agents/{agentId}/tools` accepts `category`.
- Confirm backend returns the full `AgentTool` with `id`, `agentId`, and timestamps.
- Confirm backend redacts secrets from returned `config`.

## Sessions

- Confirm whether `POST /api/v1/agents/{agentId}/sessions` accepts an optional `title`.
- Confirm whether session creation body can be empty.

## Execution Stream

- Confirm `POST /api/v1/agents/{agentId}/execute/stream` request shape:

```json
{
  "sessionId": "optional",
  "message": "user message",
  "metadata": {}
}
```

- Confirm `sessionId` required vs optional.
- Confirm event payload keys are camelCase.
- Confirm status values are uppercase or lowercase.
- Confirm `message_delta` uses `delta`, `content`, `output.delta`, or `output.content`.
- Confirm `execution_completed` includes final answer as `finalMessage`, `content`, `output.finalMessage`, or `output.content`.

## Deployment

- Confirm whether backend generates `deploymentSlug` or frontend sends it.
- Confirm widget config response shape for `GET /api/v1/public/widgets/{deploymentSlug}/config`.
