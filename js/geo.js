const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";

// City name → coordinates + time zone (Open-Meteo, no API key).
export async function geocode(name) {
  const params = new URLSearchParams({ name, count: "1" });
  const res = await fetch(`${GEO_URL}?${params}`);
  if (!res.ok) throw new Error(`Couldn't look up "${name}" (HTTP ${res.status}).`);
  const data = await res.json();
  const hit = data.results?.[0];
  if (!hit) throw new Error(`City "${name}" not found.`);
  return { city: hit.name, lat: hit.latitude, lon: hit.longitude, tz: hit.timezone };
}
