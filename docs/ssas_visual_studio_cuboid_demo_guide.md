# SSAS / Visual Studio Cuboid Demo Guide

## Purpose

This guide explains how to demonstrate the OLAP design in three places:

1. **SSMS Database Engine**  
   Show the physical materialized cuboid tables in schema `olap`.

2. **Visual Studio / SSDT Analysis Services project**  
   Show the SSAS cube model: data source, data source view, dimensions, hierarchies, measure groups, and dimension usage.

3. **SSMS connected to Analysis Services**  
   Browse the deployed cube or run MDX queries that correspond to 0D/1D/2D/3D/4D cuboid levels.

Codex cannot operate the Visual Studio GUI. This file is a manual checklist for the user.

---

## Important distinction

### Materialized cuboid tables in SQL Server

These are physical aggregate tables created by T-SQL in the SQL Server Database Engine:

```text
olap.sales_cuboid_0d_all
olap.sales_cuboid_1d_time
olap.sales_cuboid_2d_time_product
...
olap.inventory_cuboid_3d_time_product_store
```

They are demo-friendly in SSMS because you can show the `olap` schema and row counts.

### SSAS cube/aggregations in Visual Studio

In SSAS, cuboids are not normally shown as 24 separate objects. They are represented through:

- Cube
- Measure Groups
- Dimensions
- Hierarchies
- Dimension Usage
- Aggregations
- Browse results / MDX query results

So do not create 24 separate SSAS cubes. The recommended SSAS design is one integrated cube:

```text
Retail Analytics Cube
├── Measure Group: Sales
├── Measure Group: Inventory Snapshot
├── Dimension: Time
├── Dimension: Product
├── Dimension: Store
└── Dimension: Customer
```

---

## Part A — Show cuboids in SSMS Database Engine

1. Connect SSMS to Database Engine:

```text
Server: localhost,1433
Authentication: SQL Server Authentication
Database: datawarehouse
```

2. Run:

```sql
SELECT 
    s.name AS schema_name,
    t.name AS table_name
FROM sys.tables t
JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE s.name = 'olap'
ORDER BY t.name;
```

3. Run the verification script:

```powershell
sqlcmd -S localhost,1433 -U sa -P "<SA_PASSWORD>" -C -d datawarehouse -b -i data\verify_olap_cuboids.sql -o data\verify_olap_cuboids.log
```

4. Show expected result:

```text
24 cuboid tables
- 16 Sales cuboids
- 8 Inventory cuboids
```

5. Explain:

> These tables are materialized cuboids. They precompute aggregate measures so OLAP-style queries can read summarized data directly instead of grouping from the fact table every time.

---

## Part B — Build/show OLAP model in Visual Studio / SSDT

### 1. Data Source

Create or open the data source pointing to SQL Server:

```text
localhost,1433
database: datawarehouse
```

### 2. Data Source View

Include these source tables:

```text
dw.dim_time
dw.dim_product
dw.dim_store
dw.dim_customer
dw.fact_sale
dw.fact_inventory_snapshot
```

If time allows, also add the `olap` schema tables to the DSV to visually show the materialized cuboid layer:

```text
olap.sales_cuboid_*
olap.inventory_cuboid_*
```

This is optional for the cube model, but helpful for demonstration.

### 3. Dimensions

Create dimensions:

```text
Dim Time
Dim Product
Dim Store
Dim Customer
```

Recommended hierarchies:

```text
Dim Time:
Nam -> Quy -> Thang

Dim Store:
Bang -> ThanhPho -> Macuahang

Dim Customer:
Bang -> ThanhPho -> Makh
Customer type attributes:
iskhdulich, iskhbuudien
```

### 4. Cube

Create one integrated cube:

```text
Retail Analytics Cube
```

Do not present the design as simply:

```text
Fact_Sale -> Sales Cube
Fact_Inventory -> Inventory Cube
```

Instead, present fact tables as **measure groups**.

### 5. Measure Groups

Use:

```text
Measure Group: Sales
Source: dw.fact_sale
Measures:
- SoLuongBan
- TongTien

Measure Group: Inventory Snapshot
Source: dw.fact_inventory_snapshot
Measures:
- SoLuongTonKho
```

### 6. Dimension Usage

Expected usage:

| Dimension | Sales measure group | Inventory Snapshot measure group |
|---|---|---|
| Time | Regular | Regular |
| Product | Regular | Regular |
| Store | Regular | Regular |
| Customer | Regular | No relationship |

Explain:

> Customer is linked to Sales because `fact_sale` has `customerkey`. Inventory does not have `customerkey`, so it must not be linked to Customer.

### 7. Deploy, Process, Browse

Use GUI:

```text
Build
Deploy
Process
Browse
```

Browse examples:

- Sales by Time
- Sales by Time + Product
- Sales by Store + Customer
- Inventory by Time
- Inventory by Store + Product
- Inventory by Time + Store + Product

These correspond to cuboid levels in the lattice.

---

## Part C — Show cuboid-like levels in SSMS Analysis Services

1. Connect SSMS to:

```text
Analysis Services
Server: localhost
```

2. Select the deployed SSAS database.

3. Open MDX Query.

4. Use:

```text
data/ssas_cuboid_demo_queries.mdx
```

5. Replace placeholder cube/dimension/measure names with the actual names from Visual Studio.

6. Run:

- 0D Sales total
- 1D Sales by Time
- 2D Sales by Time + Product
- 3D Sales by Time + Product + Store
- 4D Sales by Time + Product + Store + Customer
- Inventory 1D/2D/3D examples

Explain:

> In SSAS, we demonstrate cuboid levels through MDX/Browse results, not necessarily by showing 24 separate cube objects.

---

## Demo narrative

Use this wording:

> The SQL Server `olap` schema proves that the project materializes the base cuboid lattice: 16 Sales cuboids and 8 Inventory cuboids. This optimizes latency because queries can read precomputed aggregate tables instead of grouping from fact tables each time.  
>  
> In Visual Studio/SSDT, the same OLAP mindset is represented by the Retail Analytics Cube, two measure groups, shared dimensions, hierarchies, and dimension usage.  
>  
> In SSMS Analysis Services, we browse or query the cube with MDX to show 0D/1D/2D/3D/4D analytical levels.
