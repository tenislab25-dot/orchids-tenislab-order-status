/**
 * Logger condicional
 * Em produção, apenas erros são logados
 * Em desenvolvimento, todos os logs são exibidos
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log de informação (apenas em desenvolvimento)
   */
  log: (...args: any[]) => {
    if (isDev) {
      logger.log(...args);
    }
  },

  /**
   * Log de informação (apenas em desenvolvimento)
   */
  info: (...args: any[]) => {
    if (isDev) {
      logger.info(...args);
    }
  },

  /**
   * Log de aviso (apenas em desenvolvimento)
   */
  warn: (...args: any[]) => {
    if (isDev) {
      logger.warn(...args);
    }
  },

  /**
   * Log de erro (sempre logado, mesmo em produção)
   */
  error: (...args: any[]) => {
    logger.error(...args);
  },

  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debug: (...args: any[]) => {
    if (isDev) {
      logger.debug(...args);
    }
  },
};
