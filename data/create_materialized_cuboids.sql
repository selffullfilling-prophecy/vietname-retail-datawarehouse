-- ============================================================================
-- create_materialized_cuboids.sql
-- Builds the OLAP materialized cuboid layer in SQL Server Database Engine.
--
-- Purpose:
--   - Precompute base lattice cuboids for Sales and Inventory.
--   - Trade storage for low-latency OLAP answers.
--   - Give a clear SSMS-demoable `olap` schema with physical cuboid tables.
--
-- Run after:
--   1. python .\data\build_dw.py --mode schema
--   2. python .\data\seed_dw_2022_2025.py --mode reset-and-seed
--   3. sqlcmd ... -i data\create_advanced_indexes.sql
--
-- Notes:
--   - These are physical aggregate tables, not views.
--   - Script is re-runnable: it drops and rebuilds only olap cuboid tables.
-- ============================================================================

USE datawarehouse;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'olap')
    EXEC(N'CREATE SCHEMA olap');
GO

-- ----------------------------------------------------------------------------
-- Sales base lattice: 4 dimensions => 2^4 = 16 cuboids
-- Dimensions: timekey, productkey, storekey, customerkey
-- Measures: total_quantity_sold, total_sales_amount, row_count
-- ----------------------------------------------------------------------------

-- 0D Sales cuboid: sales_cuboid_0d_all
DROP TABLE IF EXISTS olap.sales_cuboid_0d_all;
GO

SELECT
    SUM(CAST(soluongban AS BIGINT)) AS total_quantity_sold,
    SUM(CAST(tongtien AS DECIMAL(18,2))) AS total_sales_amount,
    COUNT_BIG(*) AS row_count
INTO olap.sales_cuboid_0d_all
FROM dw.fact_sale;
GO

-- 1D Sales cuboid: sales_cuboid_1d_time
DROP TABLE IF EXISTS olap.sales_cuboid_1d_time;
GO

SELECT
    timekey,
    SUM(CAST(soluongban AS BIGINT)) AS total_quantity_sold,
    SUM(CAST(tongtien AS DECIMAL(18,2))) AS total_sales_amount,
    COUNT_BIG(*) AS row_count
INTO olap.sales_cuboid_1d_time
FROM dw.fact_sale
GROUP BY timekey;
GO

-- 1D Sales cuboid: sales_cuboid_1d_product
DROP TABLE IF EXISTS olap.sales_cuboid_1d_product;
GO

SELECT
    productkey,
    SUM(CAST(soluongban AS BIGINT)) AS total_quantity_sold,
    SUM(CAST(tongtien AS DECIMAL(18,2))) AS total_sales_amount,
    COUNT_BIG(*) AS row_count
INTO olap.sales_cuboid_1d_product
FROM dw.fact_sale
GROUP BY productkey;
GO

-- 1D Sales cuboid: sales_cuboid_1d_store
DROP TABLE IF EXISTS olap.sales_cuboid_1d_store;
GO

SELECT
    storekey,
    SUM(CAST(soluongban AS BIGINT)) AS total_quantity_sold,
    SUM(CAST(tongtien AS DECIMAL(18,2))) AS total_sales_amount,
    COUNT_BIG(*) AS row_count
INTO olap.sales_cuboid_1d_store
FROM dw.fact_sale
GROUP BY storekey;
GO

-- 1D Sales cuboid: sales_cuboid_1d_customer
DROP TABLE IF EXISTS olap.sales_cuboid_1d_customer;
GO

SELECT
    customerkey,
    SUM(CAST(soluongban AS BIGINT)) AS total_quantity_sold,
    SUM(CAST(tongtien AS DECIMAL(18,2))) AS total_sales_amount,
    COUNT_BIG(*) AS row_count
INTO olap.sales_cuboid_1d_customer
FROM dw.fact_sale
GROUP BY customerkey;
GO

-- 2D Sales cuboid: sales_cuboid_2d_time_product
DROP TABLE IF EXISTS olap.sales_cuboid_2d_time_product;
GO

SELECT
    timekey,
    productkey,
    SUM(CAST(soluongban AS BIGINT)) AS total_quantity_sold,
    SUM(CAST(tongtien AS DECIMAL(18,2))) AS total_sales_amount,
    COUNT_BIG(*) AS row_count
INTO olap.sales_cuboid_2d_time_product
FROM dw.fact_sale
GROUP BY timekey, productkey;
GO

-- 2D Sales cuboid: sales_cuboid_2d_time_store
DROP TABLE IF EXISTS olap.sales_cuboid_2d_time_store;
GO

