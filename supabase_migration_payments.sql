-- Tabela de Pagamentos (Mercado Pago)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  
  -- Dados do Mercado Pago
  mp_payment_id TEXT UNIQUE, -- ID do pagamento no Mercado Pago
  mp_preference_id TEXT, -- ID da preferência (para cartão)
  
  -- Valores
  amount DECIMAL(10, 2) NOT NULL, -- Valor original do serviço
  total_amount DECIMAL(10, 2) NOT NULL, -- Valor total cobrado (com taxas)
  fee_amount DECIMAL(10, 2) DEFAULT 0, -- Valor da taxa repassada
  
  -- Método de pagamento
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'debit_card')),
  
  -- Status do pagamento
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'in_process')),
  
  -- Dados do PIX (quando aplicável)
  pix_qr_code TEXT, -- QR Code do PIX
  pix_qr_code_base64 TEXT, -- QR Code em base64 para exibir
  pix_copy_paste TEXT, -- Código Copia e Cola do PIX
  
  -- Dados do Cartão (quando aplicável)
  init_point TEXT, -- URL para pagamento com cartão
  
  -- Metadados
  metadata JSONB, -- Dados adicionais do Mercado Pago
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE, -- Data/hora do pagamento
  expires_at TIMESTAMP WITH TIME ZONE -- Data/hora de expiração (PIX expira em 30 min)
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_payments_service_order ON payments(service_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id ON payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Política: ADMIN e ATENDENTE podem ver todos os pagamentos
CREATE POLICY "Admin e Atendente podem visualizar pagamentos"
  ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('ADMIN', 'ATENDENTE')
    )
  );

-- Política: ADMIN e ATENDENTE podem criar pagamentos
CREATE POLICY "Admin e Atendente podem criar pagamentos"
  ON payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('ADMIN', 'ATENDENTE')
    )
  );

-- Política: Apenas ADMIN pode atualizar pagamentos
CREATE POLICY "Admin pode atualizar pagamentos"
  ON payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'ADMIN'
    )
  );

-- Política: Apenas ADMIN pode deletar pagamentos
CREATE POLICY "Admin pode deletar pagamentos"
  ON payments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'ADMIN'
    )
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER payments_updated_at_trigger
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- Função para atualizar status da OS quando pagamento for aprovado
CREATE OR REPLACE FUNCTION update_service_order_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o pagamento foi aprovado, atualizar a OS
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Atualizar payment_status e paid_at da service_order
    UPDATE service_orders
    SET 
      payment_status = 'PAID',
      updated_at = NOW()
    WHERE id = NEW.service_order_id;
    
    -- Registrar quando foi pago
    NEW.paid_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar OS quando pagamento for aprovado
CREATE TRIGGER payment_approved_trigger
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_service_order_on_payment();

-- Comentários
COMMENT ON TABLE payments IS 'Pagamentos realizados via Mercado Pago (PIX e Cartão)';
COMMENT ON COLUMN payments.amount IS 'Valor original do serviço (sem taxas)';
COMMENT ON COLUMN payments.total_amount IS 'Valor total cobrado do cliente (com taxas incluídas)';
COMMENT ON COLUMN payments.fee_amount IS 'Valor da taxa do Mercado Pago repassada ao cliente';
COMMENT ON COLUMN payments.pix_qr_code IS 'QR Code do PIX para exibir ao cliente';
COMMENT ON COLUMN payments.pix_copy_paste IS 'Código Copia e Cola do PIX';
COMMENT ON COLUMN payments.init_point IS 'URL para pagamento com cartão no Mercado Pago';
