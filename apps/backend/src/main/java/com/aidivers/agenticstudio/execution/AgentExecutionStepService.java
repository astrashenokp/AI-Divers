package com.aidivers.agenticstudio.execution;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AgentExecutionStepService {

    private final AgentExecutionStepRepository stepRepository;
    private final AgentExecutionService executionService;

    public AgentExecutionStep save(
            UUID executionId,
            int stepIndex,
            ExecutionStepType type,
            String summary,
            Map<String, Object> inputJson,
            Map<String, Object> outputJson
    ) {
        AgentExecution execution = executionService.getById(executionId);

        AgentExecutionStep step = AgentExecutionStep.builder()
                .execution(execution)
                .stepIndex(stepIndex)
                .type(type)
                .summary(summary)
                .inputJson(inputJson)
                .outputJson(outputJson)
                .build();

        return stepRepository.save(step);
    }

    @Transactional(readOnly = true)
    public List<AgentExecutionStep> findByExecutionId(UUID executionId) {
        return stepRepository.findByExecutionIdOrderByStepIndexAsc(executionId);
    }
}