SELECT
    timekey,
    storekey,
    SUM(CAST(soluongban AS BIGINT)) AS total_quantity_sold,
    SUM(CAST(tongtien AS DECIMAL(18,2))) AS total_sales_amount,
    COUNT_BIG(*) AS row_count
INTO olap.sales_cuboid_2d_time_store
FROM dw.fact_sale
GROUP BY timekey, storekey;
GO

-- 2D Sales cuboid: sales_cuboid_2d_time_customer
DROP TABLE IF EXISTS olap.sales_cuboid_2d_time_customer;
GO

SELECT
    timekey,
    customerkey,
    SUM(CAST(soluongban AS BIGINT)) AS total_quantity_sold,
    SUM(CAST(tongtien AS DECIMAL(18,2))) AS total_sales_amount,
    COUNT_BIG(*) AS row_count
INTO olap.sales_cuboid_2d_time_customer
FROM dw.fact_sale
GROUP BY timekey, customerkey;
GO

-- 2D Sales cuboid: sales_cuboid_2d_product_store
DROP TABLE IF EXISTS olap.sales_cuboid_2d_product_store;
GO

SELECT
    productkey,
    storekey,
    SUM(CAST(soluongban AS BIGINT)) AS total_quantity_sold,
    SUM(CAST(tongtien AS DECIMAL(18,2))) AS total_sales_amount,
    COUNT_BIG(*) AS row_count
INTO olap.sales_cuboid_2d_product_store
FROM dw.fact_sale
GROUP BY productkey, storekey;
GO

-- 2D Sales cuboid: sales_cuboid_2d_product_customer
DROP TABLE IF EXISTS olap.sales_cuboid_2d_product_customer;
GO

SELECT
    productkey,
    customerkey,
    SUM(CAST(soluongban AS BIGINT)) AS total_quantity_sold,
    SUM(CAST(tongtien AS DECIMAL(18,2))) AS total_sales_amount,
    COUNT_BIG(*) AS row_count
INTO olap.sales_cuboid_2d_product_customer
FROM dw.fact_sale
GROUP BY productkey, customerkey;
GO

-- 2D Sales cuboid: sales_cuboid_2d_store_customer
DROP TABLE IF EXISTS olap.sales_cuboid_2d_store_customer;
GO

SELECT
    storekey,
    customerkey,
    SUM(CAST(soluongban AS BIGINT)) AS total_quantity_sold,
    SUM(CAST(tongtien AS DECIMAL(18,2))) AS total_sales_amount,
    COUNT_BIG(*) AS row_count
INTO olap.sales_cuboid_2d_store_customer
FROM dw.fact_sale
GROUP BY storekey, customerkey;
GO

-- 3D Sales cuboid: sales_cuboid_3d_time_product_store
DROP TABLE IF EXISTS olap.sales_cuboid_3d_time_product_store;
GO

SELECT
    timekey,
    productkey,
    storekey,
    SUM(CAST(soluongban AS BIGINT)) AS total_quantity_sold,
    SUM(CAST(tongtien AS DECIMAL(18,2))) AS total_sales_amount,
    COUNT_BIG(*) AS row_count
INTO olap.sales_cuboid_3d_time_product_store
FROM dw.fact_sale
GROUP BY timekey, productkey, storekey;
GO

-- 3D Sales cuboid: sales_cuboid_3d_time_product_customer
DROP TABLE IF EXISTS olap.sales_cuboid_3d_time_product_customer;
GO

SELECT
    timekey,
    productkey,
    customerkey,
    SUM(CAST(soluongban AS BIGINT)) AS total_quantity_sold,
    SUM(CAST(tongtien AS DECIMAL(18,2))) AS total_sales_amount,
    COUNT_BIG(*) AS row_count
INTO olap.sales_cuboid_3d_time_product_customer
FROM dw.fact_sale
GROUP BY timekey, productkey, customerkey;
GO

-- 3D Sales cuboid: sales_cuboid_3d_time_store_customer
DROP TABLE IF EXISTS olap.sales_cuboid_3d_time_store_customer;
GO

SELECT
    timekey,
    storekey,
    customerkey,
    SUM(CAST(soluongban AS BIGINT)) AS total_quantity_sold,
    SUM(CAST(tongtien AS DECIMAL(18,2))) AS total_sales_amount,
    COUNT_BIG(*) AS row_count
INTO olap.sales_cuboid_3d_time_store_customer
FROM dw.fact_sale
GROUP BY timekey, storekey, customerkey;
GO

