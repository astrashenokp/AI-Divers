package com.aidivers.agenticstudio.execution;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "agent_execution_steps")
public class AgentExecutionStep {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "execution_id", nullable = false)
    private AgentExecution execution;

    @Column(name = "step_index", nullable = false)
    private int stepIndex;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExecutionStepType type;

    @Column(columnDefinition = "text")
    private String summary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_json", columnDefinition = "jsonb")
    private Map<String, Object> inputJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "output_json", columnDefinition = "jsonb")
    private Map<String, Object> outputJson;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}