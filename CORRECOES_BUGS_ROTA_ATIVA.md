# Correções de Bugs - Rota Ativa

## 🐛 Bugs Corrigidos

### 1. **Coleta desaparece ao clicar "A CAMINHO"**

**Problema:**
- Quando entregador clicava "A CAMINHO" em uma coleta, o card sumia
- Não apareciam os botões FALHOU/COLETADO

**Causa:**
- Coletas usam `pickup_date` (data de coleta)
- Entregas usam `delivery_date` (data de entrega)
- Ao mudar status para "Em Rota", o filtro verificava apenas `delivery_date`
- Como coleta não tem `delivery_date`, era excluída do filtro

**Solução:**
```typescript
// Se é Pronto ou Em Rota, verificar se é do dia E tem data
if (s === "Pronto" || s === "Em Rota") {
  // Se veio de coleta (previous_status = Coleta), usar pickup_date
  if (pedido.previous_status === "Coleta") {
    if (!pedido.pickup_date) return false;
    return pedido.pickup_date === todayStr;
  }
  
  // Senão, é entrega normal, usar delivery_date
  if (!pedido.delivery_date) return false;
  return pedido.delivery_date === todayStr;
}
```

**Resultado:**
✅ Coletas agora permanecem visíveis quando vão para "Em Rota"
✅ Botões FALHOU/COLETADO aparecem corretamente

---

### 2. **Ao finalizar rota, pedidos voltam para "Em Rota"**

**Problema:**
- Ao clicar "Finalizar Rota", pedidos que não foram concluídos permaneciam como "Em Rota"
- Ao voltar para página entregas, pedidos ainda apareciam em rota

**Causa:**
- Função `finalizarRota()` apenas:
  - Limpava localStorage
  - Redirecionava para entregas
- **NÃO atualizava** status dos pedidos no banco de dados

**Solução:**
```typescript
const finalizarRota = async () => {
  if (!confirm("Finalizar rota? Pedidos não concluídos voltarão para aguardando.")) {
    return;
  }
  
  try {
    // Voltar pedidos "Em Rota" para status anterior
    const pedidosEmRota = pedidos.filter(p => p.status === "Em Rota");
    
    for (const pedido of pedidosEmRota) {
      await supabase
        .from("service_orders")
        .update({ status: pedido.previous_status || "Pronto" })
        .eq("id", pedido.id);
    }
    
    localStorage.removeItem("tenislab_rota_ativa");
    localStorage.removeItem("tenislab_motoboy_name");
    toast.success("Rota finalizada! Pedidos não concluídos voltaram para aguardando.");
    router.push("/interno/entregas");
  } catch (error: any) {
    console.error("Erro ao finalizar rota:", error);
    toast.error("Erro ao finalizar rota");
  }
};
```

**Resultado:**
✅ Pedidos não concluídos voltam para status anterior (Pronto ou Coleta)
✅ Banco de dados é atualizado corretamente
✅ Mensagem clara sobre o que aconteceu

---

### 3. **Entregador pode voltar para página entregas durante rota**

**Problema:**
- Entregador podia navegar de volta para `/interno/entregas` enquanto estava em rota ativa
- Isso causava confusão e permitia iniciar outra rota

**Causa:**
- Não havia bloqueio de navegação
- Página entregas não verificava se havia rota ativa

**Solução:**
```typescript
useEffect(() => {
  fetchPedidos();
  
  // Bloquear entregador de acessar entregas quando em rota ativa
  if (role?.toLowerCase() === 'entregador' && rotaAtiva) {
    toast.info('Você está em rota ativa! Redirecionando...');
    router.push('/interno/rota-ativa');
  }
}, [fetchPedidos, role, rotaAtiva, router]);
```

**Resultado:**
✅ Entregador é redirecionado automaticamente para rota-ativa
✅ Mensagem informativa aparece
✅ Não pode iniciar nova rota enquanto há uma ativa

---

## 📋 Commits

1. **fix: corrigir filtro de retiradas na rota-ativa** (e5f9166)
   - Inverter lógica: EXCLUIR explicitamente tipo_entrega = 'retirada'

2. **fix: corrigir filtro de data - excluir pedidos sem data** (82b878c)
   - Verificar se delivery_date/pickup_date existe antes de comparar
   - Excluir pedidos sem data

3. **debug: adicionar logs para verificar filtro de data** (3144787)
   - Logs para debug (removidos depois)

4. **fix: corrigir bugs críticos da rota ativa** (6526a73)
   - Coleta desaparecendo
   - Finalização de rota
   - Bloqueio de volta para entregas

---

## 🧪 Como Testar

### Teste 1: Coleta não desaparece
1. Inicie rota como entregador
2. Clique "A CAMINHO" em uma coleta
3. ✅ Coleta deve aparecer na seção "Em Rota"
4. ✅ Botões FALHOU/COLETADO devem aparecer

### Teste 2: Finalização de rota
1. Inicie rota e coloque alguns pedidos "Em Rota"
2. Clique "Finalizar Rota"
3. ✅ Confirme a finalização
4. ✅ Volte para entregas
5. ✅ Pedidos não concluídos devem estar como "Pronto" ou "Coleta"

### Teste 3: Bloqueio de volta
1. Inicie rota como entregador
2. Tente voltar para `/interno/entregas`
3. ✅ Deve ser redirecionado automaticamente para rota-ativa
4. ✅ Mensagem "Você está em rota ativa!" deve aparecer

---

## 📊 Status

**Data:** 24/01/2026  
**Commit:** 6526a73  
**Deploy:** ✅ Automático via Vercel  
**Status:** Aguardando testes do usuário

---

## 🚀 Próximos Passos

Aguardar feedback do usuário para:
- Confirmar que bugs foram corrigidos
- Identificar outros problemas
- Implementar melhorias adicionais
