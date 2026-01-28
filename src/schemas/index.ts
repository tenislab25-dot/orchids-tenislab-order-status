import { z } from 'zod';

// ============================================
// CLIENT SCHEMAS
// ============================================

export const CreateClientSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100, 'Nome muito longo'),
  phone: z.string().regex(/^\d{10,11}$/, 'Telefone inválido (use apenas números, 10-11 dígitos)'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  plus_code: z.string().max(20).optional().or(z.literal('')),
  coordinates: z.string().max(100).optional().or(z.literal('')),
  complement: z.string().max(200).optional().or(z.literal('')),
  is_vip: z.boolean().optional(),
});

export const UpdateClientSchema = CreateClientSchema.partial();

export type CreateClientDTO = z.infer<typeof CreateClientSchema>;
export type UpdateClientDTO = z.infer<typeof UpdateClientSchema>;

// ============================================
// COUPON SCHEMAS
// ============================================

export const CreateCouponSchema = z.object({
  code: z.string().min(3, 'Código deve ter no mínimo 3 caracteres').max(20, 'Código muito longo').toUpperCase(),
  discount_percent: z.number().min(1, 'Desconto deve ser maior que 0').max(100, 'Desconto não pode ser maior que 100'),
  expires_at: z.string().datetime('Data de expiração inválida'),
  total_limit: z.number().int().min(1, 'Limite deve ser maior que 0'),
  is_active: z.boolean().optional(),
});

export const UpdateCouponSchema = CreateCouponSchema.partial();

export const ValidateCouponSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
});

export const ApplyCouponSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  order_id: z.string().uuid('ID do pedido inválido'),
  client_id: z.string().uuid('ID do cliente inválido'),
  order_total: z.number().min(0, 'Total do pedido inválido'),
});

export type CreateCouponDTO = z.infer<typeof CreateCouponSchema>;
export type UpdateCouponDTO = z.infer<typeof UpdateCouponSchema>;
export type ValidateCouponDTO = z.infer<typeof ValidateCouponSchema>;
export type ApplyCouponDTO = z.infer<typeof ApplyCouponSchema>;

// ============================================
// ORDER SCHEMAS
// ============================================

export const UpdateOrderStatusSchema = z.object({
  order_id: z.string().uuid('ID do pedido inválido'),
  status: z.enum([
    'Recebido',
    'Em espera',
    'Em serviço',
    'Em finalização',
    'Pronto',
    'Em Rota',
    'Entregue',
    'Cancelado',
    'Coleta'
  ], { errorMap: () => ({ message: 'Status inválido' }) }),
});

export type UpdateOrderStatusDTO = z.infer<typeof UpdateOrderStatusSchema>;

// ============================================
// PAYMENT SCHEMAS
// ============================================

export const CreatePixPaymentSchema = z.object({
  order_id: z.string().uuid('ID do pedido inválido'),
  amount: z.number().min(0.01, 'Valor deve ser maior que 0'),
});

export const CreateCardPaymentSchema = z.object({
  order_id: z.string().uuid('ID do pedido inválido'),
  amount: z.number().min(0.01, 'Valor deve ser maior que 0'),
});

export type CreatePixPaymentDTO = z.infer<typeof CreatePixPaymentSchema>;
export type CreateCardPaymentDTO = z.infer<typeof CreateCardPaymentSchema>;

// ============================================
// HELPER: Validar e retornar erro formatado
// ============================================

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: any[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  };
}
