export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

export const TENISLAB_COORDS = {
  lat: -9.6498,
  lng: -35.7089,
  address: "Maceió, AL" // User should be able to update this in a config later
};

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    // Using Nominatim (OpenStreetMap) - Free and no API key required for low volume
    // Important: Include a User-Agent as per Nominatim usage policy
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          'User-Agent': 'TenisLabDeliverySystem/1.0'
        }
      }
    );

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function optimizeRoute(startCoords: { lat: number, lng: number }, locations: any[]) {
  const optimized: any[] = [];
  let currentCoords = startCoords;
  const remaining = [...locations];

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let minDistance = calculateDistance(
      currentCoords.lat, 
      currentCoords.lng, 
      remaining[0].lat, 
      remaining[0].lng
    );

    for (let i = 1; i < remaining.length; i++) {
      const dist = calculateDistance(
        currentCoords.lat, 
        currentCoords.lng, 
        remaining[i].lat, 
        remaining[i].lng
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }

    const next = remaining.splice(nearestIndex, 1)[0];
    optimized.push(next);
    currentCoords = { lat: next.lat, lng: next.lng };
  }

  return optimized;
}
