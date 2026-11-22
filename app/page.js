'use client';
import { useEffect, useState } from 'react';
import { db, seedOfflineData } from '../lib/offlineDb';
import { findNearestStopOffline } from '../lib/offlineTracker';

export default function WhereIsMyBusApp() {
  const [isOnline, setIsOnline] = useState(true);
  const [stops, setStops] = useState([]);
  const [liveStatus, setLiveStatus] = useState({
    stopName: 'GPS शोधत आहे...',
    distanceKm: '0.0',
    isArrived: false
  });
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    // १. इंटरनेट स्टेटस तपासणे
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      syncQueuedLocations(); // रेंज येताच ऑफलाईन डेटा सर्व्हरवर पाठवा
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // २. ऑफलाईन डेटा लोड करणे
    async function init() {
      await seedOfflineData();
      const routeStops = await db.stops.where('route_id').equals('NH53-NAG-AMR').sortBy('sequence');
      setStops(routeStops);
    }
    init();

    // ३. सॅटेलाईट GPS ट्रॅकिंग सुरू करणे (इंटरनेटशिवाय चालते)
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });

        // ऑफलाईन डेटाबेसवरून जवळचा स्टॉप शोधणे
        const status = await findNearestStopOffline('NH53-NAG-AMR', latitude, longitude);
        setLiveStatus(status);

        // नेटवर्क नसल्यास लोकेशन फोनमध्ये सेव्ह करणे
        if (!navigator.onLine) {
          await db.offline_sync_queue.add({
            bus_id: 'MH40-N-8412',
            lat: latitude,
            lng: longitude,
            timestamp: new Date().toISOString()
          });
        }
      },
      (err) => console.error('GPS Error:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // नेटवर्क परत आल्यावर साठवलेले लोकेशन Supabase वर सिंक करणे
  async function syncQueuedLocations() {
    const pending = await db.offline_sync_queue.toArray();
    if (pending.length > 0) {
      console.log('Syncing offline locations to Supabase:', pending);
      await db.offline_sync_queue.clear();
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans">
      {/* वरचा स्टेटस बार */}
      <div className="bg-red-700 text-white p-4 rounded-xl shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold">Maharashtra Bus Live</h1>
          <p className="text-xs opacity-90">MH-40 N-8412 • नागपूर - अमरावती</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isOnline ? 'bg-green-500' : 'bg-amber-500'}`}>
          {isOnline ? '● Online' : '● Offline GPS Active'}
        </span>
      </div>

      {/* लाईव्ह लोकेशन कार्ड */}
      <div className="bg-white p-4 mt-4 rounded-xl shadow-sm border-l-4 border-red-600">
        <p className="text-xs text-gray-500 font-semibold uppercase">सध्याचे लोकेशन (सॅटेलाईट GPS)</p>
        <h2 className="text-xl font-bold text-gray-800 mt-1">
          {liveStatus.isArrived ? `✅ ${liveStatus.stopName} येथे पोहोचली` : `🚌 ${liveStatus.stopName} जवळ`}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          अंतर: <span className="font-bold text-red-700">{liveStatus.distanceKm} किमी</span> बाकी
        </p>
        {coords && (
          <p className="text-[11px] text-gray-400 mt-2">
            GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </p>
        )}
      </div>

      {/* मार्गावरील स्टॉप्सची यादी (Where is my Train सारखी) */}
      <div className="bg-white p-4 mt-4 rounded-xl shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 mb-3">मार्गावरील सर्व स्टॉप्स</h3>
        <div className="space-y-4 border-l-2 border-red-300 ml-3 pl-4">
          {stops.map((stop) => {
            const isCurrent = liveStatus.stopName === stop.stop_name;
            return (
              <div key={stop.id} className="relative">
                <span
                  className={`w-3.5 h-3.5 rounded-full absolute -left-[23px] top-1 ${
                    isCurrent ? 'bg-red-600 ring-4 ring-red-200' : 'bg-gray-300'
                  }`}
                />
                <p className={`text-sm ${isCurrent ? 'font-bold text-red-700' : 'text-gray-700'}`}>
                  {stop.stop_name}
                </p>
                {isCurrent && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded mt-1 inline-block">
                    बस येथे आहे ({liveStatus.distanceKm} km)
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
