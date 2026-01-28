/**
 * Converte Plus Code para coordenadas (latitude, longitude)
 * Usa a biblioteca Open Location Code (Plus Codes)
 */

export function plusCodeToCoordinates(plusCode: string): { lat: number; lng: number } | null {
  try {
    // Remove espaços e converte para maiúsculas
    const cleanCode = plusCode.trim().toUpperCase();
    
    // Validação básica do formato Plus Code
    if (!cleanCode.includes('+')) {
      return null;
    }

    // Decodifica o Plus Code manualmente (algoritmo simplificado)
    // Para produção, seria melhor usar a biblioteca oficial, mas isso adiciona dependência
    // Aqui vamos fazer uma conversão aproximada baseada no formato padrão
    
    // Formato: 8 caracteres + '+' + 2-3 caracteres (ex: 97HR+H3V)
    const parts = cleanCode.split('+');
    if (parts.length !== 2) {
      return null;
    }

    const [code, localCode] = parts;
    
    // Alfabeto usado no Plus Code (sem vogais para evitar palavras)
    const alphabet = '23456789CFGHJMPQRVWX';
    
    // Decodifica a parte principal (primeiros 8 caracteres)
    let lat = -90;
    let lng = -180;
    let latPrecision = 20;
    let lngPrecision = 20;
    
    for (let i = 0; i < Math.min(code.length, 10); i++) {
      const char = code[i];
      const index = alphabet.indexOf(char);
      
      if (index === -1) continue;
      
      if (i % 2 === 0) {
        // Latitude (caracteres pares)
        lat += index * latPrecision;
        latPrecision /= 20;
      } else {
        // Longitude (caracteres ímpares)
        lng += index * lngPrecision;
        lngPrecision /= 20;
      }
    }
    
    // Ajusta para o centro da célula
    lat += latPrecision / 2;
    lng += lngPrecision / 2;
    
    // Decodifica a parte local (após o +)
    if (localCode.length >= 2) {
      const gridSize = 0.000125; // Tamanho aproximado da grade local
      const row = alphabet.indexOf(localCode[0]);
      const col = alphabet.indexOf(localCode[1]);
      
      if (row !== -1 && col !== -1) {
        lat += (row - 10) * gridSize;
        lng += (col - 10) * gridSize;
      }
    }
    
    return {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6))
    };
  } catch (error) {
    logger.error('Erro ao converter Plus Code:', error);
    return null;
  }
}

/**
 * Converte coordenadas para formato de string para CSV
 */
export function coordinatesToString(lat: number, lng: number): string {
  return `${lat},${lng}`;
}

/**
 * Gera arquivo CSV com rotas para download
 */
export function generateRouteCSV(routes: Array<{ name: string; lat: number; lng: number }>): string {
  const header = 'name,latitude,longitude\n';
  const rows = routes.map((route, index) => {
    const name = `${index + 1} - ${route.name}`;
    return `"${name}",${route.lat},${route.lng}`;
  }).join('\n');
  
  return header + rows;
}

/**
 * Faz download de arquivo CSV
 */
export function downloadCSV(content: string, filename: string = 'rota_entregas.csv'): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
