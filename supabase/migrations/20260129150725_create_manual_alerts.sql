CREATE TABLE IF NOT EXISTS manual_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('bloqueio', 'cliente_perguntou', 'observacao')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID
);

CREATE INDEX IF NOT EXISTS idx_manual_alerts_order_id ON manual_alerts(order_id);
CREATE INDEX IF NOT EXISTS idx_manual_alerts_resolved ON manual_alerts(resolved);
