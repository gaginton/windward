// client/src/App.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface Fleet {
  _id: string;
  name: string;
  vesselsCount: number;
}

export default function App() {
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [sortField, setSortField] = useState<keyof Fleet>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    fetch("/api/fleets")
      .then(r => r.json())
      .then(data => {
        console.log("Fetched fleets:", data);
        setFleets(data);
      })
      .catch(err => console.error("Failed to load fleets:", err));
  }, []);
  

  const sorted = [...fleets].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: keyof Fleet) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Fleets</h1>
      <table>
        <thead>
          <tr>
            <th onClick={() => toggleSort("name")}>
              Name {sortField === "name" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>
            <th onClick={() => toggleSort("vesselsCount")}>
              Vessels Count {sortField === "vesselsCount" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(f => (
            <tr key={f._id}>
              <td>
                <Link to={`/fleet/${f._id}`}>{f.name}</Link>
              </td>
              <td>{f.vesselsCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
