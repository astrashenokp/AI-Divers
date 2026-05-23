package com.aidivers.agenticstudio.deployments;

import com.aidivers.agenticstudio.agents.Agent;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "deployment_settings")
public class DeploymentSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false, unique = true)
    private Agent agent;

    @Column(name = "deployment_slug", nullable = false, unique = true)
    private String deploymentSlug;

    @Column(name = "rest_enabled", nullable = false)
    private boolean restEnabled;

    @Column(name = "webhook_enabled", nullable = false)
    private boolean webhookEnabled;

    @Column(name = "widget_enabled", nullable = false)
    private boolean widgetEnabled;

    @Column(name = "public_access_enabled", nullable = false)
    private boolean publicAccessEnabled;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}