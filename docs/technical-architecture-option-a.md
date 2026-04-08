# Technical Architecture Option A

## Context

This document defines the target architecture for the project when choosing:

- `React` for the frontend
- `ASP.NET Core` for the backend API
- `ADOMD.NET` for SSAS access
- `SSAS Multidimensional` as the primary OLAP engine
- `SQL Server DW` as the relational warehouse source

It is written to fit the current repository and deployment model:

- DW schema and seed scripts already exist in [build_dw.py](../build_dw.py), [seed_dw.py](../seed_dw.py), and [db_config.py](../db_config.py)
- SQL Server runs in Docker via [docker-compose.yml](../docker-compose.yml)
- SSAS runs on the Windows host and already contains cubes such as `SaleCube` and `InventoryCube`

## 1. Goals

The system must provide an executive-facing analytics application that:

- reads analytical data primarily from `SSAS`
- supports `drill down`, `roll up`, `pivot`, and `slice/dice`
- hides cube terminology from end users unless they enter analyst-oriented views
- allows fast executive navigation from KPI to cause analysis
- preserves the current DW and SSAS investment instead of replacing it with another BI tool

## 2. Non-Goals

This target architecture does not aim to:

- replace SSAS with direct SQL querying as the main analytical path
- build a generic self-service BI platform for all users on day one
- use Python as the main SSAS access layer
- expose SSAS directly to the browser

## 3. Current-State Mapping

### Existing assets in this repo

- [build_dw.py](../build_dw.py)
  - creates the DW schema and indexes in SQL Server
- [seed_dw.py](../seed_dw.py)
  - generates deterministic DW data for testing and demonstrations
- [run_tests.py](../run_tests.py)
  - validates data quality and business query expectations
- [test_dw_queries.sql](../test_dw_queries.sql)
  - reference SQL checks and business queries
- [docker-compose.yml](../docker-compose.yml)
  - runs SQL Server in Docker
- [app/main.py](../app/main.py)
  - currently empty and should not be treated as the long-term SSAS API foundation

### Existing external runtime assets

- `SQL Server Database Engine`
  - running in Docker at `localhost:1433`
- `SSAS Multidimensional`
  - running on the Windows host
- `SSMS`
  - used to manage both Database Engine and Analysis Services
- `Visual Studio`
  - used to design and deploy SSAS cubes

## 4. Architecture Decision Summary

### Decision 1: SSAS is the primary analytical source

All executive and OLAP interactions should read from SSAS first. SQL Server remains:

- the persistent DW store
- the source for SSAS processing
- the detail store used by drillthrough or operational lookups when needed

### Decision 2: ASP.NET Core owns SSAS access

The backend that queries SSAS must be implemented in `ASP.NET Core` using `ADOMD.NET`.

Reason:

- `ADOMD.NET` is the natural client library for SSAS multidimensional metadata and query access
- the backend needs first-class support for MDX, metadata discovery, cellsets, drillthrough, and hierarchy navigation
- this is a better fit than making Python the primary SSAS gateway

### Decision 3: React is the primary UI layer

The frontend should be implemented in `React` because the product requires rich interactive state:

- multiple dependent filters
- hierarchy expansion and collapse
- pivot and axis swapping
- saved analytical views
- asynchronous query cancellation and refresh

React is not chosen for fashion; it is chosen for state-heavy analytical UX.

## 5. Target Logical Architecture

```text
+----------------------+
| Executive / Analyst  |
| Browser              |
+----------+-----------+
           |
           v
+----------------------+
| React Frontend       |
| - dashboard          |
| - explorers          |
| - pivot workbench    |
+----------+-----------+
           |
           v
+----------------------+
| ASP.NET Core API     |
| - metadata           |
| - KPI queries        |
| - pivot queries      |
| - drill services     |
| - export             |
+-----+-----------+----+
      |           |
      |           |
      v           v
+-----------+  +------------------+
| SSAS      |  | SQL Server DW    |
| Cube DB    | | star schema       |
| Perspectives| | dim/fact tables  |
| KPIs        | | drillthrough src |
+-------------+ +------------------+
```

## 6. Target Deployment Architecture

### Development / single-machine deployment

This matches the user's current environment.

```text
Windows Host
|
|-- SSAS instance
|-- ASP.NET Core Analytics API
|-- React dev server or static web build
|-- Visual Studio / SSMS
|
|-- Docker Desktop
    |
    |-- sqlserver_dw container
        `-- datawarehouse database
```

### Production-style internal deployment

```text
[User Browser]
      |
      v
