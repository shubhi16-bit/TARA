import 'package:latlong2/latlong.dart';

class MonitoredLocation {
  final String id;
  final String name;
  final String area;
  final double latitude;
  final double longitude;
  final String city;

  const MonitoredLocation({
    required this.id,
    required this.name,
    required this.area,
    required this.latitude,
    required this.longitude,
    this.city = 'New Delhi',
  });

  LatLng get coordinates => LatLng(latitude, longitude);

  static const List<MonitoredLocation> delhiMonitoredLocations = [
    MonitoredLocation(
      id: 'r2_janpath',
      name: 'Janpath',
      area: 'Central Delhi',
      latitude: 28.6268,
      longitude: 77.2190,
    ),
    MonitoredLocation(
      id: 'r3_sansad',
      name: 'Sansad Marg',
      area: 'Central Delhi',
      latitude: 28.6293,
      longitude: 77.2158,
    ),
    MonitoredLocation(
      id: 'r1_barakhamba',
      name: 'Barakhamba Road',
      area: 'Central Delhi',
      latitude: 28.6304,
      longitude: 77.2245,
    ),
    MonitoredLocation(
      id: 'r5_kg_marg',
      name: 'Kasturba Gandhi Marg',
      area: 'Central Delhi',
      latitude: 28.6330,
      longitude: 77.2195,
    ),
    MonitoredLocation(
      id: 'r6_tolstoy',
      name: 'Tolstoy Marg',
      area: 'Central Delhi',
      latitude: 28.6328,
      longitude: 77.2210,
    ),
    MonitoredLocation(
      id: 'r4_bks',
      name: 'Baba Kharak Singh Marg',
      area: 'Central Delhi',
      latitude: 28.6350,
      longitude: 77.2145,
    ),
    MonitoredLocation(
      id: 'r7_minto',
      name: 'Minto Road',
      area: 'Central Delhi',
      latitude: 28.6278,
      longitude: 77.2285,
    ),
    MonitoredLocation(
      id: 'r8_ashoka',
      name: 'Ashoka Road',
      area: 'Central Delhi',
      latitude: 28.6248,
      longitude: 77.2165,
    ),
    MonitoredLocation(
      id: 'r9_panchkuian',
      name: 'Panchkuian Road',
      area: 'Central Delhi',
      latitude: 28.6432,
      longitude: 77.2084,
    ),
    MonitoredLocation(
      id: 'r10_connaught_lane',
      name: 'Connaught Lane',
      area: 'Central Delhi',
      latitude: 28.6358,
      longitude: 77.2210,
    ),
    MonitoredLocation(
      id: 'r11_lajpat',
      name: 'Lajpat Nagar (Ring Road)',
      area: 'South Delhi',
      latitude: 28.5677,
      longitude: 77.2433,
    ),
  ];
}

