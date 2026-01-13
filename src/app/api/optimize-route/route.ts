import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { waypoints } = await request.json();

    if (!waypoints || waypoints.length < 2) {
      return NextResponse.json(
        { error: 'É necessário pelo menos 2 pontos para otimizar' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    console.log('API Key presente:', !!apiKey);
    console.log('API Key primeiros caracteres:', apiKey?.substring(0, 10));
    
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      console.error('API Key não configurada');
      return NextResponse.json(
        { error: 'API Key do Google Maps não configurada' },
        { status: 500 }
      );
    }

    console.log('Total de waypoints recebidos:', waypoints.length);
    console.log('Waypoints:', JSON.stringify(waypoints, null, 2));

    // Converter Plus Codes para coordenadas usando Google Geocoding API
    const geocodeResults = [];
    for (const wp of waypoints) {
      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(wp.location)}&key=${apiKey}`;
        console.log(`Geocoding [${wp.osNumber}]:`, wp.location);
        
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        
        console.log(`Geocode status [${wp.osNumber}]:`, geocodeData.status);
        
        if (geocodeData.error_message) {
          console.error(`Geocode error [${wp.osNumber}]:`, geocodeData.error_message);
        }
        
        if (geocodeData.status === 'REQUEST_DENIED') {
          return NextResponse.json(
            { error: `API Key inválida ou sem permissão: ${geocodeData.error_message}` },
            { status: 403 }
          );
        }
        
        if (geocodeData.results && geocodeData.results[0]) {
          const { lat, lng } = geocodeData.results[0].geometry.location;
          console.log(`Sucesso [${wp.osNumber}]:`, lat, lng);
          geocodeResults.push({
            id: wp.id,
            lat,
            lng,
            location: wp.location,
            osNumber: wp.osNumber
          });
        } else {
          console.warn(`Não encontrou coordenadas para [${wp.osNumber}]:`, wp.location);
        }
      } catch (error) {
        console.error(`Erro ao geocodificar [${wp.osNumber}] ${wp.location}:`, error);
      }
    }

    console.log('Total de coordenadas válidas:', geocodeResults.length);

    if (geocodeResults.length < 2) {
      return NextResponse.json(
        { error: `Apenas ${geocodeResults.length} endereço(s) puderam ser geocodificados. É necessário pelo menos 2 endereços válidos.` },
        { status: 400 }
      );
    }

    const validCoordinates = geocodeResults;

    // Usar algoritmo simples de vizinho mais próximo para otimizar
    // (Para produção, considere usar Google Routes API ou Directions API)
    const optimized = nearestNeighborOptimization(validCoordinates);

    return NextResponse.json({
      optimizedOrder: optimized.map((coord: any) => coord.id)
    });

  } catch (error) {
    console.error('Erro ao otimizar rota:', error);
    return NextResponse.json(
      { error: 'Erro ao processar otimização de rota' },
      { status: 500 }
    );
  }
}

// Algoritmo do vizinho mais próximo para otimizar rota
function nearestNeighborOptimization(points: any[]) {
  if (points.length <= 1) return points;

  const optimized = [];
  const remaining = [...points];
  
  // Começar com o primeiro ponto
  let current = remaining.shift()!;
  optimized.push(current);

  // Enquanto houver pontos restantes
  while (remaining.length > 0) {
    // Encontrar o ponto mais próximo
    let nearestIndex = 0;
    let minDistance = calculateDistance(
      current.lat,
      current.lng,
      remaining[0].lat,
      remaining[0].lng
    );

    for (let i = 1; i < remaining.length; i++) {
      const distance = calculateDistance(
        current.lat,
        current.lng,
        remaining[i].lat,
        remaining[i].lng
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    // Mover o ponto mais próximo para a rota otimizada
    current = remaining.splice(nearestIndex, 1)[0];
    optimized.push(current);
  }

  return optimized;
}

// Calcular distância entre dois pontos (fórmula de Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number) {
  return degrees * (Math.PI / 180);
}
