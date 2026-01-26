// Tipos para o módulo financeiro do TenisLab
// Data: 25/01/2026

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string | null;
  amount: number;
  supplier: string | null;
  payment_method: string | null;
  receipt_url: string | null;
  is_recurring: boolean;
  recurrence_frequency: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  name: string;
  icon: string;
  color: string;
}

export interface FinancialMetrics {
  // Receitas
  totalRevenue: number;
  totalReceived: number;
  projectedRevenue: number;
  totalProjected: number;
  lostRevenue: number;
  totalDiscounts: number;
  thisMonthRevenue: number;
  thisWeekRevenue: number;
  averageTicket: number;
  
  // Despesas
  totalExpenses: number;
  thisMonthExpenses: number;
  thisWeekExpenses: number;
  recurringExpenses: number;
  
  // Lucro
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  
  // Fluxo de Caixa
  currentBalance: number;
  projectedBalance: number;
  cashFlow: CashFlowEntry[];
  
  // Comparações
  revenueGrowth: number;
  expenseGrowth: number;
  profitGrowth: number;
}

export interface CashFlowEntry {
  date: string;
  revenue: number;
  expenses: number;
  balance: number;
  accumulated: number;
}

export interface TopClient {
  name: string;
  total: number;
  orders: number;
}

export interface TopService {
  name: string;
  quantity: number;
  revenue: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface ExpensesByCategory {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export type ExpenseFormData = Omit<Expense, 'id' | 'created_at' | 'updated_at'>;

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { name: 'Produtos', icon: '📦', color: '#3b82f6' },
  { name: 'Água/Luz', icon: '💡', color: '#10b981' },
  { name: 'Aluguel', icon: '🏠', color: '#f59e0b' },
  { name: 'Salários', icon: '💰', color: '#ef4444' },
  { name: 'Marketing', icon: '📢', color: '#8b5cf6' },
  { name: 'Manutenção', icon: '🔧', color: '#ec4899' },
  { name: 'Transporte', icon: '🚚', color: '#06b6d4' },
  { name: 'Impostos', icon: '📋', color: '#f97316' },
  { name: 'Internet/Telefone', icon: '📱', color: '#14b8a6' },
  { name: 'Outros', icon: '📝', color: '#64748b' },
];

export const PAYMENT_METHODS = [
  'Dinheiro',
  'Pix',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Transferência',
  'Boleto',
];

export const RECURRENCE_FREQUENCIES = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'yearly', label: 'Anual' },
];
