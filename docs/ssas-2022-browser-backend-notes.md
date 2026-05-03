# SSAS 2022 Configuration Notes for Browser Backend

## Purpose

This document records the **current SSAS environment** after reinstalling SQL Server Analysis Services.  
Use it as the source of truth when updating the backend/browser code so that MDX queries and connection strings target the correct OLAP database.

The previous SSAS setup is no longer valid. The browser/backend should be aligned with the new deployed cube described below.

---

## Current SSAS Server

| Item | Current value |
|---|---|
| SSAS version | SQL Server Analysis Services 2022 / 16.x |
| SSAS server type | Multidimensional |
| SSAS server name | `localhost` |
| Authentication | Windows Authentication |
| SSMS display | `localhost (Microsoft Analysis Server 16.0.42.209 - DESKTOP-JMG4UUM...)` |
| Deployment target database | `RetailAnalytics_SSAS` |
| Main cube | `Retail Analytics Cube` |

Important:

```text
SSAS server = localhost
SSAS catalog/database = RetailAnalytics_SSAS
Cube name = Retail Analytics Cube
```

Do **not** connect to SSAS using `localhost,1433`.  
`localhost,1433` is for SQL Server Database Engine, not Analysis Services.

---

## Relational Data Warehouse Source

The SSAS cube reads from the relational data warehouse.

| Item | Current value |
|---|---|
| SQL Server Database Engine | SQL Server 2022 / 16.x |
| SQL Server address | `localhost,1433` or `127.0.0.1,1433` |
| SQL Server login | `sa` |
| Database | `datawarehouse` |
| Data source name in SSAS project | `DataWarehouse` |
| Provider seen in project | `MSOLEDBSQL19.1` |

Current conceptual flow:

```text
Browser / Backend
        |
        | MDX / ADOMD / MSOLAP connection
        v
SSAS 2022 Multidimensional
Server: localhost
Catalog: RetailAnalytics_SSAS
Cube: Retail Analytics Cube
        |
        | Data Source inside SSAS
        v
SQL Server Database Engine
Server: localhost,1433
Database: datawarehouse
```

---

## Deployed SSAS Objects

SSMS currently shows:

```text
localhost (Microsoft Analysis Server 16.x)
└── Databases
    └── RetailAnalytics_SSAS
        ├── Data Sources
        ├── Data Source Views
        ├── Cubes
        │   └── Retail Analytics Cube
        │       └── Measure Groups
        │           ├── Fact Inventory Snapshot
        │           └── Fact Sale
        ├── Dimensions
        ├── Mining Structures
        ├── Roles
        └── Assemblies
```

The cube was deployed and processed successfully from Visual Studio.

Deployment output included:

```text
Deploy complete -- 0 errors, 0 warnings
Processing Database 'RetailAnalytics_SSAS' completed.
Processing Cube 'Retail Analytics Cube' completed.
Processing Measure Group 'Fact Inventory Snapshot' completed.
Processing Measure Group 'Fact Sale' completed.
```

---

## SSAS Project Location

The SSAS project is located under:

```text
olap/RetailAnalytics_SSAS/
```

Important files:

```text
olap/RetailAnalytics_SSAS/RetailAnalytics_SSAS.sln
olap/RetailAnalytics_SSAS/RetailAnalytics_SSAS/DataWarehouse.ds
olap/RetailAnalytics_SSAS/RetailAnalytics_SSAS/Datawarehouse.dsv
olap/RetailAnalytics_SSAS/RetailAnalytics_SSAS/Retail Analytics Cube.cube
```

---

## Backend Connection Requirements

Update the browser/backend connection configuration to target the new SSAS database.

### Expected SSAS connection values

Use these values in config files, environment variables, or backend constants:

```text
SSAS_SERVER=localhost
SSAS_CATALOG=RetailAnalytics_SSAS
SSAS_CUBE=Retail Analytics Cube
```

If using an MSOLAP-style connection string:

```text
Provider=MSOLAP;Data Source=localhost;Initial Catalog=RetailAnalytics_SSAS;
```

If using an ADOMD.NET-style connection string:

```text
Data Source=localhost;Catalog=RetailAnalytics_SSAS;
```

Do not use this for SSAS:

```text
Data Source=localhost,1433
```

That points to the relational SQL Server, not the OLAP server.

---

## Names to Search and Replace in Backend

Search the backend/browser code for old SSAS references and update them.

Recommended search terms:

