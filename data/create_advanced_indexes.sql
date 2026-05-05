-- ============================================================================
-- create_advanced_indexes.sql
-- Rowstore indexes for common DW business queries.
--
-- Run this after:
--   1. python .\data\build_dw.py --mode schema
--   2. python .\data\seed_dw_2022_2025.py --mode reset-and-seed
--
-- This script is intentionally re-runnable. It drops old/redundant manual
-- indexes first, then creates covering indexes for the current workload.
-- It does not drop indexes created by PRIMARY KEY or UNIQUE constraints.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Drop redundant dimension indexes.
-- These duplicate UNIQUE constraints on mamh, makh, and macuahang.
-- ----------------------------------------------------------------------------
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_dim_product_mamh' AND object_id = OBJECT_ID(N'dw.dim_product'))
    DROP INDEX idx_dim_product_mamh ON dw.dim_product;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_dim_customer_makh' AND object_id = OBJECT_ID(N'dw.dim_customer'))
    DROP INDEX idx_dim_customer_makh ON dw.dim_customer;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_dim_store_macuahang' AND object_id = OBJECT_ID(N'dw.dim_store'))
    DROP INDEX idx_dim_store_macuahang ON dw.dim_store;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_dim_store_city_region' AND object_id = OBJECT_ID(N'dw.dim_store'))
    DROP INDEX idx_dim_store_city_region ON dw.dim_store;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_dim_time_year_quarter_month' AND object_id = OBJECT_ID(N'dw.dim_time'))
    DROP INDEX idx_dim_time_year_quarter_month ON dw.dim_time;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_dim_customer_city_region' AND object_id = OBJECT_ID(N'dw.dim_customer'))
    DROP INDEX idx_dim_customer_city_region ON dw.dim_customer;
GO

-- ----------------------------------------------------------------------------
-- 2. Drop older fact indexes that are replaced by covering indexes below.
-- ----------------------------------------------------------------------------
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_fact_sale_timekey' AND object_id = OBJECT_ID(N'dw.fact_sale'))
    DROP INDEX idx_fact_sale_timekey ON dw.fact_sale;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_fact_sale_productkey' AND object_id = OBJECT_ID(N'dw.fact_sale'))
    DROP INDEX idx_fact_sale_productkey ON dw.fact_sale;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_fact_sale_storekey' AND object_id = OBJECT_ID(N'dw.fact_sale'))
    DROP INDEX idx_fact_sale_storekey ON dw.fact_sale;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_fact_sale_customerkey' AND object_id = OBJECT_ID(N'dw.fact_sale'))
    DROP INDEX idx_fact_sale_customerkey ON dw.fact_sale;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_fact_sale_store_product_time' AND object_id = OBJECT_ID(N'dw.fact_sale'))
    DROP INDEX idx_fact_sale_store_product_time ON dw.fact_sale;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_inventory_snapshot_timekey' AND object_id = OBJECT_ID(N'dw.fact_inventory_snapshot'))
    DROP INDEX idx_inventory_snapshot_timekey ON dw.fact_inventory_snapshot;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_inventory_snapshot_storekey' AND object_id = OBJECT_ID(N'dw.fact_inventory_snapshot'))
    DROP INDEX idx_inventory_snapshot_storekey ON dw.fact_inventory_snapshot;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_inventory_snapshot_productkey' AND object_id = OBJECT_ID(N'dw.fact_inventory_snapshot'))
    DROP INDEX idx_inventory_snapshot_productkey ON dw.fact_inventory_snapshot;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_inventory_snapshot_store_product_time' AND object_id = OBJECT_ID(N'dw.fact_inventory_snapshot'))
    DROP INDEX idx_inventory_snapshot_store_product_time ON dw.fact_inventory_snapshot;
GO

