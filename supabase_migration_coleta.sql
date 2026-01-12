-- Migration: Adicionar status "Coleta" e campo tipo_entrega
-- Data: 2026-01-12

-- 1. Adicionar coluna tipo_entrega na tabela service_orders
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS tipo_entrega VARCHAR(10) DEFAULT 'entrega' CHECK (tipo_entrega IN ('entrega', 'retirada'));

-- 2. Comentário explicativo
COMMENT ON COLUMN service_orders.tipo_entrega IS 'Define se o pedido é para entrega ou retirada na loja';

-- 3. Criar índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_service_orders_tipo_entrega ON service_orders(tipo_entrega);

-- Nota: O status "Coleta" será adicionado via código TypeScript nos tipos,
-- pois o Supabase não tem constraint de enum no status (é VARCHAR livre)
