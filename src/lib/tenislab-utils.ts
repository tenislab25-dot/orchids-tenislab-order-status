/**
 * Funções utilitárias do TenisLab
 * Centraliza código duplicado e facilita manutenção
 */

/**
 * Retorna a data de hoje no formato YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

/**
 * Formata uma data para o formato YYYY-MM-DD
 */
export function formatDateToString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Adiciona dias úteis a uma data (ignora fins de semana)
 */
export function addBusinessDays(startDate: string, days: number): string {
  const date = new Date(startDate + 'T00:00:00');
  let addedDays = 0;
  
  while (addedDays < days) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }
  
  return formatDateToString(date);
}

/**
 * Calcula distância entre dois pontos usando fórmula de Haversine
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Formata valor monetário para Real Brasileiro
 */
export function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Limpa telefone (apenas números)
 */
export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Adiciona código do país (55) se não tiver
 */
export function addCountryCode(phone: string): string {
  const cleaned = cleanPhone(phone);
  return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
}

/**
 * Gera URL do WhatsApp com mensagem pré-formatada
 */
export function getWhatsAppURL(phone: string, message: string): string {
  const whatsappPhone = addCountryCode(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${whatsappPhone}?text=${encodedMessage}`;
}

/**
 * Abre WhatsApp em nova aba
 */
export function openWhatsApp(phone: string, message: string): void {
  const url = getWhatsAppURL(phone, message);
  window.open(url, '_blank');
}

/**
 * Gera mensagem de WhatsApp para pedido pronto
 */
export function getReadyOrderMessage(clientName: string): string {
  return `Olá ${clientName}! Seus tênis estão prontinhos e limpos na Tenislab. ✨\n\n` +
    `Já estão aguardando sua retirada ou serão entregues pelo nosso entregador em breve.\n\n` +
    `Qualquer dúvida, estamos à disposição!`;
}

/**
 * Gera mensagem de WhatsApp para pedido entregue
 */
export function getDeliveredOrderMessage(
  clientName: string,
  osNumber: string,
  total: number,
  paymentLink: string
): string {
  return `Olá ${clientName}! Seu pedido #${osNumber} foi entregue! 📦\n\n` +
    `Valor total: ${formatCurrency(total)}\n\n` +
    `Para realizar o pagamento via Pix ou ver os detalhes, acesse o link abaixo:\n${paymentLink}\n\n` +
    `Gostou do resultado? Se puder nos avaliar no Google, ajuda muito nosso laboratório:\nhttps://g.page/r/CWIZ5KPcIIJVEBM/review\n\n` +
    `Obrigado pela preferência!`;
}

/**
 * Verifica se uma data está atrasada
 */
export function isOverdue(dateString: string): boolean {
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Verifica se uma data é hoje
 */
export function isToday(dateString: string): boolean {
  return dateString === getTodayDateString();
}

/**
 * Rola a página para um elemento específico
 */
export function scrollToElement(elementId: string, behavior: ScrollBehavior = 'smooth'): void {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior, block: 'center' });
  }
}

/**
 * Rola a página para o topo
 */
export function scrollToTop(behavior: ScrollBehavior = 'smooth'): void {
  window.scrollTo({ top: 0, behavior });
}
