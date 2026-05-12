export type HealthResponse = {
  status: string;
  service: string;
  timeUtc: string;
  ssas: {
    dataSource: string;
    catalog: string;
    cube: string;
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

export type SalesPivotResponse = {
  generatedAtUtc: string;
  timeLevel: "year" | "quarter" | "month";
  selectedYear: string | null;
  selectedQuarter: string | null;
  storeLevel: "state" | "city" | "store";
  selectedStateLabel: string | null;
  selectedCityLabel: string | null;
  timeAxis: Array<{
    key: string;
    label: string;
    memberUniqueName: string | null;
  }>;
  storeAxis: Array<{
    key: string;
    label: string;
    memberUniqueName: string | null;
  }>;
  cells: Array<{
    timeKey: string;
    storeKey: string;
    revenue: number;
    salesVolume: number;
  }>;
};

export type SalesProductBreakdownResponse = {
  generatedAtUtc: string;
  level: ProductLevel;
  rows: Array<{
    key: string;
    label: string;
    memberUniqueName: string;
    revenue: number;
    salesVolume: number;
  }>;
};

export type SalesCustomerBreakdownResponse = {
  generatedAtUtc: string;
  level: CustomerLevel;
  rows: Array<{
    key: string;
    label: string;
    memberUniqueName: string;
    revenue: number;
    salesVolume: number;
  }>;
};

export type SalesAdvancedPivotResponse = {
  generatedAtUtc: string;
  rowDimension: PivotDimension;
  rowLevel: string;
  columnDimension: PivotDimension;
  columnLevel: string;
  measure: SalesMeasure;
  measureLabel: string;
  rowAxis: PivotAxisMember[];
  columnAxis: PivotAxisMember[];
  cells: Array<{
    rowKey: string;
    columnKey: string;
    value: number;
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

export type InventoryPivotResponse = {
  generatedAtUtc: string;
  timeLevel: "year" | "quarter" | "month";
  selectedYear: string | null;
  selectedQuarter: string | null;
  storeLevel: "state" | "city" | "store";
  selectedStateLabel: string | null;
  selectedCityLabel: string | null;
  timeAxis: Array<{
    key: string;
    label: string;
    memberUniqueName: string | null;
  }>;
  storeAxis: Array<{
    key: string;
    label: string;
    memberUniqueName: string | null;
  }>;
  cells: Array<{
    timeKey: string;
    storeKey: string;
    averageInventory: number;
  }>;
};

export type InventoryProductBreakdownResponse = {
  generatedAtUtc: string;
  level: ProductLevel;
  rows: Array<{
    key: string;
    label: string;
    memberUniqueName: string;
    averageInventory: number;
  }>;
};

export type InventoryAdvancedPivotResponse = {
  generatedAtUtc: string;
  rowDimension: Exclude<PivotDimension, "customer">;
  rowLevel: string;
  columnDimension: Exclude<PivotDimension, "customer">;
  columnLevel: string;
  measure: InventoryMeasure;
  measureLabel: string;
  rowAxis: PivotAxisMember[];
  columnAxis: PivotAxisMember[];
  cells: Array<{
    rowKey: string;
    columnKey: string;
    value: number;
  }>;
};

export type TimeLevel = "year" | "quarter" | "month";
export type StoreLevel = "state" | "city" | "store";
export type ProductLevel = "mamh" | "mota" | "kichco" | "trongluong";
export type CustomerLevel = "state" | "city" | "customer" | "name" | "travel" | "postal";
export type PivotDimension = "time" | "store" | "product" | "customer";
export type SalesMeasure = "revenue" | "salesVolume";
export type InventoryMeasure = "averageInventory" | "inventoryQuantity";
export type PivotAxisMember = {
  key: string;
  label: string;
  memberUniqueName: string;
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
  stateMemberUniqueName?: string,
  cityMemberUniqueName?: string,
  storeMemberUniqueName?: string,
  productMemberUniqueName?: string,
  customerMemberUniqueName?: string,
): Promise<SalesTimeBreakdownResponse> {
  const params = new URLSearchParams({ level });
  if (year) {
    params.set("year", year);
  }
  if (quarter) {
    params.set("quarter", quarter);
  }
  if (stateMemberUniqueName) {
    params.set("stateMemberUniqueName", stateMemberUniqueName);
  }
  if (cityMemberUniqueName) {
    params.set("cityMemberUniqueName", cityMemberUniqueName);
  }
  if (storeMemberUniqueName) {
    params.set("storeMemberUniqueName", storeMemberUniqueName);
  }
  if (productMemberUniqueName) {
    params.set("productMemberUniqueName", productMemberUniqueName);
  }
  if (customerMemberUniqueName) {
    params.set("customerMemberUniqueName", customerMemberUniqueName);
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
  quarter?: string,
  productMemberUniqueName?: string,
  customerMemberUniqueName?: string,
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
  if (quarter) {
    params.set("quarter", quarter);
  }
  if (productMemberUniqueName) {
    params.set("productMemberUniqueName", productMemberUniqueName);
  }
  if (customerMemberUniqueName) {
    params.set("customerMemberUniqueName", customerMemberUniqueName);
  }

  const response = await fetch(`${API_BASE_URL}/api/sales/store-breakdown?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Sales store breakdown request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getSalesProductBreakdown(options: {
  level?: ProductLevel;
  year?: string;
  quarter?: string;
  stateMemberUniqueName?: string;
  cityMemberUniqueName?: string;
  storeMemberUniqueName?: string;
  customerMemberUniqueName?: string;
} = {}): Promise<SalesProductBreakdownResponse> {
  const params = new URLSearchParams({ level: options.level ?? "mamh" });
  appendOptionalParams(params, options);

  const response = await fetch(`${API_BASE_URL}/api/sales/product-breakdown?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Sales product breakdown request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getSalesCustomerBreakdown(options: {
  level?: CustomerLevel;
  year?: string;
  quarter?: string;
  stateMemberUniqueName?: string;
  cityMemberUniqueName?: string;
  storeMemberUniqueName?: string;
  productMemberUniqueName?: string;
} = {}): Promise<SalesCustomerBreakdownResponse> {
  const params = new URLSearchParams({ level: options.level ?? "customer" });
  appendOptionalParams(params, options);

  const response = await fetch(`${API_BASE_URL}/api/sales/customer-breakdown?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Sales customer breakdown request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getSalesAdvancedPivot(options: {
  rowDimension: PivotDimension;
  rowLevel: string;
  columnDimension: PivotDimension;
  columnLevel: string;
  measure: SalesMeasure;
  year?: string;
  quarter?: string;
  stateMemberUniqueName?: string;
  cityMemberUniqueName?: string;
  storeMemberUniqueName?: string;
  productMemberUniqueName?: string;
  customerMemberUniqueName?: string;
}): Promise<SalesAdvancedPivotResponse> {
  const params = new URLSearchParams({
    rowDimension: options.rowDimension,
    rowLevel: options.rowLevel,
    columnDimension: options.columnDimension,
    columnLevel: options.columnLevel,
    measure: options.measure,
  });
  appendOptionalParams(params, options);

  const response = await fetch(`${API_BASE_URL}/api/sales/pivot/advanced?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Sales advanced pivot request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getSalesPivot(
  timeLevel: "year" | "quarter" | "month",
  storeLevel: "state" | "city" | "store",
  year?: string,
  quarter?: string,
  stateMemberUniqueName?: string,
  cityMemberUniqueName?: string,
  storeMemberUniqueName?: string,
): Promise<SalesPivotResponse> {
  const params = new URLSearchParams({ timeLevel, storeLevel });
  if (year) {
    params.set("year", year);
  }
  if (quarter) {
    params.set("quarter", quarter);
  }
  if (stateMemberUniqueName) {
    params.set("stateMemberUniqueName", stateMemberUniqueName);
  }
  if (cityMemberUniqueName) {
    params.set("cityMemberUniqueName", cityMemberUniqueName);
  }
  if (storeMemberUniqueName) {
    params.set("storeMemberUniqueName", storeMemberUniqueName);
  }

  const response = await fetch(`${API_BASE_URL}/api/sales/pivot?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Sales pivot request failed with status ${response.status}`);
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
  stateMemberUniqueName?: string,
  cityMemberUniqueName?: string,
  storeMemberUniqueName?: string,
  productMemberUniqueName?: string,
): Promise<InventoryTimeBreakdownResponse> {
  const params = new URLSearchParams({ level });
  if (year) {
    params.set("year", year);
  }
  if (quarter) {
    params.set("quarter", quarter);
  }
  if (stateMemberUniqueName) {
    params.set("stateMemberUniqueName", stateMemberUniqueName);
  }
  if (cityMemberUniqueName) {
    params.set("cityMemberUniqueName", cityMemberUniqueName);
  }
  if (storeMemberUniqueName) {
    params.set("storeMemberUniqueName", storeMemberUniqueName);
  }
  if (productMemberUniqueName) {
    params.set("productMemberUniqueName", productMemberUniqueName);
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
  quarter?: string,
  productMemberUniqueName?: string,
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
  if (quarter) {
    params.set("quarter", quarter);
  }
  if (productMemberUniqueName) {
    params.set("productMemberUniqueName", productMemberUniqueName);
  }

  const response = await fetch(`${API_BASE_URL}/api/inventory/store-breakdown?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Inventory store breakdown request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getInventoryProductBreakdown(options: {
  level?: ProductLevel;
  year?: string;
  quarter?: string;
  stateMemberUniqueName?: string;
  cityMemberUniqueName?: string;
  storeMemberUniqueName?: string;
} = {}): Promise<InventoryProductBreakdownResponse> {
  const params = new URLSearchParams({ level: options.level ?? "mamh" });
  appendOptionalParams(params, options);

  const response = await fetch(`${API_BASE_URL}/api/inventory/product-breakdown?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Inventory product breakdown request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getInventoryAdvancedPivot(options: {
  rowDimension: Exclude<PivotDimension, "customer">;
  rowLevel: string;
  columnDimension: Exclude<PivotDimension, "customer">;
  columnLevel: string;
  measure: InventoryMeasure;
  year?: string;
  quarter?: string;
  stateMemberUniqueName?: string;
  cityMemberUniqueName?: string;
  storeMemberUniqueName?: string;
  productMemberUniqueName?: string;
}): Promise<InventoryAdvancedPivotResponse> {
  const params = new URLSearchParams({
    rowDimension: options.rowDimension,
    rowLevel: options.rowLevel,
    columnDimension: options.columnDimension,
    columnLevel: options.columnLevel,
    measure: options.measure,
  });
  appendOptionalParams(params, options);

  const response = await fetch(`${API_BASE_URL}/api/inventory/pivot/advanced?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Inventory advanced pivot request failed with status ${response.status}`);
  }

  return response.json();
}

function appendOptionalParams(params: URLSearchParams, values: Record<string, string | undefined>) {
  Object.entries(values).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
}

export async function getInventoryPivot(
  timeLevel: "year" | "quarter" | "month",
  storeLevel: "state" | "city" | "store",
  year?: string,
  quarter?: string,
  stateMemberUniqueName?: string,
  cityMemberUniqueName?: string,
  storeMemberUniqueName?: string,
): Promise<InventoryPivotResponse> {
  const params = new URLSearchParams({ timeLevel, storeLevel });
  if (year) {
    params.set("year", year);
  }
  if (quarter) {
    params.set("quarter", quarter);
  }
  if (stateMemberUniqueName) {
    params.set("stateMemberUniqueName", stateMemberUniqueName);
  }
  if (cityMemberUniqueName) {
    params.set("cityMemberUniqueName", cityMemberUniqueName);
  }
  if (storeMemberUniqueName) {
    params.set("storeMemberUniqueName", storeMemberUniqueName);
  }

  const response = await fetch(`${API_BASE_URL}/api/inventory/pivot?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Inventory pivot request failed with status ${response.status}`);
  }

  return response.json();
}