-- 3D Sales cuboid: sales_cuboid_3d_product_store_customer
DROP TABLE IF EXISTS olap.sales_cuboid_3d_product_store_customer;
GO

SELECT
    productkey,
    storekey,
    customerkey,
    SUM(CAST(soluongban AS BIGINT)) AS total_quantity_sold,
    SUM(CAST(tongtien AS DECIMAL(18,2))) AS total_sales_amount,
    COUNT_BIG(*) AS row_count
INTO olap.sales_cuboid_3d_product_store_customer
FROM dw.fact_sale
GROUP BY productkey, storekey, customerkey;
GO

-- 4D Sales cuboid: sales_cuboid_4d_time_product_store_customer
DROP TABLE IF EXISTS olap.sales_cuboid_4d_time_product_store_customer;
GO

SELECT
    timekey,
    productkey,
    storekey,
    customerkey,
    SUM(CAST(soluongban AS BIGINT)) AS total_quantity_sold,
    SUM(CAST(tongtien AS DECIMAL(18,2))) AS total_sales_amount,
    COUNT_BIG(*) AS row_count
INTO olap.sales_cuboid_4d_time_product_store_customer
FROM dw.fact_sale
GROUP BY timekey, productkey, storekey, customerkey;
GO

-- ----------------------------------------------------------------------------
-- Inventory base lattice: 3 dimensions => 2^3 = 8 cuboids
-- Dimensions: timekey, productkey, storekey
-- Measures: total_inventory_quantity, avg/min/max inventory, row_count
-- ----------------------------------------------------------------------------

-- 0D Inventory cuboid: inventory_cuboid_0d_all
DROP TABLE IF EXISTS olap.inventory_cuboid_0d_all;
GO

SELECT
    SUM(CAST(soluongtonkho AS BIGINT)) AS total_inventory_quantity,
    AVG(CAST(soluongtonkho AS DECIMAL(18,2))) AS avg_inventory_quantity,
    MIN(soluongtonkho) AS min_inventory_quantity,
    MAX(soluongtonkho) AS max_inventory_quantity,
    COUNT_BIG(*) AS row_count
INTO olap.inventory_cuboid_0d_all
FROM dw.fact_inventory_snapshot;
GO

-- 1D Inventory cuboid: inventory_cuboid_1d_time
DROP TABLE IF EXISTS olap.inventory_cuboid_1d_time;
GO

SELECT
    timekey,
    SUM(CAST(soluongtonkho AS BIGINT)) AS total_inventory_quantity,
    AVG(CAST(soluongtonkho AS DECIMAL(18,2))) AS avg_inventory_quantity,
    MIN(soluongtonkho) AS min_inventory_quantity,
    MAX(soluongtonkho) AS max_inventory_quantity,
    COUNT_BIG(*) AS row_count
INTO olap.inventory_cuboid_1d_time
FROM dw.fact_inventory_snapshot
GROUP BY timekey;
GO

-- 1D Inventory cuboid: inventory_cuboid_1d_product
DROP TABLE IF EXISTS olap.inventory_cuboid_1d_product;
GO

SELECT
    productkey,
    SUM(CAST(soluongtonkho AS BIGINT)) AS total_inventory_quantity,
    AVG(CAST(soluongtonkho AS DECIMAL(18,2))) AS avg_inventory_quantity,
    MIN(soluongtonkho) AS min_inventory_quantity,
    MAX(soluongtonkho) AS max_inventory_quantity,
    COUNT_BIG(*) AS row_count
INTO olap.inventory_cuboid_1d_product
FROM dw.fact_inventory_snapshot
GROUP BY productkey;
GO

-- 1D Inventory cuboid: inventory_cuboid_1d_store
DROP TABLE IF EXISTS olap.inventory_cuboid_1d_store;
GO

SELECT
    storekey,
    SUM(CAST(soluongtonkho AS BIGINT)) AS total_inventory_quantity,
    AVG(CAST(soluongtonkho AS DECIMAL(18,2))) AS avg_inventory_quantity,
    MIN(soluongtonkho) AS min_inventory_quantity,
    MAX(soluongtonkho) AS max_inventory_quantity,
    COUNT_BIG(*) AS row_count
INTO olap.inventory_cuboid_1d_store
FROM dw.fact_inventory_snapshot
GROUP BY storekey;
GO

-- 2D Inventory cuboid: inventory_cuboid_2d_time_product
DROP TABLE IF EXISTS olap.inventory_cuboid_2d_time_product;
GO