```text
SSAS
Analysis Services
MSOLAP
Adomd
ADOMD
Data Source=
Initial Catalog=
Catalog=
Cube
MDX
RetailAnalytics
Retail Analytics
localhost
```

Likely fields that may need changes:

```text
server
catalog
database
cube
connectionString
mdxQuery
measureName
dimensionName
```

The backend should use:

```text
server: localhost
catalog/database: RetailAnalytics_SSAS
cube: Retail Analytics Cube
```

---

## MDX Query Requirements

All backend MDX queries must reference the current cube name:

```mdx
FROM [Retail Analytics Cube]
```

Example basic query:

```mdx
SELECT
    {[Measures].Members} ON COLUMNS
FROM [Retail Analytics Cube]
```

Example shape for querying a specific measure:

```mdx
SELECT
    {[Measures].[<measure-name>]} ON COLUMNS
FROM [Retail Analytics Cube]
```

The exact measure names must be verified from the deployed cube metadata or Browser panel before hard-coding.

---

## Known Measure Groups

The deployed cube has these measure groups:

```text
Fact Sale
Fact Inventory Snapshot
```

Expected business measures may include sales quantity, sales amount, inventory quantity, and the calculated inventory average measure.

Before finalizing backend MDX, verify the exact SSAS measure captions in the cube browser. Possible names based on the project include:

```text
[Measures].[Tongtien]
[Measures].[Soluongban]
[Measures].[Soluongtonkho]
[Measures].[Inventory Average Quantity]
```

Do not assume old measure names from the previous SSAS database still exist.

---

## Known Dimensions

The deployed cube includes these dimensions:

```text
Dim Time
Dim Product
Dim Store
Dim Customer
```

Visible dimension files in the project:

```text
Dim Time.dim
Dim Product.dim
Dim Store.dim
Dim Customer.dim
```

Expected hierarchy/domain meaning:

| Dimension | Purpose |
|---|---|
| `Dim Time` | Time analysis, likely Year / Quarter / Month |
| `Dim Product` | Product analysis |
| `Dim Store` | Store/location analysis |
| `Dim Customer` | Customer analysis |

Before hard-coding MDX levels such as `[Nam]`, `[Quy]`, `[Thang]`, verify the exact hierarchy names in SSAS Browser or metadata.

---

## Calculated Measure Note

The cube had an MDX syntax issue that was fixed in the Calculations script.

The current calculated measure intended for inventory average is:

```text
Inventory Average Quantity
```

Its purpose is to calculate inventory quantity as an average over time instead of a simple sum over multiple time snapshots.

The MDX script should not contain duplicate semicolons like:

```mdx
VISIBLE = 1;;
```

Correct ending:

```mdx
VISIBLE = 1;
```

---

## Browser Backend Update Checklist

Use this checklist when modifying the browser/backend:

1. Confirm backend connects to SSAS using `localhost`, not `localhost,1433`.
2. Set SSAS catalog/database to `RetailAnalytics_SSAS`.
3. Set cube name to `Retail Analytics Cube`.
4. Replace old cube/database names in MDX queries.
5. Verify exact measure names from SSAS metadata before finalizing queries.
6. Verify exact dimension hierarchy names before finalizing drill-down, slice, dice, or pivot features.
7. Keep relational SQL Server connection separate from SSAS connection.
8. Do not expose the SQL Server `sa` password in frontend code.
9. Test at least one simple MDX query before wiring the full UI.
10. Confirm browser displays data after cube deploy/process.

---

## Suggested Smoke Test

After backend update, run a minimal query against SSAS:

```mdx
SELECT
    {} ON COLUMNS
FROM [Retail Analytics Cube]
```

Then test one real measure:

```mdx
SELECT
    {[Measures].[Inventory Average Quantity]} ON COLUMNS
FROM [Retail Analytics Cube]
```

If the measure name is not found, inspect the cube metadata and update the query to match the actual deployed measure caption.

---

## Important Separation

There are two different servers in this project:

| Purpose | Server |
|---|---|
| Query relational tables | `localhost,1433` |
| Query OLAP cube | `localhost` |

Backend code that powers the OLAP browser should connect to:

```text
SSAS: localhost
Catalog: RetailAnalytics_SSAS
Cube: Retail Analytics Cube
```

Backend code that directly checks raw fact/dim tables should connect to:

```text
SQL Server: localhost,1433
Database: datawarehouse
```

Do not mix these two connection targets.
