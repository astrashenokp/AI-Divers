CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                       display_name VARCHAR(255),
                       email VARCHAR(255) UNIQUE,
                       created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE agents (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        owner_id UUID,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        system_prompt TEXT NOT NULL,
                        model_provider VARCHAR(255) NOT NULL,
                        model_name VARCHAR(255) NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE agent_tools (
                             id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                             agent_id UUID NOT NULL,
                             type VARCHAR(255) NOT NULL,
                             name VARCHAR(255) NOT NULL,
                             config_json JSONB,
                             enabled BOOLEAN NOT NULL,
                             created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

                             CONSTRAINT fk_agent_tools_agent
                                 FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE guardrails (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            agent_id UUID NOT NULL UNIQUE,
                            max_steps INTEGER NOT NULL,
                            forbidden_topics_json JSONB,
                            human_confirmation_tools_json JSONB,
                            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

                            CONSTRAINT fk_guardrails_agent
                                FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE chat_sessions (
                               id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                               agent_id UUID NOT NULL,
                               source VARCHAR(255) NOT NULL,
                               title VARCHAR(255) NOT NULL,
                               created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                               updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

                               CONSTRAINT fk_chat_sessions_agent
                                   FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE messages (
                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          session_id UUID NOT NULL,
                          role VARCHAR(255) NOT NULL,
                          content TEXT NOT NULL,
                          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

                          CONSTRAINT fk_messages_session
                              FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE TABLE agent_executions (
                                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                  agent_id UUID NOT NULL,
                                  session_id UUID,
                                  status VARCHAR(255) NOT NULL,
                                  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
                                  completed_at TIMESTAMP WITH TIME ZONE,
                                  error_message TEXT,

                                  CONSTRAINT fk_agent_executions_agent
                                      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,

                                  CONSTRAINT fk_agent_executions_session
                                      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE SET NULL
);

CREATE TABLE agent_execution_steps (
                                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                       execution_id UUID NOT NULL,
                                       step_index INTEGER NOT NULL,
                                       type VARCHAR(255) NOT NULL,
                                       summary TEXT,
                                       input_json JSONB,
                                       output_json JSONB,
                                       created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

                                       CONSTRAINT fk_agent_execution_steps_execution
                                           FOREIGN KEY (execution_id) REFERENCES agent_executions(id) ON DELETE CASCADE,

                                       CONSTRAINT uq_execution_step_index
                                           UNIQUE (execution_id, step_index)
);

CREATE TABLE tool_call_history (
                                   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                   execution_id UUID NOT NULL,
                                   agent_tool_id UUID,
                                   tool_name VARCHAR(255) NOT NULL,
                                   input_json JSONB,
                                   output_json JSONB,
                                   status VARCHAR(255) NOT NULL,
                                   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

                                   CONSTRAINT fk_tool_call_history_execution
                                       FOREIGN KEY (execution_id) REFERENCES agent_executions(id) ON DELETE CASCADE,

                                   CONSTRAINT fk_tool_call_history_agent_tool
                                       FOREIGN KEY (agent_tool_id) REFERENCES agent_tools(id) ON DELETE SET NULL
);

CREATE TABLE deployment_settings (
                                     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                     agent_id UUID NOT NULL UNIQUE,
                                     deployment_slug VARCHAR(255) NOT NULL UNIQUE,
                                     rest_enabled BOOLEAN NOT NULL,
                                     webhook_enabled BOOLEAN NOT NULL,
                                     widget_enabled BOOLEAN NOT NULL,
                                     public_access_enabled BOOLEAN NOT NULL,
                                     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                                     updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

                                     CONSTRAINT fk_deployment_settings_agent
                                         FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX idx_agents_owner_id ON agents(owner_id);

CREATE INDEX idx_agent_tools_agent_id ON agent_tools(agent_id);
CREATE INDEX idx_agent_tools_agent_id_enabled ON agent_tools(agent_id, enabled);

CREATE INDEX idx_chat_sessions_agent_id ON chat_sessions(agent_id);
CREATE INDEX idx_messages_session_id ON messages(session_id);

CREATE INDEX idx_agent_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX idx_agent_executions_session_id ON agent_executions(session_id);
CREATE INDEX idx_agent_executions_status ON agent_executions(status);

CREATE INDEX idx_agent_execution_steps_execution_id ON agent_execution_steps(execution_id);

CREATE INDEX idx_tool_call_history_execution_id ON tool_call_history(execution_id);
CREATE INDEX idx_tool_call_history_agent_tool_id ON tool_call_history(agent_tool_id);
CREATE INDEX idx_tool_call_history_status ON tool_call_history(status);

CREATE INDEX idx_deployment_settings_slug ON deployment_settings(deployment_slug);