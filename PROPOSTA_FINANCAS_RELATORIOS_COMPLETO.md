# 💰 PROPOSTA COMPLETA: FINANÇAS E RELATÓRIOS TENISLAB

**Data:** 25/01/2026  
**Versão:** 1.0  
**Status:** Proposta para Implementação

---

## 📊 ANÁLISE DO SISTEMA ATUAL

### ✅ **O QUE JÁ TEM (Muito bom!):**

#### **Página Financeiro:**
- Total recebido (líquido, descontando taxas de máquina)
- Total a receber
- Projeção total
- Receita perdida (cancelados)
- Ticket médio
- Este mês / Esta semana
- Breakdown por forma de pagamento
- Distribuição por status
- Gráficos mensais e semanais
- Exportação para PDF

#### **Página Relatórios:**
- Filtro por ano e mês
- Gráficos de pizza (formas de pagamento)
- Gráficos de barras (evolução mensal)
- Comparação ano a ano
- Análise de crescimento

### ⚠️ **O QUE FALTA (Oportunidades de Melhoria):**

1. **Fluxo de Caixa** - Entradas e saídas diárias
2. **Despesas** - Registro de custos operacionais
3. **Lucro Real** - Receita - Despesas
4. **Previsões** - Projeções futuras baseadas em histórico
5. **Metas** - Definir e acompanhar objetivos
6. **Comissões** - Controle de pagamentos para entregadores
7. **Impostos** - Cálculo automático de tributos
8. **Nota Fiscal** - Emissão automática de NFSe
9. **Dashboard Executivo** - Visão geral em tempo real
10. **Alertas** - Notificações de metas, atrasos, etc.

---

## 🚀 PROPOSTA DE MELHORIAS COMPLETAS

### **FASE 1: GESTÃO FINANCEIRA COMPLETA** (2-3 dias)

#### **1.1 Módulo de Despesas**

**Funcionalidades:**
- ✅ Cadastro de despesas (água, luz, produtos, salários, aluguel)
- ✅ Categorias personalizáveis
- ✅ Despesas fixas (recorrentes) e variáveis
- ✅ Anexar comprovantes (fotos/PDFs)
- ✅ Filtros por período, categoria, fornecedor

**Tela:**
```
┌─────────────────────────────────────────┐
│ 💸 DESPESAS                              │
├─────────────────────────────────────────┤
│ [+ Nova Despesa]  [Importar]  [Filtros] │
├─────────────────────────────────────────┤
│ Data       | Categoria  | Valor    | ✏️ │
│ 25/01/2026 | Produtos   | R$ 350   | ✏️ │
│ 24/01/2026 | Água/Luz   | R$ 280   | ✏️ │
│ 20/01/2026 | Aluguel    | R$ 1.500 | ✏️ │
└─────────────────────────────────────────┘
```

**Banco de Dados:**
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY,
  date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  supplier VARCHAR(200),
  payment_method VARCHAR(50),
  receipt_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

#### **1.2 Fluxo de Caixa**

**Funcionalidades:**
- ✅ Visão diária de entradas e saídas
- ✅ Saldo atual
- ✅ Projeção de saldo futuro
- ✅ Gráfico de linha (evolução do caixa)
- ✅ Alertas de saldo baixo

**Tela:**
```
┌─────────────────────────────────────────┐
│ 💰 FLUXO DE CAIXA                        │
├─────────────────────────────────────────┤
│ Saldo Atual: R$ 12.450,00               │
│ Projeção (30 dias): R$ 18.200,00        │
├─────────────────────────────────────────┤
│ [Hoje] [Semana] [Mês] [Ano]             │
├─────────────────────────────────────────┤
│ ┌─ Gráfico de Linha ───────────────┐   │
│ │     ╱╲                             │   │
│ │    ╱  ╲      ╱╲                    │   │
│ │   ╱    ╲    ╱  ╲                   │   │
│ │  ╱      ╲  ╱    ╲                  │   │
│ └────────────────────────────────────┘   │
├─────────────────────────────────────────┤
│ 📈 Entradas: R$ 8.500,00                │
│ 📉 Saídas:   R$ 3.200,00                │
│ 💵 Lucro:    R$ 5.300,00                │
└─────────────────────────────────────────┘
```

---

#### **1.3 Dashboard Executivo**

