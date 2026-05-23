package com.aidivers.agenticstudio.guardrails;

import com.aidivers.agenticstudio.agents.Agent;
import com.aidivers.agenticstudio.tools.ToolType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "guardrails")
public class Guardrail {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false, unique = true)
    private Agent agent;

    @Column(name = "max_steps", nullable = false)
    private int maxSteps;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "forbidden_topics_json", columnDefinition = "jsonb")
    private List<String> forbiddenTopicsJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "human_confirmation_tools_json", columnDefinition = "jsonb")
    private List<ToolType> humanConfirmationToolsJson;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}