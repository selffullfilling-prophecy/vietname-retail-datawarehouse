# OLAP Design and Indexing Plan

## 1. Current Project State

The Data Warehouse layer is already implemented.

Current SQL Server database:

```text
datawarehouse
```

Main schema:

```text
dw
```

Core tables:

```text
dw.dim_time(timekey, thang, quy, nam)
dw.dim_product(productkey, mamh, mota, kichco, trongluong)
dw.dim_customer(customerkey, makh, tenkh, thanhpho, bang, iskhdulich, iskhbuudien)
dw.dim_store(storekey, macuahang, sodienthoai, thanhpho, bang, diachivp)

dw.fact_sale(productkey, timekey, storekey, customerkey, soluongban, tongtien)
dw.fact_inventory_snapshot(timekey, storekey, productkey, soluongtonkho)
```

Current data volume:

```text
fact_sale                  ~180k rows
fact_inventory_snapshot    ~905k rows
total fact rows            >1 million rows
```

The level-warehouse indexing step is already complete through `create_advanced_indexes.sql`:

- rowstore indexes;
- composite indexes;
- covering indexes with `INCLUDE`;
- statistics refresh for the DW tables.

The next stage is not to redo DW indexing. The next stage is **OLAP optimization**.

---

## 2. Why Warehouse Indexes Are Not Enough

Warehouse indexes help SQL Server read fact/dimension data faster when queries contain selective filters and joins.

However, OLAP workloads are different. A director or BI user often asks questions such as:

- revenue by time and product;
- revenue by store and customer;
- inventory by time, store, and product;
- slow-selling products with high inventory;
- store performance across months.

If each OLAP question scans the fact table and performs `GROUP BY` at runtime, query time may become slow and unstable as data grows.

Therefore, OLAP optimization needs a precomputed aggregate layer: **materialized cuboids**.

---

## 3. Practical OLAP Assumption: Enterprise-Scale Priority

This project is designed with an enterprise-scale OLAP mindset, not only as a small demo.

In practice, companies that build OLAP systems usually have:

- large fact tables;
- frequent management analysis;
- strict response-time expectations;
- high demand for reliable and accurate answers.

In that context, the first priority is not minimizing storage cost. The priorities are:

1. fast query response;
2. stable performance when data grows;
3. accurate aggregate results;
4. ability to answer new management questions quickly.

Therefore, creating many materialized cuboids is acceptable. It is a deliberate trade-off:

```text
more storage
    -> lower query latency
    -> more stable analytical response time
```

The current demo data has a little over one million fact rows, but the OLAP design assumes future enterprise data can grow to tens or hundreds of millions of fact rows.

---

## 4. Three Optimization Layers

### 4.1 Rowstore / covering indexes

File:

```text
data/create_advanced_indexes.sql
```

Purpose:

- selective filters;
- fact-dimension joins;
- current business query workload;
- efficient lookup by time/product/store/customer.

These indexes optimize reading the warehouse tables.

### 4.2 Materialized cuboids

File:

```text
data/create_materialized_cuboids.sql
```

Purpose:

- precompute aggregate tables;
- avoid repeated `GROUP BY` from large fact tables;
- support OLAP lattice/cuboid mindset;
- allow low-latency answers for future analysis within the current dimensions.

These cuboids optimize analytical response time.

### 4.3 Optional columnstore indexes

File:

```text
data/create_olap_indexes.sql
```

Purpose:

- optional optimization for scan-heavy fact-table workloads;
- useful when SSAS processing or direct SQL analytics scans many rows;
- not a replacement for rowstore indexes or materialized cuboids.

---

## 5. Lattice / Cuboid Mindset

The project should not be explained as:

```text
fact_sale -> Sales Cube
fact_inventory_snapshot -> Inventory Cube
```

That mindset is too narrow.

A better OLAP mindset is:

```text
Retail Analytics analytical space
├── Sales measure group
├── Inventory Snapshot measure group
├── shared dimensions
├── hierarchies
└── cuboid lattice / aggregate levels
```

A cuboid is an aggregate level over a subset of dimensions.

The materialized cuboid layer uses physical tables in schema `olap`.

---

