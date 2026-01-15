/**
 * Utilitários para formatação de datas
 * 
 * PROBLEMA: new Date("YYYY-MM-DD") interpreta como UTC 00:00
 * No Brasil (GMT-3), isso vira 21:00 do dia anterior
 * 
 * SOLUÇÃO: Tratar datas do banco como strings, não como Date objects
 */

/**
 * Formata data do banco (YYYY-MM-DD) para exibição (DD/MM/YYYY)
 * SEM conversão de timezone
 * 
 * @param dateString - Data no formato YYYY-MM-DD ou null/undefined
 * @returns Data formatada DD/MM/YYYY ou 'N/A'
 * 
 * @example
 * formatDate("2026-01-21") // "21/01/2026"
 * formatDate(null) // "N/A"
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  
  // Se já está no formato DD/MM/YYYY, retorna direto
  if (dateString.includes('/')) return dateString;
  
  // YYYY-MM-DD -> DD/MM/YYYY
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Formata datetime do banco (timestamp) para exibição
 * Mantém timezone correto (para campos com hora)
 * 
 * @param dateTimeString - Timestamp ou null/undefined
 * @returns Data e hora formatadas ou 'N/A'
 * 
 * @example
 * formatDateTime("2026-01-21T15:30:00Z") // "21/01/2026, 12:30"
 * formatDateTime(null) // "N/A"
 */
export function formatDateTime(dateTimeString: string | null | undefined): string {
  if (!dateTimeString) return 'N/A';
  
  const date = new Date(dateTimeString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formata data curta (DD/MM) sem ano
 * SEM conversão de timezone
 * 
 * @param dateString - Data no formato YYYY-MM-DD ou DD/MM/YYYY
 * @returns Data formatada DD/MM ou 'N/A'
 * 
 * @example
 * formatDateShort("2026-01-21") // "21/01"
 * formatDateShort("21/01/2026") // "21/01"
 */
export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  
  if (dateString.includes('/')) {
    const [day, month] = dateString.split('/');
    return `${day}/${month}`;
  }
  
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}`;
}

/**
 * Compara se uma data (YYYY-MM-DD) é anterior a hoje
 * SEM conversão de timezone
 * 
 * @param dateString - Data no formato YYYY-MM-DD
 * @returns true se a data é anterior a hoje
 * 
 * @example
 * isDateBefore("2026-01-20") // true (se hoje for 21/01/2026)
 */
export function isDateBefore(dateString: string, referenceDate: Date = new Date()): boolean {
  if (!dateString) return false;
  
  const today = referenceDate.toISOString().split('T')[0];
  return dateString < today;
}
