export interface BaseMarker {
  location: [number, number];
  name: string;
}

export interface DataCenterMarker extends BaseMarker {
  status: string;
  capacity: string;
}

export interface GlobeMarker extends DataCenterMarker {
  size: number;
}

const BASE_MARKERS: BaseMarker[] = [
  { location: [37.7749, -122.4194], name: "San Francisco" },
  { location: [40.7128, -74.0060], name: "New York" },
  { location: [51.5074, -0.1278], name: "London" },
  { location: [35.6762, 139.6503], name: "Tokyo" },
  { location: [1.3521, 103.8198], name: "Singapore" },
  { location: [-33.8688, 151.2093], name: "Sydney" },
  { location: [52.5200, 13.4050], name: "Berlin" },
  { location: [48.8566, 2.3522], name: "Paris" },
  { location: [55.7558, 37.6173], name: "Moscow" },
  { location: [23.1291, 113.2644], name: "Guangzhou" },
];

// Fixed capacity values for each location to prevent hydration mismatches
const CAPACITY_MAP: Record<string, string> = {
  "San Francisco": "12 racks / 240U available",
  "New York": "15 racks / 300U available",
  "London": "10 racks / 200U available",
  "Tokyo": "8 racks / 160U available",
  "Singapore": "14 racks / 280U available",
  "Sydney": "6 racks / 120U available",
  "Berlin": "9 racks / 180U available",
  "Paris": "11 racks / 220U available",
  "Moscow": "7 racks / 140U available",
  "Guangzhou": "13 racks / 260U available",
};

export const generateDataCenterMarkers = (): DataCenterMarker[] => {
  return BASE_MARKERS.map(marker => ({
    ...marker,
    status: "Active",
    capacity: CAPACITY_MAP[marker.name]
  }));
};

export const generateGlobeMarkers = (): GlobeMarker[] => {
  return generateDataCenterMarkers().map(marker => ({
    ...marker,
    size: 0.1
  }));
};
