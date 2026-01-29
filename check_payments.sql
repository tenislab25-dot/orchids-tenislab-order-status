-- Verificar pagamentos recentes com cartão
SELECT 
  p.id,
  p.mp_payment_id,
  p.payment_method,
  p.status,
  p.created_at,
  p.updated_at,
  so.os_number,
  so.payment_confirmed
FROM payments p
JOIN service_orders so ON p.service_order_id = so.id
WHERE p.payment_method = 'credit_card'
ORDER BY p.created_at DESC
LIMIT 10;
