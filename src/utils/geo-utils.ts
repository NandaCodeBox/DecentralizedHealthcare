/**
 * Calculate distance between two geographic coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a point is within a circular area
 * @param centerLat Center latitude
 * @param centerLng Center longitude
 * @param pointLat Point latitude
 * @param pointLng Point longitude
 * @param radiusKm Radius in kilometers
 * @returns True if point is within the radius
 */
export function isWithinRadius(
  centerLat: number, 
  centerLng: number, 
  pointLat: number, 
  pointLng: number, 
  radiusKm: number
): boolean {
  const distance = calculateDistance(centerLat, centerLng, pointLat, pointLng);
  return distance <= radiusKm;
}

/**
 * Calculate bearing (direction) from one point to another
 * @param lat1 Starting latitude
 * @param lng1 Starting longitude
 * @param lat2 Ending latitude
 * @param lng2 Ending longitude
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = toRadians(lng2 - lng1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  
  let bearing = Math.atan2(y, x);
  bearing = (bearing * 180 / Math.PI + 360) % 360; // Convert to degrees and normalize
  
  return Math.round(bearing);
}

/**
 * Get cardinal direction from bearing
 * @param bearing Bearing in degrees
 * @returns Cardinal direction (N, NE, E, SE, S, SW, W, NW)
 */
export function getCardinalDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Find the center point of multiple coordinates
 * @param coordinates Array of {lat, lng} objects
 * @returns Center point {lat, lng}
 */
export function findCenterPoint(coordinates: Array<{lat: number, lng: number}>): {lat: number, lng: number} {
  if (coordinates.length === 0) {
    throw new Error('Cannot find center of empty coordinates array');
  }
  
  if (coordinates.length === 1) {
    return coordinates[0];
  }
  
  let x = 0;
  let y = 0;
  let z = 0;
  
  coordinates.forEach(coord => {
    const latRad = toRadians(coord.lat);
    const lngRad = toRadians(coord.lng);
    
    x += Math.cos(latRad) * Math.cos(lngRad);
    y += Math.cos(latRad) * Math.sin(lngRad);
    z += Math.sin(latRad);
  });
  
  const total = coordinates.length;
  x = x / total;
  y = y / total;
  z = z / total;
  
  const centralLng = Math.atan2(y, x);
  const centralSquareRoot = Math.sqrt(x * x + y * y);
  const centralLat = Math.atan2(z, centralSquareRoot);
  
  return {
    lat: Math.round(centralLat * 180 / Math.PI * 1000000) / 1000000,
    lng: Math.round(centralLng * 180 / Math.PI * 1000000) / 1000000
  };
}

/**
 * Sort locations by distance from a reference point
 * @param referencePoint Reference point {lat, lng}
 * @param locations Array of locations with coordinates
 * @returns Sorted array with distance information
 */
export function sortByDistance<T extends {location: {coordinates: {lat: number, lng: number}}}>(
  referencePoint: {lat: number, lng: number},
  locations: T[]
): Array<T & {distance: number}> {
  return locations
    .map(location => ({
      ...location,
      distance: calculateDistance(
        referencePoint.lat,
        referencePoint.lng,
        location.location.coordinates.lat,
        location.location.coordinates.lng
      )
    }))
    .sort((a, b) => a.distance - b.distance);
}