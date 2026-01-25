/**
 * Tipos e Interfaces do TenisLab
 * Define a estrutura de dados do sistema
 */

// Status possíveis de um pedido
export type Status = 
  | "Recebido" 
  | "Em espera" 
  | "Em serviço" 
  | "Em finalização" 
  | "Pronto" 
  | "Coleta"
  | "Em Rota" 
  | "Entregue" 
  | "Cancelado";

// Tipo de entrega
export type TipoEntrega = "entrega" | "retirada";

// Método de pagamento
export type MetodoPagamento = 
  | "Pix" 
  | "Dinheiro" 
  | "Cartão de Crédito" 
  | "Cartão de Débito" 
  | "Transferência";

// Roles de usuário
export type UserRole = "ADMIN" | "ATENDENTE" | "ENTREGADOR" | "OPERACIONAL";

// Interface para Cliente
export interface Cliente {
  id?: string;
  name: string;
  phone: string;
  plus_code?: string;
  coordinates?: string;
  complement?: string;
  created_at?: string;
}

// Interface para Item do Pedido
export interface ItemPedido {
  id?: string;
  service: string;
  quantity: number;
  price: number;
}

// Interface para Pedido/Ordem de Serviço
export interface Pedido {
  id: string;
  os_number: string;
  status: Status;
  entry_date: string;
  delivery_date?: string;
  pickup_date?: string;
  tipo_entrega: TipoEntrega;
  total: number;
  payment_method?: MetodoPagamento;
  payment_confirmed: boolean;
  pay_on_entry: boolean;
  priority: boolean;
  delivery_notes?: string;
  failed_delivery: boolean;
  previous_status?: Status;
  ready_for_pickup: boolean;
  accepted_at?: string;
  updated_at?: string;
  created_at?: string;
  items: ItemPedido[];
  clients: Cliente | null;
  client_id?: string;
}

// Interface para Tracking de Entrega
export interface DeliveryTracking {
  id: string;
  order_id: string;
  status: Status;
  timestamp: string;
  location?: string;
  notes?: string;
}

// Interface para Push Subscription
export interface PushSubscription {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  created_at: string;
}

// Interface para Coordenadas
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Interface para Alerta
export interface Alert {
  id: string;
  type: 'overdue' | 'priority' | 'payment';
  message: string;
  orderId: string;
  severity: 'low' | 'medium' | 'high';
}

// Interface para Filtros de Pedidos
export interface PedidoFilters {
  status?: Status[];
  tipo_entrega?: TipoEntrega;
  payment_confirmed?: boolean;
  priority?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// Interface para Estatísticas
export interface Statistics {
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  total_revenue: number;
  average_order_value: number;
}

// Type Guards
export function isPedido(obj: any): obj is Pedido {
  return obj && typeof obj.id === 'string' && typeof obj.os_number === 'string';
}

export function isCliente(obj: any): obj is Cliente {
  return obj && typeof obj.name === 'string' && typeof obj.phone === 'string';
}
