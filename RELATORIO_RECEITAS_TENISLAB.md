# 📊 Relatório Detalhado de Receitas - TenisLab

**Data de Geração:** 25/01/2026
**Fonte dos Dados:** `service_orders` (Supabase)

**Propósito:** Este relatório apresenta uma análise completa das receitas da TenisLab, formatado para fácil leitura e para ser utilizado como contexto em ferramentas de IA como o GPT.

---

## 📈 Resumo Executivo de Métricas

Esta seção apresenta os principais indicadores de performance financeira baseados nas ordens de serviço registradas.

| Métrica                       | Valor (R$)              | Descrição                                                                 |
| :---------------------------- | :---------------------- | :------------------------------------------------------------------------ |
| **Total Recebido (Líquido)**  | `R$ {stats.totalReceived}` | Soma de todos os pagamentos confirmados, já descontando taxas de máquina.   |
| **Receita do Mês Atual**      | `R$ {stats.thisMonthTotal}` | Receita líquida gerada no mês corrente (de 01 a 31).                      |
| **Receita da Semana Atual**   | `R$ {stats.thisWeekTotal}`  | Receita líquida gerada na semana corrente (de Domingo a Sábado).          |
| **Ticket Médio**              | `R$ {stats.averageTicket}`  | Valor médio por ordem de serviço (excluindo canceladas).                  |
| **Total de Descontos**        | `R$ {stats.totalDiscounts}` | Soma de todos os descontos percentuais e taxas de máquina aplicadas.      |
| **A Receber**                 | `R$ {stats.projectedRevenue}` | Valor total de ordens entregues mas ainda não pagas.                      |
| **Projeção Total**            | `R$ {stats.totalProjected}` | Soma de todas as receitas (recebidas + pendentes), exceto canceladas.     |
| **Receita Perdida (Cancelados)** | `R$ {stats.lostRevenue}`    | Valor total de todas as ordens com status "Cancelado".                   |

---

## ⚙️ Breakdown Operacional

Análise da distribuição das ordens de serviço por status e método de pagamento.

### Distribuição por Status de Ordem

| Status       | Quantidade de Ordens |
| :----------- | :------------------- |
| Recebido     | `{stats.statusDistribution.Recebido}`      |
| Em serviço   | `{stats.statusDistribution["Em serviço"]}`  |
| Pronto       | `{stats.statusDistribution.Pronto}`        |
| Entregue     | `{stats.statusDistribution.Entregue}`      |
| Cancelado    | `{stats.statusDistribution.Cancelado}`     |

### Breakdown por Método de Pagamento (Receita Líquida)

| Método de Pagamento | Receita Total (R$) |
| :------------------ | :----------------- |
| PIX                 | `{stats.paymentBreakdown.PIX}`           |
| Cartão de Crédito   | `{stats.paymentBreakdown["Cartão de Crédito"]}` |
| Cartão de Débito    | `{stats.paymentBreakdown["Cartão de Débito"]}`  |
| Dinheiro            | `{stats.paymentBreakdown.Dinheiro}`        |
| Não Informado       | `{stats.paymentBreakdown["Não informado"]}`    |

---

## 📅 Análise Temporal de Receitas

Visualização da receita líquida ao longo do tempo para identificar tendências.

### Receita por Mês (Últimos 12 meses)

| Mês/Ano   | Receita Líquida (R$) |
| :-------- | :------------------- |
| Jan/26    | `{projectionBreakdown.months["Jan/26"]}`        |
| Dez/25    | `{projectionBreakdown.months["Dez/25"]}`        |
| Nov/25    | `{projectionBreakdown.months["Nov/25"]}`        |
| ...       | ...                  |

### Receita por Semana (Últimas 8 semanas)

| Semana (Início em) | Receita Líquida (R$) |
| :----------------- | :------------------- |
| `{week1_start_date}` | `{projectionBreakdown.weeks[week1_key]}`       |
| `{week2_start_date}` | `{projectionBreakdown.weeks[week2_key]}`       |
| ...                | ...                  |

---

## 📋 Tabela de Transações Confirmadas (Dados Brutos para IA)

Esta tabela contém os dados brutos de todas as transações com pagamento confirmado, ideal para análises aprofundadas.

```markdown
| OS    | Cliente        | Data       | Método Pagamento | Valor Bruto | Taxa Máquina | Desconto (%) | Valor Líquido |
| :---- | :------------- | :--------- | :--------------- | :---------- | :----------- | :----------- | :------------ |
| 1001  | João Silva     | 24/01/2026 | PIX              | 100.00      | 0.00         | 0            | 100.00        |
| 1002  | Maria Oliveira | 23/01/2026 | Cartão de Crédito| 150.00      | 7.50         | 10           | 127.50        |
| ...   | ...            | ...        | ...              | ...         | ...          | ...          | ...           |
```

**Instrução para GPT:** Para usar os dados abaixo, copie a tabela e use o seguinte prompt:
`Analise os seguintes dados de transações de uma lavanderia de tênis. Calcule o total de receita líquida, o número de transações e a receita média por método de pagamento. Os dados estão no formato: | OS | Cliente | Data | Método Pagamento | Valor Bruto | Taxa Máquina | Desconto (%) | Valor Líquido |`

---

## 🚀 Conclusão e Próximos Passos

O dashboard de receitas foi restaurado para focar exclusivamente nas entradas, conforme solicitado. Os erros de build foram corrigidos e o sistema está estável.

- **O que fazer agora:** Aguarde o deploy do Vercel (aproximadamente 2 minutos) e acesse a página de finanças para visualizar o dashboard atualizado.
- **Backup:** Este relatório serve como um backup detalhado e um ponto de partida para qualquer análise futura que você queira fazer com assistentes de IA.

Qualquer dúvida, estou à disposição!