SELECT
    timekey,
    productkey,
    SUM(CAST(soluongtonkho AS BIGINT)) AS total_inventory_quantity,
    AVG(CAST(soluongtonkho AS DECIMAL(18,2))) AS avg_inventory_quantity,
    MIN(soluongtonkho) AS min_inventory_quantity,
    MAX(soluongtonkho) AS max_inventory_quantity,
    COUNT_BIG(*) AS row_count
INTO olap.inventory_cuboid_2d_time_product
FROM dw.fact_inventory_snapshot
GROUP BY timekey, productkey;
GO

-- 2D Inventory cuboid: inventory_cuboid_2d_time_store
DROP TABLE IF EXISTS olap.inventory_cuboid_2d_time_store;
GO

SELECT
    timekey,
    storekey,
    SUM(CAST(soluongtonkho AS BIGINT)) AS total_inventory_quantity,
    AVG(CAST(soluongtonkho AS DECIMAL(18,2))) AS avg_inventory_quantity,
    MIN(soluongtonkho) AS min_inventory_quantity,
    MAX(soluongtonkho) AS max_inventory_quantity,
    COUNT_BIG(*) AS row_count
INTO olap.inventory_cuboid_2d_time_store
FROM dw.fact_inventory_snapshot
GROUP BY timekey, storekey;
GO

-- 2D Inventory cuboid: inventory_cuboid_2d_product_store
DROP TABLE IF EXISTS olap.inventory_cuboid_2d_product_store;
GO

SELECT
    productkey,
    storekey,
    SUM(CAST(soluongtonkho AS BIGINT)) AS total_inventory_quantity,
    AVG(CAST(soluongtonkho AS DECIMAL(18,2))) AS avg_inventory_quantity,
    MIN(soluongtonkho) AS min_inventory_quantity,
    MAX(soluongtonkho) AS max_inventory_quantity,
    COUNT_BIG(*) AS row_count
INTO olap.inventory_cuboid_2d_product_store
FROM dw.fact_inventory_snapshot
GROUP BY productkey, storekey;
GO

-- 3D Inventory cuboid: inventory_cuboid_3d_time_product_store
DROP TABLE IF EXISTS olap.inventory_cuboid_3d_time_product_store;
GO

SELECT
    timekey,
    productkey,
    storekey,
    SUM(CAST(soluongtonkho AS BIGINT)) AS total_inventory_quantity,
    AVG(CAST(soluongtonkho AS DECIMAL(18,2))) AS avg_inventory_quantity,
    MIN(soluongtonkho) AS min_inventory_quantity,
    MAX(soluongtonkho) AS max_inventory_quantity,
    COUNT_BIG(*) AS row_count
INTO olap.inventory_cuboid_3d_time_product_store
FROM dw.fact_inventory_snapshot
GROUP BY timekey, productkey, storekey;
GO

-- ----------------------------------------------------------------------------
-- Index cuboid grouping keys. 0D cuboids do not need indexes.
-- ----------------------------------------------------------------------------

CREATE INDEX idx_sales_cuboid_1d_time
    ON olap.sales_cuboid_1d_time(timekey);
GO

CREATE INDEX idx_sales_cuboid_1d_product
    ON olap.sales_cuboid_1d_product(productkey);
GO

CREATE INDEX idx_sales_cuboid_1d_store
    ON olap.sales_cuboid_1d_store(storekey);
GO

CREATE INDEX idx_sales_cuboid_1d_customer
    ON olap.sales_cuboid_1d_customer(customerkey);
GO

CREATE INDEX idx_sales_cuboid_2d_time_product
    ON olap.sales_cuboid_2d_time_product(timekey, productkey);
GO

CREATE INDEX idx_sales_cuboid_2d_time_store
    ON olap.sales_cuboid_2d_time_store(timekey, storekey);
GO

CREATE INDEX idx_sales_cuboid_2d_time_customer
    ON olap.sales_cuboid_2d_time_customer(timekey, customerkey);
GO

CREATE INDEX idx_sales_cuboid_2d_product_store
    ON olap.sales_cuboid_2d_product_store(productkey, storekey);
GO

CREATE INDEX idx_sales_cuboid_2d_product_customer
    ON olap.sales_cuboid_2d_product_customer(productkey, customerkey);
GO

CREATE INDEX idx_sales_cuboid_2d_store_customer
    ON olap.sales_cuboid_2d_store_customer(storekey, customerkey);
GO

