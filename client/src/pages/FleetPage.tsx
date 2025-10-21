import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface Vessel {
  _id: string;
  name: string;
  flag: string;
  mmsi: string;
  lastpos?: { lat: number; lon: number };
}

interface FleetInfo {
  _id: string;
  name: string;
}

interface FleetResponse {
  fleet: FleetInfo;
  vessels: Vessel[];
}

function FleetPage() {
  const { id } = useParams();
  const [fleetData, setFleetData] = useState<FleetResponse | null>(null);
  const [vessels, setVessels] = useState<Vessel[]>([]);

  // Search fields
  const [name, setName] = useState("");
  const [flag, setFlag] = useState("");
  const [mmsi, setMmsi] = useState("");

  // Load fleet and vessels initially
  useEffect(() => {
    fetch(`/api/fleets/${id}/vessels`)
      .then(r => r.json())
      .then(data => {
        setFleetData(data);
        setVessels(data.vessels);
      })
      .catch(console.error);
  }, [id]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (name) params.append("name", name);
    if (flag) params.append("flag", flag);
    if (mmsi) params.append("mmsi", mmsi);
    params.append("fleetId", String(id));

    fetch(`/api/search?${params.toString()}`)
      .then(r => r.json())
      .then(data => setVessels(data.results))
      .catch(console.error);
  };

  const handleReset = () => {
    setName("");
    setFlag("");
    setMmsi("");
    if (!id) return;
    fetch(`/api/fleets/${id}/vessels`)
      .then(r => r.json())
      .then(data => setVessels(data.vessels))
      .catch(console.error);
  };

  if (!fleetData) return <p style={{ padding: "2rem" }}>Loading...</p>;

  const firstWithCoords = vessels.find(
    v => v.lastpos && typeof v.lastpos.lat === "number" && typeof v.lastpos.lon === "number"
  );
  const center: [number, number] = firstWithCoords
    ? [firstWithCoords.lastpos!.lat, firstWithCoords.lastpos!.lon]
    : [0, 0];

  return (
    <div style={{ padding: "2rem" }}>
      <Link to="/">← Back to fleets</Link>
      <h2>{fleetData.fleet.name}</h2>

      {/* Search Section */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          placeholder="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ marginRight: "0.5rem" }}
        />
        <input
          placeholder="Flag"
          value={flag}
          onChange={e => setFlag(e.target.value)}
          style={{ marginRight: "0.5rem" }}
        />
        <input
          placeholder="MMSI"
          value={mmsi}
          onChange={e => setMmsi(e.target.value)}
          style={{ marginRight: "0.5rem" }}
        />
        <button onClick={handleSearch}>Search</button>
        <button onClick={handleReset} style={{ marginLeft: "0.5rem" }}>
          Reset
        </button>
      </div>

      {/* Table */}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Flag</th>
            <th>MMSI</th>
          </tr>
        </thead>
        <tbody>
          {vessels.map(v => (
            <tr key={v._id}>
              <td>{v.name}</td>
              <td>{v.flag}</td>
              <td>{v.mmsi}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Map */}
      {vessels.some(v => v.lastpos && v.lastpos.lat && v.lastpos.lon) ? (
        <MapContainer
          center={center}
          zoom={2}
          style={{ height: "400px", marginTop: "1rem" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {vessels
            .filter(v => v.lastpos && v.lastpos.lat && v.lastpos.lon)
            .map(v => (
              <Marker key={v._id} position={[v.lastpos!.lat, v.lastpos!.lon]}>
                <Popup>
                  <strong>{v.name}</strong>
                  <br />
                  Flag: {v.flag}
                  <br />
                  MMSI: {v.mmsi}
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      ) : (
        <p style={{ marginTop: "1rem" }}>No vessel location data available for this fleet.</p>
      )}
    </div>
  );
}

export default FleetPage;
