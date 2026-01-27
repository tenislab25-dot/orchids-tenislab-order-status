# Análise da Estrutura do Banco de Dados - Gestão de Clientes

## Tabelas Existentes Relevantes

### 1. `clients` (82 registros)
**Colunas:**
- `id` (uuid, PK)
- `created_at` (timestamp)
- `name` (text)
- `phone` (text, unique)
- `email` (text, nullable)
- `plus_code` (text, nullable)
- `complemento_endereco` (text, nullable)
- `coordinates` (text, nullable)
- `complement` (text, nullable)

**Relacionamentos:**
- `service_orders.client_id` → `clients.id`
- `loyalty_points.client_id` → `clients.id`

### 2. `service_orders` (90 registros)
**Colunas relevantes:**
- `id` (uuid, PK)
- `client_id` (uuid, FK → clients)
- `os_number` (text, unique)
- `status` (text)
- `total` (numeric)
- `payment_confirmed` (boolean)
- `created_at` (timestamp)
- `delivery_date` (date)

### 3. `payments` (37 registros)
**Colunas relevantes:**
- `id` (uuid, PK)
- `service_order_id` (uuid, FK → service_orders)
- `amount` (numeric)
- `total_amount` (numeric)
- `status` (text: pending, approved, rejected, cancelled, refunded)
- `paid_at` (timestamp)

### 4. `loyalty_points` (0 registros)
**Colunas:**
- `id` (uuid, PK)
- `client_id` (uuid, FK → clients)
- `points` (integer, default 0)
- `total_services` (integer, default 0)
- `free_services_earned` (integer, default 0)
- `free_services_used` (integer, default 0)

## Modificações Necessárias

### ✅ Adicionar campo VIP na tabela `clients`

```sql
ALTER TABLE clients 
ADD COLUMN is_vip BOOLEAN DEFAULT FALSE;
```

**Justificativa:** Permite marcar clientes como VIP manualmente (igual à estrelinha de prioridade nas OS).

## Queries Necessárias para a Funcionalidade

### 1. Listar todos os clientes com estatísticas
```sql
SELECT 
  c.id,
  c.name,
  c.phone,
  c.email,
  c.is_vip,
  c.created_at,
  COUNT(so.id) as total_services,
  COALESCE(SUM(so.total), 0) as total_spent,
  COALESCE(AVG(so.total), 0) as ticket_medio,
  MAX(so.created_at) as last_service_date
FROM clients c
LEFT JOIN service_orders so ON so.client_id = c.id
GROUP BY c.id, c.name, c.phone, c.email, c.is_vip, c.created_at
ORDER BY total_services DESC;
```

### 2. Top 10 clientes (ranking)
```sql
SELECT 
  c.id,
  c.name,
  c.phone,
  c.is_vip,
  COUNT(so.id) as total_services,
  COALESCE(SUM(so.total), 0) as total_spent
FROM clients c
LEFT JOIN service_orders so ON so.client_id = c.id
GROUP BY c.id, c.name, c.phone, c.is_vip
ORDER BY total_services DESC, total_spent DESC
LIMIT 10;
```

### 3. Detalhes de um cliente específico
```sql
-- Estatísticas do cliente
SELECT 
  c.*,
  COUNT(so.id) as total_services,
  COALESCE(SUM(so.total), 0) as total_spent,
  COALESCE(AVG(so.total), 0) as ticket_medio,
  MIN(so.created_at) as first_service_date,
  MAX(so.created_at) as last_service_date
FROM clients c
LEFT JOIN service_orders so ON so.client_id = c.id
WHERE c.id = $1
GROUP BY c.id;

-- Histórico de OS do cliente
SELECT 
  so.id,
  so.os_number,
  so.created_at,
  so.status,
  so.total,
  so.payment_confirmed,
  so.items
FROM service_orders so
WHERE so.client_id = $1
ORDER BY so.created_at DESC;
```

### 4. Marcar/Desmarcar cliente como VIP
```sql
UPDATE clients
SET is_vip = $2
WHERE id = $1;
```

### 5. Buscar clientes por nome ou telefone
```sql
SELECT 
  c.id,
  c.name,
  c.phone,
  c.email,
  c.is_vip,
  COUNT(so.id) as total_services,
  COALESCE(SUM(so.total), 0) as total_spent
FROM clients c
LEFT JOIN service_orders so ON so.client_id = c.id
WHERE 
  c.name ILIKE $1 OR 
  c.phone ILIKE $1
GROUP BY c.id, c.name, c.phone, c.email, c.is_vip
ORDER BY total_services DESC;
```

## Estrutura de Páginas a Criar

### 1. `/app/interno/clientes/page.tsx`
- Lista de clientes com busca
- Cards de estatísticas (total clientes, VIPs, etc)
- Seção "Top 10 Clientes" (ranking)
- Tabela com todos os clientes

### 2. `/app/interno/clientes/[id]/page.tsx`
- Detalhes do cliente
- Botão "Marcar como VIP" (toggle)
- Estatísticas (total gasto, ticket médio, etc)
- Histórico completo de OS

### 3. API Routes necessárias:
- `/app/api/clients/route.ts` - GET (listar), POST (criar)
- `/app/api/clients/[id]/route.ts` - GET (detalhes), PATCH (atualizar)
- `/app/api/clients/[id]/toggle-vip/route.ts` - POST (marcar/desmarcar VIP)
- `/app/api/clients/top/route.ts` - GET (top 10)
- `/app/api/clients/search/route.ts` - GET (buscar)

## Próximos Passos

1. ✅ Adicionar campo `is_vip` na tabela `clients`
2. Criar API routes para gerenciar clientes
3. Criar página de lista de clientes
4. Criar página de detalhes do cliente
5. Implementar funcionalidade de toggle VIP
6. Testar e fazer deploy
