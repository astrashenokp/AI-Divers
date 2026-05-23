package com.aidivers.agenticstudio.execution;

import com.aidivers.agenticstudio.tools.AgentTool;
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
@Table(name = "tool_call_history")
public class ToolCallHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "execution_id", nullable = false)
    private AgentExecution execution;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_tool_id")
    private AgentTool agentTool;

    @Column(name = "tool_name", nullable = false)
    private String toolName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_json", columnDefinition = "jsonb")
    private Map<String, Object> inputJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "output_json", columnDefinition = "jsonb")
    private Map<String, Object> outputJson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ToolCallStatus status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}