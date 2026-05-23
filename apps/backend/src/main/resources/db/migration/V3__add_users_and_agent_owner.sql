CREATE TABLE users (
                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                       username VARCHAR(255) NOT NULL UNIQUE,
                       password_hash VARCHAR(255) NOT NULL,
                       created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE agents
    ADD COLUMN owner_id UUID;

ALTER TABLE agents
    ADD CONSTRAINT fk_agents_owner
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX idx_agents_owner_id ON agents(owner_id);