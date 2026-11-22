import Dexie from 'dexie';

// १. फोनमध्ये लोकल ऑफलाईन डेटाबेस तयार करणे
export const db = new Dexie('MaharashtraBusDB');

db.version(1).stores({
  routes: 'id, route_name, from_city, to_city',
  stops: 'id, route_id, stop_name, lat, lng, sequence',
  buses: 'id, route_id, bus_number, bus_type, departure_time',
  offline_sync_queue: '++id, bus_id, lat, lng, timestamp' // रेंज नसताना लोकेशन साठवण्यासाठी
});

// २. सुरुवातीचा ऑफलाईन सॅम्पल डेटा (नागपूर - कोंढाळी - कारंजा - अमरावती मार्ग)
export async function seedOfflineData() {
  const count = await db.routes.count();
  if (count > 0) return; // डेटा आधीच सेव्ह असेल तर पुन्हा करू नका

  await db.routes.add({
    id: 'NH53-NAG-AMR',
    route_name: 'नागपूर - अमरावती (NH-53)',
    from_city: 'नागपूर',
    to_city: 'अमरावती'
  });

  // प्रत्येक स्टॉपचे अचूक GPS कोऑर्डिनेट्स (इंटरनेटशिवाय स्टॉप ओळखण्यासाठी)
  await db.stops.bulkAdd([
    { id: 1, route_id: 'NH53-NAG-AMR', stop_name: 'नागपूर (गणेशपेठ)', lat: 21.1458, lng: 79.0945, sequence: 1 },
    { id: 2, route_id: 'NH53-NAG-AMR', stop_name: 'वाडी नाका', lat: 21.1520, lng: 79.0012, sequence: 2 },
    { id: 3, route_id: 'NH53-NAG-AMR', stop_name: 'कोंढाळी', lat: 21.1355, lng: 78.6478, sequence: 3 },
    { id: 4, route_id: 'NH53-NAG-AMR', stop_name: 'कारंजा (घाडगे)', lat: 21.1685, lng: 78.4116, sequence: 4 },
    { id: 5, route_id: 'NH53-NAG-AMR', stop_name: 'तळेगाव (श्यामजी पंत)', lat: 21.0894, lng: 78.1887, sequence: 5 },
    { id: 6, route_id: 'NH53-NAG-AMR', stop_name: 'अमरावती मध्यवर्ती बस स्थानक', lat: 20.9320, lng: 77.7523, sequence: 6 }
  ]);

  await db.buses.bulkAdd([
    { id: 'MH40-N-8412', route_id: 'NH53-NAG-AMR', bus_number: 'MH-40 N-8412', bus_type: 'लालपरी (साधी)', departure_time: '08:30 AM' },
    { id: 'MH31-FC-2209', route_id: 'NH53-NAG-AMR', bus_number: 'MH-31 FC-2209', bus_type: 'शिवशाही (AC)', departure_time: '09:15 AM' }
  ]);
}
