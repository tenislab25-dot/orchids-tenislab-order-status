-- Migration: Criar tabela de despesas
-- Data: 25/01/2026
-- Descrição: Tabela para controle de despesas operacionais do TenisLab

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  supplier VARCHAR(200),
  payment_method VARCHAR(50),
  receipt_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_frequency VARCHAR(20), -- monthly, weekly, yearly
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON expenses(is_recurring);

-- RLS (Row Level Security)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Política: Apenas ADMIN pode ver e gerenciar despesas
CREATE POLICY "Admin pode ver todas as despesas"
  ON expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'ADMIN'
    )
  );

CREATE POLICY "Admin pode inserir despesas"
  ON expenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'ADMIN'
    )
  );

CREATE POLICY "Admin pode atualizar despesas"
  ON expenses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'ADMIN'
    )
  );

CREATE POLICY "Admin pode deletar despesas"
  ON expenses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'ADMIN'
    )
  );

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expenses_updated_at();

-- Comentários
COMMENT ON TABLE expenses IS 'Tabela de controle de despesas operacionais';
COMMENT ON COLUMN expenses.category IS 'Categoria da despesa (ex: Produtos, Água/Luz, Aluguel, Salários)';
COMMENT ON COLUMN expenses.is_recurring IS 'Indica se é uma despesa recorrente (fixa)';
COMMENT ON COLUMN expenses.recurrence_frequency IS 'Frequência de recorrência (monthly, weekly, yearly)';