[Reverse Proxy / IIS / Nginx]
      |
      +--> [React static app]
      |
      +--> [ASP.NET Core Analytics API]
                |
                +--> [SSAS]
                |
                +--> [SQL Server DW]
```

### Deployment rule

The `ASP.NET Core API` should run as close as possible to `SSAS`, ideally on the same Windows host or same trusted network segment.

Do not:

- query SSAS directly from the browser
- expose cube connection details to clients
- place SSAS behind an uncontrolled public interface

## 7. Bounded Responsibilities

### 7.1 SQL Server DW

Responsibilities:

- persist the warehouse data
- store the dimensional model
- support SSAS processing
- act as the detailed source for drillthrough when configured

Owned by current Python scripts:

- schema creation in [build_dw.py](../build_dw.py)
- data seeding in [seed_dw.py](../seed_dw.py)
- validation in [run_tests.py](../run_tests.py)

### 7.2 SSAS Multidimensional

Responsibilities:

- expose cubes for analytical querying
- own hierarchies, dimensions, measures, KPI, and perspectives
- serve multidimensional analytical results for the application

Required semantic features:

- perspectives for simplified subject areas
- user hierarchies
- KPI definitions
- actions and drillthrough behaviors
- captions suitable for executive UI

### 7.3 ASP.NET Core Analytics API

Responsibilities:

- authenticate and authorize requests
- query SSAS via `ADOMD.NET`
- translate UI-level actions into MDX or metadata lookups
- normalize cube results into frontend-friendly JSON
- enforce query limits and caching
- expose analytical APIs
- support exports and drillthrough

### 7.4 React Frontend

Responsibilities:

- provide executive-friendly analytical workflows
- preserve query and navigation state
- render dashboards, grids, charts, and drill paths
- map user-friendly language to OLAP behaviors

## 8. Frontend Architecture

## 8.1 Product areas

The frontend should be organized by analytical workflows, not by technical cube objects.

Recommended primary areas:

- `Executive Overview`
- `Sales Analysis`
- `Inventory Analysis`
- `Customer Analysis`
- `Store Detail`
- `Flexible Analysis`

### 8.2 Interaction model

User-facing labels should avoid OLAP jargon by default.

- `Drill down` -> `Xem sâu hơn`
- `Roll up` -> `Thu gọn`
- `Pivot` -> `Doi goc nhin`
- `Slice` -> `Loc theo`
- `Dice` -> `Ket hop bo loc`
- `Drillthrough` -> `Xem chi tiet`

### 8.3 Technical frontend modules

Recommended modules:

- `src/app`
  - routing, layout, auth
- `src/features/dashboard`
- `src/features/explorer`
- `src/features/pivot`
- `src/features/drillthrough`
- `src/features/saved-views`
- `src/features/filters`
- `src/components/grid`
- `src/components/chart`
- `src/components/kpi-card`
- `src/services/api`
- `src/state`

### 8.4 Frontend state model

The analytical state should be explicit and serializable.

Suggested query state:

- `perspective`
- `rows`
- `columns`
- `measures`
- `filters`
- `timeSelection`
- `drillPath`
- `sort`
- `topN`
- `visualType`

This allows:

- deep links
- saved views
- browser navigation
- export consistency

## 9. Backend Architecture

### 9.1 Suggested solution structure

```text
apps/
  analytics-api/
    src/
      Analytics.Api/
      Analytics.Application/
      Analytics.Domain/
      Analytics.Infrastructure/
      Analytics.Ssas/
      Analytics.Contracts/