CREATE INDEX idx_sales_cuboid_3d_time_product_store
    ON olap.sales_cuboid_3d_time_product_store(timekey, productkey, storekey);
GO

CREATE INDEX idx_sales_cuboid_3d_time_product_customer
    ON olap.sales_cuboid_3d_time_product_customer(timekey, productkey, customerkey);
GO

CREATE INDEX idx_sales_cuboid_3d_time_store_customer
    ON olap.sales_cuboid_3d_time_store_customer(timekey, storekey, customerkey);
GO

CREATE INDEX idx_sales_cuboid_3d_product_store_customer
    ON olap.sales_cuboid_3d_product_store_customer(productkey, storekey, customerkey);
GO

CREATE INDEX idx_sales_cuboid_4d_time_product_store_customer
    ON olap.sales_cuboid_4d_time_product_store_customer(timekey, productkey, storekey, customerkey);
GO

CREATE INDEX idx_inventory_cuboid_1d_time
    ON olap.inventory_cuboid_1d_time(timekey);
GO

CREATE INDEX idx_inventory_cuboid_1d_product
    ON olap.inventory_cuboid_1d_product(productkey);
GO

CREATE INDEX idx_inventory_cuboid_1d_store
    ON olap.inventory_cuboid_1d_store(storekey);
GO

CREATE INDEX idx_inventory_cuboid_2d_time_product
    ON olap.inventory_cuboid_2d_time_product(timekey, productkey);
GO

CREATE INDEX idx_inventory_cuboid_2d_time_store
    ON olap.inventory_cuboid_2d_time_store(timekey, storekey);
GO

CREATE INDEX idx_inventory_cuboid_2d_product_store
    ON olap.inventory_cuboid_2d_product_store(productkey, storekey);
GO

CREATE INDEX idx_inventory_cuboid_3d_time_product_store
    ON olap.inventory_cuboid_3d_time_product_store(timekey, productkey, storekey);
GO

-- ----------------------------------------------------------------------------
-- Refresh statistics for the cuboid layer.
-- This helps the optimizer choose stable plans when querying precomputed cuboids.
-- ----------------------------------------------------------------------------

UPDATE STATISTICS olap.sales_cuboid_0d_all WITH FULLSCAN;
UPDATE STATISTICS olap.sales_cuboid_1d_time WITH FULLSCAN;
UPDATE STATISTICS olap.sales_cuboid_1d_product WITH FULLSCAN;
UPDATE STATISTICS olap.sales_cuboid_1d_store WITH FULLSCAN;
UPDATE STATISTICS olap.sales_cuboid_1d_customer WITH FULLSCAN;
UPDATE STATISTICS olap.sales_cuboid_2d_time_product WITH FULLSCAN;
UPDATE STATISTICS olap.sales_cuboid_2d_time_store WITH FULLSCAN;
UPDATE STATISTICS olap.sales_cuboid_2d_time_customer WITH FULLSCAN;
UPDATE STATISTICS olap.sales_cuboid_2d_product_store WITH FULLSCAN;
UPDATE STATISTICS olap.sales_cuboid_2d_product_customer WITH FULLSCAN;
UPDATE STATISTICS olap.sales_cuboid_2d_store_customer WITH FULLSCAN;
UPDATE STATISTICS olap.sales_cuboid_3d_time_product_store WITH FULLSCAN;
UPDATE STATISTICS olap.sales_cuboid_3d_time_product_customer WITH FULLSCAN;
UPDATE STATISTICS olap.sales_cuboid_3d_time_store_customer WITH FULLSCAN;
UPDATE STATISTICS olap.sales_cuboid_3d_product_store_customer WITH FULLSCAN;
UPDATE STATISTICS olap.sales_cuboid_4d_time_product_store_customer WITH FULLSCAN;
UPDATE STATISTICS olap.inventory_cuboid_0d_all WITH FULLSCAN;
UPDATE STATISTICS olap.inventory_cuboid_1d_time WITH FULLSCAN;
UPDATE STATISTICS olap.inventory_cuboid_1d_product WITH FULLSCAN;
UPDATE STATISTICS olap.inventory_cuboid_1d_store WITH FULLSCAN;
UPDATE STATISTICS olap.inventory_cuboid_2d_time_product WITH FULLSCAN;
UPDATE STATISTICS olap.inventory_cuboid_2d_time_store WITH FULLSCAN;
UPDATE STATISTICS olap.inventory_cuboid_2d_product_store WITH FULLSCAN;
UPDATE STATISTICS olap.inventory_cuboid_3d_time_product_store WITH FULLSCAN;
GO
