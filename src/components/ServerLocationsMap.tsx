import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { ServerLocation } from "@/constants/server-locations";
import "leaflet/dist/leaflet.css";

const SERVER_MARKER_CLASS = "keen-server-marker";

const serverMarkerIcon = L.divIcon({
  className: `${SERVER_MARKER_CLASS}-wrap`,
  html: `<span class="${SERVER_MARKER_CLASS}" aria-hidden="true"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

function FitWorldBounds({ locations }: { locations: ServerLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) return;

    const bounds = L.latLngBounds(
      locations.map(
        (loc) =>
          [loc.coordinates.lat, loc.coordinates.lng] as L.LatLngTuple,
      ),
    );
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 3 });
  }, [map, locations]);

  return null;
}

interface Props {
  locations: ServerLocation[];
}

export default function ServerLocationsMap({ locations }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-accent/30 shadow-card">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={8}
        maxBounds={[[-85, -200], [85, 200]]}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={false}
        className="server-locations-map z-0 h-[min(420px,60vh)] w-full"
        aria-label="Interactive map of KeenVPN server locations"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
        />
        <FitWorldBounds locations={locations} />
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            position={[loc.coordinates.lat, loc.coordinates.lng]}
            icon={serverMarkerIcon}
          >
            <Popup>
              <strong>{loc.city}</strong>
              <br />
              {loc.country}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