## 6. Sales Lattice

Sales has 4 logical dimensions:

```text
Time      = timekey
Product   = productkey
Store     = storekey
Customer  = customerkey
```

Number of base cuboids:

```text
2^4 = 16 cuboids
```

### 0D

```text
olap.sales_cuboid_0d_all
```

### 1D

```text
olap.sales_cuboid_1d_time
olap.sales_cuboid_1d_product
olap.sales_cuboid_1d_store
olap.sales_cuboid_1d_customer
```

### 2D

```text
olap.sales_cuboid_2d_time_product
olap.sales_cuboid_2d_time_store
olap.sales_cuboid_2d_time_customer
olap.sales_cuboid_2d_product_store
olap.sales_cuboid_2d_product_customer
olap.sales_cuboid_2d_store_customer
```

### 3D

```text
olap.sales_cuboid_3d_time_product_store
olap.sales_cuboid_3d_time_product_customer
olap.sales_cuboid_3d_time_store_customer
olap.sales_cuboid_3d_product_store_customer
```

### 4D

```text
olap.sales_cuboid_4d_time_product_store_customer
```

Sales measures:

```text
total_quantity_sold = SUM(soluongban)
total_sales_amount  = SUM(tongtien)
row_count           = COUNT_BIG(*)
```

---

## 7. Inventory Lattice

Inventory has 3 logical dimensions:

```text
Time     = timekey
Product  = productkey
Store    = storekey
```

Number of base cuboids:

```text
2^3 = 8 cuboids
```

### 0D

```text
olap.inventory_cuboid_0d_all
```

### 1D

```text
olap.inventory_cuboid_1d_time
olap.inventory_cuboid_1d_product
olap.inventory_cuboid_1d_store
```

### 2D

```text
olap.inventory_cuboid_2d_time_product
olap.inventory_cuboid_2d_time_store
olap.inventory_cuboid_2d_product_store
```

### 3D

```text
olap.inventory_cuboid_3d_time_product_store
```

Inventory measures:

```text
total_inventory_quantity = SUM(soluongtonkho)
avg_inventory_quantity   = AVG(soluongtonkho)
min_inventory_quantity   = MIN(soluongtonkho)
max_inventory_quantity   = MAX(soluongtonkho)
row_count                = COUNT_BIG(*)
```

Total base materialized cuboids:

```text
16 Sales + 8 Inventory = 24 cuboid tables
```

---

## 8. Practical Query Routing Examples

If the director asks:

### Revenue by Time + Product

Use:

```text
olap.sales_cuboid_2d_time_product
```

### Revenue by Store + Customer

Use:

```text
olap.sales_cuboid_2d_store_customer
```

### Revenue by Time + Product + Store

Use:

```text
olap.sales_cuboid_3d_time_product_store
```

### Inventory by Time + Store + Product

Use:

```text
olap.inventory_cuboid_3d_time_product_store
```

Instead of aggregating from `dw.fact_sale` or `dw.fact_inventory_snapshot` again, the system can read from the appropriate precomputed cuboid.

---

## 9. How to Show the Work to the Instructor

### 9.1 SSMS Database Engine

Show:

```text
datawarehouse
└── olap
    ├── sales_cuboid_0d_all
    ├── sales_cuboid_1d_time
    ├── ...
    └── inventory_cuboid_3d_time_product_store
```

Run:

```text
data/verify_olap_cuboids.sql
```

Expected:

```text
24 cuboid tables
16 Sales cuboids
8 Inventory cuboids
```

### 9.2 Visual Studio / SSDT

Show:

- Data Source
- Data Source View
- Dimensions
- Hierarchies
- Retail Analytics Cube
- Measure Groups:
  - Sales
  - Inventory Snapshot
- Dimension Usage
- Browse tab

Recommended SSAS model:

```text
Retail Analytics Cube
├── Measure Group: Sales
├── Measure Group: Inventory Snapshot
├── Dimension: Time
├── Dimension: Product
├── Dimension: Store
└── Dimension: Customer
```

Dimension usage:

| Dimension | Sales | Inventory Snapshot |
|---|---|---|
| Time | Regular | Regular |
| Product | Regular | Regular |
| Store | Regular | Regular |
| Customer | Regular | No relationship |