```

### 9.2 Layer responsibilities

#### `Analytics.Api`

- controllers or minimal APIs
- auth middleware
- request validation
- response shaping

#### `Analytics.Application`

- use cases
- orchestration logic
- command/query handlers
- saved view logic

#### `Analytics.Domain`

- analytical concepts
- query state objects
- drill operations
- pivot requests
- KPI view models

#### `Analytics.Infrastructure`

- caching
- persistence for saved views
- logging
- export generation

#### `Analytics.Ssas`

- `ADOMD.NET` integration
- metadata discovery
- MDX execution
- cellset transformation
- drillthrough execution

#### `Analytics.Contracts`

- request/response DTOs
- shared contracts between frontend and backend

## 10. SSAS Access Strategy

### 10.1 Why `ADOMD.NET`

The backend must support:

- metadata browsing
- cube query execution
- hierarchy navigation
- KPI discovery
- drillthrough
- cellset parsing

These tasks align naturally with `ADOMD.NET`.

### 10.2 Query patterns

The API should not expose raw MDX composition to the frontend.

Instead, the frontend sends structured requests such as:

- perspective
- selected measures
- row dimensions
- column dimensions
- filters
- drill instructions

The backend translates them into controlled MDX templates.

### 10.3 Query safety rules

The backend should:

- whitelist accessible cubes and perspectives
- whitelist hierarchies and measures
- cap result cardinality
- require pagination for detail queries
- reject uncontrolled crossjoins
- log long-running queries

## 11. SSAS Semantic Design Requirements

The UI quality depends heavily on the cube design. The following must exist or be introduced.

### 11.1 Perspectives

Recommended perspectives:

- `ExecutiveOverview`
- `SalesAnalysis`
- `InventoryAnalysis`
- `CustomerAnalysis`

These prevent the UI from loading every dimension and measure at once.

### 11.2 User hierarchies

Required hierarchies:

- Time: `Year > Quarter > Month`
- Geography: `Region > City > Store`
- Product: `Category > Product` if categories can be added
- Customer: `Customer Type > Customer`

### 11.3 KPIs

Recommended KPI set:

- total sales
- sales growth versus previous period
- top-performing stores
- low-performing stores
- ending inventory
- inventory risk or overstock indicator
- contribution by customer segment

### 11.4 Actions

Recommended actions:

- open detail transaction view
- open store detail
- open product detail
- open customer detail
- drillthrough to source rows

### 11.5 Captions and translations

Captions should be business-friendly and localized. Avoid exposing raw technical names such as:

- `fact_sale`
- `dim_time`
- `Measures.TongTien`

The UI should receive captions like:

- `Doanh so`
- `Ton kho cuoi ky`
- `Thanh pho`
- `Cua hang`

## 12. Core API Surface

### 12.1 Metadata APIs

- `GET /api/metadata/perspectives`
- `GET /api/metadata/perspectives/{name}`
- `GET /api/metadata/perspectives/{name}/dimensions`
- `GET /api/metadata/perspectives/{name}/measures`
- `GET /api/metadata/hierarchies`

### 12.2 KPI APIs

- `GET /api/kpis/executive-overview`
- `POST /api/kpis/trend`
- `POST /api/kpis/comparison`

### 12.3 Exploration APIs

- `POST /api/explore/query`
- `POST /api/explore/drill-down`
- `POST /api/explore/roll-up`
- `POST /api/explore/pivot`
- `POST /api/explore/change-grain`

### 12.4 Drillthrough APIs

- `POST /api/explore/drillthrough`
- `POST /api/explore/detail`

### 12.5 Saved view APIs

- `POST /api/views`
- `GET /api/views`
- `GET /api/views/{id}`
- `PUT /api/views/{id}`
- `DELETE /api/views/{id}`

### 12.6 Export APIs

- `POST /api/export/csv`
- `POST /api/export/xlsx`
- `POST /api/export/pdf-summary`

## 13. Request/Response Model

### 13.1 Example exploration request

```json
{
  "perspective": "SalesAnalysis",
  "rows": ["Geography.City"],
  "columns": ["Time.Month"],
  "measures": ["SalesAmount"],
  "filters": [
    { "field": "Time.Year", "operator": "eq", "value": "2025" },
    { "field": "Product.ProductCode", "operator": "eq", "value": "MH0010" }
  ],
  "drillPath": ["Time.Year.2025"],
  "topN": 20,
  "sort": { "field": "SalesAmount", "direction": "desc" }
}
```

### 13.2 Example normalized response

```json
{
  "meta": {
    "perspective": "SalesAnalysis",
    "queryTimeMs": 132,
    "rowCount": 12
  },
  "axes": {
    "rows": ["Thanh pho"],
    "columns": ["Thang"],
    "measures": ["Doanh so"]
  },
  "data": [
    {
      "rowKey": "HaNoi",
      "rowCaption": "Ha Noi",
      "cells": [
        { "columnKey": "2025-01", "value": 1250000.0 },
        { "columnKey": "2025-02", "value": 1310000.0 }
      ]
    }
  ],
  "availableOperations": {
    "canDrillDown": true,
    "canRollUp": true,
    "canPivot": true,
    "canDrillthrough": true
  }
}
```

## 14. Analytical Operations Mapping

### 14.1 Drill down

Purpose:

- move from a higher aggregation level to a lower one

Example:

- Year -> Quarter -> Month
- Region -> City -> Store

Backend requirement:

- understand hierarchy definitions
- validate the next allowed level
- generate safe MDX

### 14.2 Roll up

Purpose:

- move back to a higher aggregation level

Backend requirement:

- maintain the drill path
- avoid re-querying incompatible axes

### 14.3 Pivot

Purpose:

- swap analytical axes

Example:

- current rows: `City`
- current columns: `Month`
- pivot to rows: `Month`, columns: `City`

Backend requirement:

- recompose the MDX query
- preserve filters and measures

### 14.4 Slice / Dice

Purpose:

- narrow the analytical space using one or many filters

Example:

- only year `2025`
- only `MH0010`
- only `Ha Noi`

Backend requirement:

- enforce whitelist filters
- cap member expansion

### 14.5 Drillthrough

Purpose:

- navigate from aggregated cube values to supporting details

Backend requirement:

- support drillthrough actions or detail queries
- paginate detail results

## 15. Performance Architecture

### 15.1 Caching

Cache these aggressively:

- perspectives
- dimensions
- hierarchies
- captions and metadata

Cache these briefly:

- KPI cards
- common dashboard queries
- common trend queries

Do not over-cache:

- highly interactive pivot queries with many filters

### 15.2 Guardrails

The API should apply:

- maximum row caps
- top-N defaults
- timeout policies
- cancellation tokens
- concurrent request limits per user

### 15.3 Async behavior

For the frontend:

- cancel stale requests when filters change quickly
- debounce expensive queries
- show loading states at panel level, not full-page only

## 16. Security Architecture

### 16.1 Authentication

At minimum, the application should support:

- internal login
- or Windows/AD-backed authentication if available

### 16.2 Authorization

Recommended roles:

- `Executive`
- `Analyst`
- `Admin`

Typical policy:

- executives can view dashboards and saved views
- analysts can use flexible exploration and export
- admins can manage metadata exposure and saved-view governance

### 16.3 Secret handling

Do not store production secrets in the frontend.

Store securely on the backend:

- SSAS connection settings
- SQL drillthrough connection settings
- app secret keys

## 17. Observability

The backend should log:

- user id
- perspective used
- measures used
- filters used
- query duration
- timeout or failure reason

Track metrics:

- p50/p95 query latency
- dashboard load time
- export latency
- drillthrough frequency

## 18. Suggested Repository Evolution

This repo currently contains only the DW scripts and scaffolding. For Option A, evolve it like this:

```text
DataWarehouse/
  build_dw.py
  seed_dw.py
  db_config.py
  docker-compose.yml
  run_tests.py
  test_dw_queries.sql
  docs/
    technical-architecture-option-a.md
  apps/
    web/
      package.json
      src/
    analytics-api/
      src/
