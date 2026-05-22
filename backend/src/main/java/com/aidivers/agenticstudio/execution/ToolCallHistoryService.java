package com.aidivers.agenticstudio.execution;

import com.aidivers.agenticstudio.tools.AgentTool;
import com.aidivers.agenticstudio.tools.AgentToolService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ToolCallHistoryService {

    private final ToolCallHistoryRepository toolCallHistoryRepository;
    private final AgentExecutionService executionService;
    private final AgentToolService agentToolService;

    public ToolCallHistory save(
            UUID executionId,
            UUID agentToolId,
            String toolName,
            Map<String, Object> inputJson,
            Map<String, Object> outputJson,
            ToolCallStatus status
    ) {
        AgentExecution execution = executionService.getById(executionId);
        AgentTool agentTool = agentToolId == null ? null : agentToolService.getById(agentToolId);

        ToolCallHistory history = ToolCallHistory.builder()
                .execution(execution)
                .agentTool(agentTool)
                .toolName(toolName)
                .inputJson(inputJson)
                .outputJson(outputJson)
                .status(status)
                .build();

        return toolCallHistoryRepository.save(history);
    }

    @Transactional(readOnly = true)
    public List<ToolCallHistory> findByExecutionId(UUID executionId) {
        return toolCallHistoryRepository.findByExecutionIdOrderByCreatedAtAsc(executionId);
    }
}