### 9.3 SSMS Analysis Services

Connect to Analysis Services and run:

```text
data/ssas_cuboid_demo_queries.mdx
```

Use the MDX queries to show:

- 0D Sales total;
- 1D Sales by Time;
- 2D Sales by Time + Product;
- 3D Sales by Time + Product + Store;
- 4D Sales by Time + Product + Store + Customer;
- Inventory cuboid-like levels.

---

## 10. Refresh Statistics

`UPDATE STATISTICS` does not create indexes.

It updates the data-distribution information used by SQL Server Optimizer.

This matters because:

- after large seed data, row counts and distributions change;
- after creating/dropping indexes, the optimizer needs updated statistics;
- after materializing cuboids, the optimizer should know the new cuboid table distributions.

Good indexes with stale statistics can still lead to bad execution plans.

Use:

```sql
UPDATE STATISTICS <schema>.<table> WITH FULLSCAN;
```

after:

- seed data;
- advanced index creation;
- materialized cuboid creation.

---

## 11. Run Order

```powershell
python .\data\build_dw.py --mode schema
python .\data\seed_dw_2022_2025.py --mode reset-and-seed

sqlcmd -S localhost,1433 -U sa -P "<SA_PASSWORD>" -C -d datawarehouse -b -i data\create_advanced_indexes.sql -o data\create_advanced_indexes.log

sqlcmd -S localhost,1433 -U sa -P "<SA_PASSWORD>" -C -d datawarehouse -b -i data\create_materialized_cuboids.sql -o data\create_materialized_cuboids.log

sqlcmd -S localhost,1433 -U sa -P "<SA_PASSWORD>" -C -d datawarehouse -b -i data\verify_olap_cuboids.sql -o data\verify_olap_cuboids.log

# optional
sqlcmd -S localhost,1433 -U sa -P "<SA_PASSWORD>" -C -d datawarehouse -b -i data\create_olap_indexes.sql -o data\create_olap_indexes.log

sqlcmd -S localhost,1433 -U sa -P "<SA_PASSWORD>" -C -d datawarehouse -b -i data\test_dw_queries.sql -o data\test_dw_results.txt
```

---

## 12. Demo Narrative

Use this wording:

> Phần index level Kho đã giúp tăng tốc truy vấn trên fact/dimension. Tuy nhiên, OLAP không chỉ dừng ở việc query được. Với dữ liệu doanh nghiệp lớn, hệ thống cần tính sẵn các cuboid trong lattice. Vì vậy nhóm bổ sung schema `olap` chứa 24 materialized cuboid tables: 16 cho Sales và 8 cho Inventory. Khi có câu hỏi phân tích mới trong phạm vi các chiều hiện có, hệ thống có thể đọc trực tiếp cuboid phù hợp thay vì aggregate lại từ fact table hơn một triệu dòng. Cách này đánh đổi dung lượng lưu trữ lấy tốc độ phản hồi, phù hợp với yêu cầu OLAP thực tế.
>
> Khi demo, nhóm sẽ show ở 3 nơi: SSMS Database Engine để chứng minh cuboid tables đã được materialize; Visual Studio/SSDT để chứng minh cube, measure group, dimension, hierarchy và dimension usage; SSMS Analysis Services để browse hoặc chạy MDX truy vấn các mức cuboid khác nhau.

---

## 13. Trade-offs

Benefits:

- faster OLAP answers;
- stable analytical response time;
- clear lattice/cuboid mindset;
- easier demo in SSMS;
- better enterprise-scale story.

Costs:

- more storage;
- cuboids must be rebuilt after fact data refresh;
- more scripts to maintain;
- phase 1 covers base lattice, not every hierarchy-level cuboid.

---

## 14. Phase 2 Options

This phase creates 24 base cuboids.

Future extensions:

- hierarchy-level cuboids:
  - Year/Quarter/Month;
  - Bang/ThanhPho/Store;
  - Customer type/geography;
- automated cuboid generator;
- SSAS Aggregation Design;
- partitioned cuboid refresh;
- incremental cuboid refresh by time period.
