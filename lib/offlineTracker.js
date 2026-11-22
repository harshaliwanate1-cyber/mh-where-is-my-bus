import { db } from './offlineDb';

// दोन GPS बिंदूंमधील अंतर (किलोमीटरमध्ये) मोजण्याचे सूत्र (Haversine Formula)
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // पृथ्वीची त्रिज्या (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ऑफलाईन मोडमध्ये जवळचा स्टॉप शोधणे
export async function findNearestStopOffline(routeId, userLat, userLng) {
  const stops = await db.stops.where('route_id').equals(routeId).sortBy('sequence');
  let nearestStop = null;
  let minDistance = Infinity;

  for (const stop of stops) {
    const dist = calculateDistance(userLat, userLng, stop.lat, stop.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestStop = stop;
    }
  }

  return {
    stopName: nearestStop?.stop_name || 'अज्ञात ठिकाण',
    distanceKm: minDistance.toFixed(1),
    isArrived: minDistance <= 0.5 // ५०० मीटरच्या आत असल्यास स्टॉपवर पोहोचले
  };
}
