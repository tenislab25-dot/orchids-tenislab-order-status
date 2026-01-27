# Sistema de Cupons de Desconto - TenisLab

## Estrutura do Banco de Dados

### Tabela: `coupons`
```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  total_limit INTEGER NOT NULL,
  times_used INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela: `coupon_usage`
```sql
CREATE TABLE coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  service_order_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
  discount_amount DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(coupon_id, client_id)
);
```

### Adicionar campo em `service_orders`
```sql
ALTER TABLE service_orders ADD COLUMN coupon_id UUID REFERENCES coupons(id);
ALTER TABLE service_orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;
```

## Regras de Negócio

1. **Desconto sempre em %** (porcentagem)
2. **1 uso por cliente** (UNIQUE constraint em coupon_usage)
3. **Limite total de cupons** (total_limit)
4. **Data de expiração** (expires_at)
5. **Não cumulativo** (1 cupom por OS)
6. **Desconto só no serviço** (não no frete)

## Validações

### Ao aplicar cupom:
1. Cupom existe?
2. Cupom está ativo?
3. Cupom não expirou?
4. Cliente já usou este cupom? (verificar coupon_usage)
5. Cupom atingiu limite total? (times_used >= total_limit)

### Cálculo do desconto:
```
valor_servico = total - frete
desconto = valor_servico * (discount_percent / 100)
novo_total = valor_servico - desconto + frete
```

## APIs

### `/api/coupons` (GET, POST)
- GET: Listar todos os cupons
- POST: Criar novo cupom

### `/api/coupons/[id]` (GET, PATCH, DELETE)
- GET: Detalhes do cupom
- PATCH: Atualizar cupom
- DELETE: Deletar cupom

### `/api/coupons/validate` (POST)
- Validar cupom para um cliente específico
- Retorna: válido/inválido + mensagem de erro

### `/api/coupons/apply` (POST)
- Aplicar cupom em uma OS
- Registra uso em coupon_usage
- Atualiza times_used em coupons
- Atualiza coupon_id e discount_amount em service_orders

## Páginas

### `/interno/cupons`
- Lista de cupons (ativos e expirados)
- Criar novo cupom
- Editar/Desativar cupom
- Estatísticas de uso

### `/pagamento/[id]` (modificar)
- Campo "Tem cupom de desconto?"
- Input para código do cupom
- Botão "Aplicar"
- Mostra desconto aplicado
- Recalcula total