```

### Rationale

- keep current Python scripts for DW lifecycle
- add a dedicated `apps/web` React application
- add a dedicated `apps/analytics-api` ASP.NET Core backend
- do not force SSAS access into the current empty [app/main.py](../app/main.py)

## 19. Implementation Roadmap

### Phase 1: Foundation

- create ASP.NET Core solution
- create SSAS connection module using `ADOMD.NET`
- expose metadata APIs
- create React application shell
- add auth skeleton

### Phase 2: Executive core

- executive overview page
- KPI APIs
- trend charts
- saved filters
- common perspective loading

### Phase 3: OLAP interaction

- drill down
- roll up
- pivot
- slice/dice filters
- drillthrough details

### Phase 4: Operational hardening

- caching
- telemetry
- exports
- saved views
- role-based authorization

## 20. Risks and Mitigations

### Risk 1: Cube semantics not rich enough

If SSAS lacks perspectives, KPIs, hierarchies, and captions, the UI will feel technical.

Mitigation:

- harden the semantic layer before building advanced UX

### Risk 2: Unbounded pivot queries

Users may trigger huge crossjoins.

Mitigation:

- enforce API guardrails
- default top-N and dimension limits

### Risk 3: Mixing executive and analyst UX too early

This will create a confusing interface.

Mitigation:

- build executive journeys first
- keep flexible analysis in a separate area

### Risk 4: Overusing SQL instead of SSAS

The app may slowly drift away from the cube.

Mitigation:

- make SSAS the default analytical path
- use SQL only for detail or support scenarios

## 21. Final Recommendation

For this project, Option A should be interpreted narrowly and clearly:

- `React` owns the analytical user experience
- `ASP.NET Core` owns the backend API
- `ADOMD.NET` owns SSAS access
- `SSAS` remains the primary OLAP engine
- `SQL Server DW` remains the relational foundation and drillthrough source
- the current Python scripts continue to own warehouse schema, data seeding, and data validation

This keeps the architecture aligned with the existing DW project while moving the presentation layer away from Power BI and toward a controlled executive analytics product.