**Funcionalidades:**
- ✅ KPIs principais em cards grandes
- ✅ Comparação com mês anterior
- ✅ Gráficos de tendência
- ✅ Top 5 clientes
- ✅ Top 5 serviços
- ✅ Alertas e pendências

**Tela:**
```
┌─────────────────────────────────────────┐
│ 📊 DASHBOARD EXECUTIVO                   │
├─────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │ Receita │ │ Despesas│ │  Lucro  │    │
│ │ R$ 8.5K │ │ R$ 3.2K │ │ R$ 5.3K │    │
│ │ +15% ↗  │ │ -5% ↘   │ │ +22% ↗  │    │
│ └─────────┘ └─────────┘ └─────────┘    │
├─────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │Pedidos  │ │ Ticket  │ │Taxa Conv│    │
│ │   125   │ │ R$ 68   │ │  92%    │    │
│ │ +8% ↗   │ │ +3% ↗   │ │ +1% ↗   │    │
│ └─────────┘ └─────────┘ └─────────┘    │
├─────────────────────────────────────────┤
│ 🏆 Top 5 Clientes | 🎯 Top 5 Serviços   │
└─────────────────────────────────────────┘
```

---

### **FASE 2: RELATÓRIOS AVANÇADOS** (2 dias)

#### **2.1 Relatório de Lucro Real**

**Funcionalidades:**
- ✅ Receita bruta
- ✅ (-) Descontos
- ✅ (-) Taxas de máquina
- ✅ = Receita líquida
- ✅ (-) Despesas operacionais
- ✅ = Lucro real
- ✅ Margem de lucro (%)
- ✅ Comparação mensal

**Fórmula:**
```
Lucro Real = (Receita Total - Descontos - Taxas) - Despesas
Margem = (Lucro Real / Receita Total) × 100
```

---

#### **2.2 Relatório de Comissões**

**Funcionalidades:**
- ✅ Comissão por entregador
- ✅ Baseado em entregas realizadas
- ✅ Configuração de % ou valor fixo
- ✅ Histórico de pagamentos
- ✅ Status: Pendente, Pago

**Tela:**
```
┌─────────────────────────────────────────┐
│ 🚚 COMISSÕES - Janeiro 2026              │
├─────────────────────────────────────────┤
│ Entregador    | Entregas | Comissão | ✅ │
│ João Silva    | 45       | R$ 450   | ✅ │
│ Maria Santos  | 38       | R$ 380   | ⏳ │
│ Pedro Costa   | 52       | R$ 520   | ✅ │
├─────────────────────────────────────────┤
│ Total a Pagar: R$ 1.350,00              │
└─────────────────────────────────────────┘
```

---

#### **2.3 Relatório de Impostos**

**Funcionalidades:**
- ✅ Cálculo automático de ISS (2% a 5%)
- ✅ Simples Nacional (faixas)
- ✅ Base de cálculo
- ✅ Valor a recolher
- ✅ Histórico de pagamentos

**Exemplo:**
```
Receita Mensal: R$ 25.000,00
ISS (3%):       R$ 750,00
Simples (6%):   R$ 1.500,00
Total Impostos: R$ 2.250,00
```

---

#### **2.4 Relatório de Metas**

**Funcionalidades:**
- ✅ Definir metas mensais/anuais
- ✅ Acompanhamento em tempo real
- ✅ Progresso visual (%)
- ✅ Projeção de atingimento
- ✅ Alertas de desvio

**Tela:**
```
┌─────────────────────────────────────────┐
│ 🎯 METAS - Janeiro 2026                  │
├─────────────────────────────────────────┤
│ Receita: R$ 18.500 / R$ 25.000 (74%)   │
│ ████████████████░░░░░░░░                │
│ Projeção: R$ 24.200 ⚠️ Abaixo da meta  │
├─────────────────────────────────────────┤
│ Pedidos: 125 / 150 (83%)                │
│ ████████████████████░░░░                │
│ Projeção: 152 ✅ Acima da meta          │
└─────────────────────────────────────────┘
```

---

### **FASE 3: EMISSÃO DE NOTA FISCAL (NFSe)** (3-4 dias)

#### **3.1 Integração com API de NFSe**

**APIs Recomendadas:**

