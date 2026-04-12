export type HealthResponse = {
  status: string;
  service: string;
  timeUtc: string;
  ssas: {
    dataSource: string;
    catalog: string;
  };
};

export type MetadataOverviewResponse = {
  generatedAtUtc: string;
  cubes: Array<{
    name: string;
    caption: string;
    dimensions: Array<{
      name: string;
      caption: string;
      attributes: string[];
      hierarchies: string[];
    }>;
    measures: Array<{
      name: string;
      caption: string;
      aggregateFunction: string;
    }>;
  }>;
};

export type YearSalesSummaryResponse = {
  generatedAtUtc: string;
  rows: Array<{
    year: string;
    revenue: number;
    salesVolume: number;
  }>;
};

export type SalesTimeBreakdownResponse = {
  generatedAtUtc: string;
  level: "year" | "quarter" | "month";
  selectedYear: string | null;
  selectedQuarter: string | null;
  drillTargetLevel: "quarter" | "month" | null;
  rows: Array<{
    key: string;
    label: string;
    revenue: number;
    salesVolume: number;
    canDrillDown: boolean;
  }>;
};

export type SalesStoreBreakdownResponse = {
  generatedAtUtc: string;
  level: "state" | "city" | "store";
  selectedStateLabel: string | null;
  selectedCityLabel: string | null;
  drillTargetLevel: "city" | "store" | null;
  rows: Array<{
    key: string;
    label: string;
    memberUniqueName: string;
    revenue: number;
    salesVolume: number;
    canDrillDown: boolean;
  }>;
};

export type YearInventorySummaryResponse = {
  generatedAtUtc: string;
  rows: Array<{
    year: string;
    averageInventory: number;
  }>;
};

export type InventoryTimeBreakdownResponse = {
  generatedAtUtc: string;
  level: "year" | "quarter" | "month";
  selectedYear: string | null;
  selectedQuarter: string | null;
  drillTargetLevel: "quarter" | "month" | null;
  rows: Array<{
    key: string;
    label: string;
    averageInventory: number;
    canDrillDown: boolean;
  }>;
};

export type InventoryStoreBreakdownResponse = {
  generatedAtUtc: string;
  level: "state" | "city" | "store";
  selectedStateLabel: string | null;
  selectedCityLabel: string | null;
  drillTargetLevel: "city" | "store" | null;
  rows: Array<{
    key: string;
    label: string;
    memberUniqueName: string;
    averageInventory: number;
    canDrillDown: boolean;
  }>;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5056";

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getMetadataOverview(): Promise<MetadataOverviewResponse> {
  const response = await fetch(`${API_BASE_URL}/api/metadata/overview`);
  if (!response.ok) {
    throw new Error(`Metadata request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getSalesSummaryByYear(): Promise<YearSalesSummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/sales/summary/by-year`);
  if (!response.ok) {
    throw new Error(`Sales summary request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getSalesTimeBreakdown(
  level: "year" | "quarter" | "month",
  year?: string,
  quarter?: string,
): Promise<SalesTimeBreakdownResponse> {
  const params = new URLSearchParams({ level });
  if (year) {
    params.set("year", year);
  }
  if (quarter) {
    params.set("quarter", quarter);
  }

  const response = await fetch(`${API_BASE_URL}/api/sales/time-breakdown?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Sales time breakdown request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getSalesStoreBreakdown(
  level: "state" | "city" | "store",
  stateMemberUniqueName?: string,
  cityMemberUniqueName?: string,
  year?: string,
): Promise<SalesStoreBreakdownResponse> {
  const params = new URLSearchParams({ level });
  if (stateMemberUniqueName) {
    params.set("stateMemberUniqueName", stateMemberUniqueName);
  }
  if (cityMemberUniqueName) {
    params.set("cityMemberUniqueName", cityMemberUniqueName);
  }
  if (year) {
    params.set("year", year);
  }

  const response = await fetch(`${API_BASE_URL}/api/sales/store-breakdown?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Sales store breakdown request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getInventorySummaryByYear(): Promise<YearInventorySummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/inventory/summary/by-year`);
  if (!response.ok) {
    throw new Error(`Inventory summary request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getInventoryTimeBreakdown(
  level: "year" | "quarter" | "month",
  year?: string,
  quarter?: string,
): Promise<InventoryTimeBreakdownResponse> {
  const params = new URLSearchParams({ level });
  if (year) {
    params.set("year", year);
  }
  if (quarter) {
    params.set("quarter", quarter);
  }

  const response = await fetch(`${API_BASE_URL}/api/inventory/time-breakdown?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Inventory time breakdown request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getInventoryStoreBreakdown(
  level: "state" | "city" | "store",
  stateMemberUniqueName?: string,
  cityMemberUniqueName?: string,
  year?: string,
): Promise<InventoryStoreBreakdownResponse> {
  const params = new URLSearchParams({ level });
  if (stateMemberUniqueName) {
    params.set("stateMemberUniqueName", stateMemberUniqueName);
  }
  if (cityMemberUniqueName) {
    params.set("cityMemberUniqueName", cityMemberUniqueName);
  }
  if (year) {
    params.set("year", year);
  }

  const response = await fetch(`${API_BASE_URL}/api/inventory/store-breakdown?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Inventory store breakdown request failed with status ${response.status}`);
  }

  return response.json();
}
