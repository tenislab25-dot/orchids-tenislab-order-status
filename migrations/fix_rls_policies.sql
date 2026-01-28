-- Migration: Corrigir RLS Policies Permissivas
-- Data: 2026-01-27
-- Descrição: Substituir policies com USING (true) por lógica real de autorização

-- ============================================
-- PAYMENTS: Restringir acesso a pagamentos
-- ============================================

-- Remover policies permissivas
DROP POLICY IF EXISTS "Permitir inserção de pagamentos" ON payments;
DROP POLICY IF EXISTS "Permitir atualização de pagamentos" ON payments;

-- Criar policies seguras
CREATE POLICY "Permitir inserção de pagamentos" ON payments
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR 
    (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) IN ('ADMIN', 'ATENDENTE')
  );

CREATE POLICY "Permitir atualização de pagamentos" ON payments
  FOR UPDATE
  USING (
    auth.role() = 'service_role' OR 
    (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) IN ('ADMIN', 'ATENDENTE')
  );

-- ============================================
-- COUPON_USAGE: Restringir registro de uso
-- ============================================

DROP POLICY IF EXISTS "Sistema pode registrar uso de cupons" ON coupon_usage;

CREATE POLICY "Sistema pode registrar uso de cupons" ON coupon_usage
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR 
    (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'ADMIN'
  );

-- ============================================
-- DELIVERY_TRACKING: Restringir tracking
-- ============================================

DROP POLICY IF EXISTS "allow_authenticated_insert" ON delivery_tracking;
DROP POLICY IF EXISTS "allow_authenticated_update" ON delivery_tracking;

CREATE POLICY "allow_authenticated_insert" ON delivery_tracking
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) IN ('ADMIN', 'ENTREGADOR')
  );

CREATE POLICY "allow_authenticated_update" ON delivery_tracking
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) IN ('ADMIN', 'ENTREGADOR')
  );

-- ============================================
-- FUNÇÕES: Fixar search_path
-- ============================================

ALTER FUNCTION add_business_days SET search_path = public, pg_temp;
ALTER FUNCTION update_overdue_delivery_dates SET search_path = public, pg_temp;
ALTER FUNCTION update_payments_updated_at SET search_path = public, pg_temp;

-- ============================================
-- ÍNDICES: Adicionar índices faltantes
-- ============================================

-- Índices em foreign keys
CREATE INDEX IF NOT EXISTS idx_coupon_usage_service_order_id ON coupon_usage(service_order_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_coupon_id ON service_orders(coupon_id);

-- Índices em colunas frequentemente filtradas
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_delivery_date ON service_orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_service_orders_payment_confirmed ON service_orders(payment_confirmed);
CREATE INDEX IF NOT EXISTS idx_service_orders_client_id ON service_orders(client_id);

-- Remover índices não utilizados
DROP INDEX IF EXISTS idx_payments_mp_preference_id;
DROP INDEX IF EXISTS idx_coupons_active;
DROP INDEX IF EXISTS idx_coupon_usage_client;

-- ============================================
-- EXTENSION: Mover pg_net para schema dedicado
-- ============================================

CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_net SET SCHEMA extensions;

-- ============================================
-- AUTH: Habilitar proteção contra senhas vazadas
-- ============================================

-- Nota: Isso deve ser feito manualmente no Dashboard do Supabase
-- Dashboard → Authentication → Settings → Password Protection
-- Ativar "Leaked Password Protection"

COMMENT ON SCHEMA public IS 'Migration aplicada em 2026-01-27: RLS policies corrigidas, índices adicionados, search_path fixado';