##### **🥇 Opção 1: Focus NFe** (Mais popular)
- ✅ Suporta NFSe de Maceió
- ✅ API REST simples
- ✅ Documentação excelente
- 💰 **Preço:** R$ 49/mês (até 100 notas)
- 🔗 https://focusnfe.com.br

##### **🥈 Opção 2: eNotas**
- ✅ Suporta NFSe de Maceió
- ✅ Interface amigável
- ✅ Emissão sem certificado
- 💰 **Preço:** R$ 39/mês (até 50 notas)
- 🔗 https://enotas.com.br

##### **🥉 Opção 3: NFe.io**
- ✅ Suporta NFSe de Maceió
- ✅ API moderna
- ✅ Webhooks para atualizações
- 💰 **Preço:** R$ 59/mês (até 100 notas)
- 🔗 https://nfe.io

---

#### **3.2 Funcionalidades de NFSe**

**Emissão Automática:**
```typescript
// Quando pedido é marcado como "Entregue"
async function emitirNFSe(pedido) {
  const nfse = {
    prestador: {
      cnpj: "00.000.000/0001-00",
      inscricao_municipal: "123456",
      razao_social: "TENISLAB LTDA"
    },
    tomador: {
      cpf_cnpj: pedido.cliente.cpf,
      nome: pedido.cliente.nome,
      endereco: pedido.cliente.endereco
    },
    servico: {
      codigo: "14.01", // Lavanderia
      discriminacao: "Lavagem e higienização de tênis",
      valor_servicos: pedido.total,
      iss_retido: false,
      aliquota: 3.0 // ISS de Maceió
    }
  };
  
  const response = await focusNFe.emitir(nfse);
  
  // Salvar número da nota no pedido
  await supabase
    .from('service_orders')
    .update({ 
      nfse_number: response.numero,
      nfse_pdf_url: response.pdf_url 
    })
    .eq('id', pedido.id);
    
  // Enviar PDF por WhatsApp
  await enviarNFSeWhatsApp(pedido.cliente.phone, response.pdf_url);
}
```

**Tela no Sistema:**
```
┌─────────────────────────────────────────┐
│ 📄 NOTA FISCAL - OS #091/2026            │
├─────────────────────────────────────────┤
│ Status: ✅ Emitida                       │
│ Número: 12345                            │
│ Data: 25/01/2026 10:30                   │
├─────────────────────────────────────────┤
│ Cliente: EVESON ALBUQUERQUE              │
│ CPF: 000.000.000-00                      │
│ Serviço: Lavagem de tênis                │
│ Valor: R$ 150,00                         │
│ ISS (3%): R$ 4,50                        │
├─────────────────────────────────────────┤
│ [📥 Download PDF] [📱 Enviar WhatsApp]   │
│ [🔄 Cancelar NFSe]                       │
└─────────────────────────────────────────┘
```

---

#### **3.3 Banco de Dados para NFSe**

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  service_order_id UUID REFERENCES service_orders(id),
  nfse_number VARCHAR(50),
  nfse_verification_code VARCHAR(100),
  issue_date TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'emitida', -- emitida, cancelada, erro
  pdf_url TEXT,
  xml_url TEXT,
  error_message TEXT,
  iss_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### **FASE 4: RECURSOS EXTRAS** (2 dias)

#### **4.1 Previsões Inteligentes**

**Usando Machine Learning Simples:**
```typescript
// Prever receita dos próximos 30 dias
function preverReceita(historicoUltimos90Dias) {
  // Média móvel ponderada
  const pesos = [0.5, 0.3, 0.2]; // Mais peso para dados recentes
  const ultimos3Meses = dividirEmMeses(historicoUltimos90Dias);
  
  const previsao = ultimos3Meses.reduce((acc, mes, i) => {
    return acc + (mes.receita * pesos[i]);
  }, 0);
  
  return previsao;
}
```

---

#### **4.2 Alertas Inteligentes**

**Notificações Automáticas:**
- 🔔 Meta mensal em risco (projeção < 80%)
- 🔔 Saldo baixo (< R$ 1.000)
- 🔔 Despesa acima da média
- 🔔 Pedido sem nota fiscal emitida
- 🔔 Comissão pendente há mais de 7 dias

---

#### **4.3 Exportações Avançadas**

**Formatos:**
- ✅ PDF (já tem)
- ✅ Excel (.xlsx) - Novo!
- ✅ CSV - Novo!
- ✅ JSON (para integrações) - Novo!

