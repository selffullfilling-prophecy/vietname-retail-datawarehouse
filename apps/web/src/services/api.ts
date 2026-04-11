const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7174";

export async function getHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getMetadataOverview() {
  const response = await fetch(`${API_BASE_URL}/api/metadata/overview`);
  if (!response.ok) {
    throw new Error(`Metadata request failed with status ${response.status}`);
  }

  return response.json();
}