-- ----------------------------------------------------------------------------
-- 3. Drop this script's indexes when re-running.
-- ----------------------------------------------------------------------------
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_fact_sale_store_product_time_cover' AND object_id = OBJECT_ID(N'dw.fact_sale'))
    DROP INDEX idx_fact_sale_store_product_time_cover ON dw.fact_sale;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_fact_sale_time_store_product_cover' AND object_id = OBJECT_ID(N'dw.fact_sale'))
    DROP INDEX idx_fact_sale_time_store_product_cover ON dw.fact_sale;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_fact_sale_customer_product_time_cover' AND object_id = OBJECT_ID(N'dw.fact_sale'))
    DROP INDEX idx_fact_sale_customer_product_time_cover ON dw.fact_sale;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_inventory_product_time_store_cover' AND object_id = OBJECT_ID(N'dw.fact_inventory_snapshot'))
    DROP INDEX idx_inventory_product_time_store_cover ON dw.fact_inventory_snapshot;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_inventory_store_product_time_cover' AND object_id = OBJECT_ID(N'dw.fact_inventory_snapshot'))
    DROP INDEX idx_inventory_store_product_time_cover ON dw.fact_inventory_snapshot;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_dim_store_region_city_store_cover' AND object_id = OBJECT_ID(N'dw.dim_store'))
    DROP INDEX idx_dim_store_region_city_store_cover ON dw.dim_store;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_dim_store_city_store_cover' AND object_id = OBJECT_ID(N'dw.dim_store'))
    DROP INDEX idx_dim_store_city_store_cover ON dw.dim_store;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_dim_customer_type_makh_cover' AND object_id = OBJECT_ID(N'dw.dim_customer'))
    DROP INDEX idx_dim_customer_type_makh_cover ON dw.dim_customer;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_dim_customer_city_region_cover' AND object_id = OBJECT_ID(N'dw.dim_customer'))
    DROP INDEX idx_dim_customer_city_region_cover ON dw.dim_customer;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_dim_time_year_quarter_month_cover' AND object_id = OBJECT_ID(N'dw.dim_time'))
    DROP INDEX idx_dim_time_year_quarter_month_cover ON dw.dim_time;
GO

-- ----------------------------------------------------------------------------
-- 4. Sales fact indexes.
-- ----------------------------------------------------------------------------
CREATE INDEX idx_fact_sale_time_store_product_cover
    ON dw.fact_sale(timekey, storekey, productkey)
    INCLUDE (customerkey, soluongban, tongtien);
GO

CREATE INDEX idx_fact_sale_store_product_time_cover
    ON dw.fact_sale(storekey, productkey, timekey)
    INCLUDE (customerkey, soluongban, tongtien);
GO

CREATE INDEX idx_fact_sale_customer_product_time_cover
    ON dw.fact_sale(customerkey, productkey, timekey)
    INCLUDE (storekey, soluongban, tongtien);
GO

-- ----------------------------------------------------------------------------
-- 5. Inventory fact indexes.
-- The clustered primary key already supports timekey -> storekey -> productkey.
-- These two indexes support product-first and store-first access paths.
-- ----------------------------------------------------------------------------
CREATE INDEX idx_inventory_product_time_store_cover
    ON dw.fact_inventory_snapshot(productkey, timekey, storekey)
    INCLUDE (soluongtonkho);
GO

CREATE INDEX idx_inventory_store_product_time_cover
    ON dw.fact_inventory_snapshot(storekey, productkey, timekey)
    INCLUDE (soluongtonkho);
GO

-- ----------------------------------------------------------------------------
-- 6. Dimension hierarchy and filter indexes.
-- Dimension tables are small today, but these match dashboard/drill paths.
-- ----------------------------------------------------------------------------
CREATE INDEX idx_dim_time_year_quarter_month_cover
    ON dw.dim_time(nam, quy, thang)
    INCLUDE (timekey);
GO

CREATE INDEX idx_dim_store_region_city_store_cover
    ON dw.dim_store(bang, thanhpho, macuahang)
    INCLUDE (storekey, sodienthoai, diachivp);
GO

CREATE INDEX idx_dim_store_city_store_cover
    ON dw.dim_store(thanhpho, macuahang)
    INCLUDE (storekey, bang, sodienthoai, diachivp);
GO

CREATE INDEX idx_dim_customer_type_makh_cover
    ON dw.dim_customer(iskhdulich, iskhbuudien, makh)
    INCLUDE (customerkey, tenkh, thanhpho, bang);
GO

CREATE INDEX idx_dim_customer_city_region_cover
    ON dw.dim_customer(thanhpho, bang)
    INCLUDE (customerkey, makh, tenkh, iskhdulich, iskhbuudien);
GO

-- ----------------------------------------------------------------------------
-- 7. Refresh statistics after large seed + index changes.
-- ----------------------------------------------------------------------------
UPDATE STATISTICS dw.fact_sale WITH FULLSCAN;
UPDATE STATISTICS dw.fact_inventory_snapshot WITH FULLSCAN;
UPDATE STATISTICS dw.dim_store WITH FULLSCAN;
UPDATE STATISTICS dw.dim_customer WITH FULLSCAN;
GO