**Exemplo Excel:**
```typescript
import * as XLSX from 'xlsx';

function exportarParaExcel(dados) {
  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");
  XLSX.writeFile(wb, `relatorio_${Date.now()}.xlsx`);
}
```

---

#### **4.4 Comparações Avançadas**

**Funcionalidades:**
- ✅ Este mês vs. Mês passado
- ✅ Este ano vs. Ano passado
- ✅ Melhor mês do ano
- ✅ Pior mês do ano
- ✅ Tendência (crescimento/queda)
- ✅ Sazonalidade

---

## 💰 RESUMO DE CUSTOS

### **APIs Externas:**

| Serviço | Custo Mensal | Notas Incluídas |
|---------|--------------|-----------------|
| **Focus NFe** | R$ 49 | 100 |
| **eNotas** | R$ 39 | 50 |
| **NFe.io** | R$ 59 | 100 |

**Recomendação:** Focus NFe (melhor custo-benefício)

---

## ⏱️ CRONOGRAMA DE IMPLEMENTAÇÃO

### **Fase 1: Gestão Financeira** (2-3 dias)
- Dia 1: Módulo de Despesas
- Dia 2: Fluxo de Caixa
- Dia 3: Dashboard Executivo

### **Fase 2: Relatórios Avançados** (2 dias)
- Dia 4: Lucro Real + Comissões
- Dia 5: Impostos + Metas

### **Fase 3: NFSe** (3-4 dias)
- Dia 6: Integração com API
- Dia 7: Emissão automática
- Dia 8: Testes e ajustes
- Dia 9: Deploy e treinamento

### **Fase 4: Recursos Extras** (2 dias)
- Dia 10: Previsões + Alertas
- Dia 11: Exportações + Comparações

**TOTAL: 11 dias de desenvolvimento**

---

## 🎯 PRIORIZAÇÃO

### **🔴 Alta Prioridade (Fazer AGORA):**
1. Módulo de Despesas
2. Fluxo de Caixa
3. Dashboard Executivo
4. Lucro Real

### **🟡 Média Prioridade (Fazer DEPOIS):**
5. NFSe (quando tiver CNPJ e inscrição municipal)
6. Comissões
7. Impostos
8. Metas

### **🟢 Baixa Prioridade (Fazer NO FUTURO):**
9. Previsões Inteligentes
10. Alertas Avançados
11. Exportações Extras

---

## ✅ BENEFÍCIOS

### **Financeiro:**
- 💰 Controle total de lucro real
- 💰 Redução de custos desnecessários
- 💰 Melhores decisões financeiras

### **Operacional:**
- ⚡ Emissão automática de notas
- ⚡ Menos tempo com burocracia
- ⚡ Relatórios em segundos

### **Legal:**
- 🔒 Conformidade fiscal
- 🔒 Notas fiscais automáticas
- 🔒 Histórico completo

### **Estratégico:**
- 📊 Visão clara do negócio
- 📊 Previsões confiáveis
- 📊 Metas bem definidas

---

## 🚀 PRÓXIMOS PASSOS

1. **Você decide:** Quais fases implementar primeiro?
2. **Eu implemento:** Desenvolvimento completo
3. **Você testa:** Validação em produção
4. **Ajustes finais:** Correções e melhorias
5. **Deploy:** Sistema completo em produção!

---

## ❓ PERGUNTAS FREQUENTES

### **1. Preciso de certificado digital?**
Não! As APIs modernas (eNotas, Focus NFe) emitem sem certificado.

### **2. Funciona em Maceió?**
Sim! Todas as APIs suportam NFSe de Maceió.

### **3. Quanto custa por mês?**
~R$ 50/mês para emissão de até 100 notas.

### **4. E se eu ultrapassar 100 notas?**
Planos maiores: R$ 99/mês (300 notas) ou R$ 199/mês (ilimitado).

### **5. Posso cancelar uma nota?**
Sim! Pelo sistema, em poucos cliques.

### **6. O cliente recebe a nota automaticamente?**
Sim! Por WhatsApp e email.

---

## 📞 CONTATO

**Dúvidas?** Me chama que eu explico qualquer parte! 🚀

---

**Documento criado em:** 25/01/2026  
**Versão:** 1.0  
**Autor:** Manus AI
