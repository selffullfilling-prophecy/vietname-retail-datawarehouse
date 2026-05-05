-- ============================================================================
-- verify_olap_cuboids.sql
-- Verification script for OLAP materialized cuboids in SQL Server Database Engine.
-- Expected: 24 cuboid tables in schema `olap`
--   - 16 Sales cuboids
--   - 8 Inventory cuboids
-- ============================================================================

USE datawarehouse;
GO

-- 1. List cuboid tables and row counts.
SELECT 
    s.name AS schema_name,
    t.name AS table_name,
    SUM(p.rows) AS row_count
FROM sys.tables t
JOIN sys.schemas s 
    ON t.schema_id = s.schema_id
JOIN sys.partitions p 
    ON t.object_id = p.object_id
   AND p.index_id IN (0, 1)
WHERE s.name = N'olap'
GROUP BY s.name, t.name
ORDER BY t.name;
GO

-- 2. Count cuboid tables.
SELECT 
    COUNT(*) AS cuboid_table_count,
    CASE 
        WHEN COUNT(*) = 24 THEN 'OK: expected 24 cuboid tables'
        ELSE 'CHECK: expected 24 cuboid tables'
    END AS status
FROM sys.tables t
JOIN sys.schemas s 
    ON t.schema_id = s.schema_id
WHERE s.name = N'olap';
GO

-- 3. Count Sales and Inventory cuboids separately.
SELECT
    SUM(CASE WHEN t.name LIKE N'sales_cuboid_%' THEN 1 ELSE 0 END) AS sales_cuboid_count,
    SUM(CASE WHEN t.name LIKE N'inventory_cuboid_%' THEN 1 ELSE 0 END) AS inventory_cuboid_count,
    CASE 
        WHEN SUM(CASE WHEN t.name LIKE N'sales_cuboid_%' THEN 1 ELSE 0 END) = 16
         AND SUM(CASE WHEN t.name LIKE N'inventory_cuboid_%' THEN 1 ELSE 0 END) = 8
        THEN 'OK: 16 Sales + 8 Inventory'
        ELSE 'CHECK: expected 16 Sales + 8 Inventory'
    END AS status
FROM sys.tables t
JOIN sys.schemas s 
    ON t.schema_id = s.schema_id
WHERE s.name = N'olap';
GO

-- 4. List indexes on cuboid tables.
SELECT 
    s.name AS schema_name,
    t.name AS table_name,
    i.name AS index_name,
    i.type_desc AS index_type
FROM sys.indexes i
JOIN sys.tables t 
    ON i.object_id = t.object_id
JOIN sys.schemas s 
    ON t.schema_id = s.schema_id
WHERE s.name = N'olap'
ORDER BY t.name, i.name;
GO

-- 5. Storage footprint by cuboid table.
SELECT
    s.name AS schema_name,
    t.name AS table_name,
    CAST(SUM(a.total_pages) * 8.0 / 1024 AS DECIMAL(18,2)) AS total_mb,
    CAST(SUM(a.used_pages)  * 8.0 / 1024 AS DECIMAL(18,2)) AS used_mb,
    CAST(SUM(a.data_pages)  * 8.0 / 1024 AS DECIMAL(18,2)) AS data_mb
FROM sys.tables t
JOIN sys.schemas s 
    ON t.schema_id = s.schema_id
JOIN sys.indexes i
    ON t.object_id = i.object_id
JOIN sys.partitions p
    ON i.object_id = p.object_id
   AND i.index_id = p.index_id
JOIN sys.allocation_units a
    ON p.partition_id = a.container_id
WHERE s.name = N'olap'
GROUP BY s.name, t.name
ORDER BY total_mb DESC, t.name;
GO

-- 6. Smoke-test representative cuboids.
SELECT TOP 20 * FROM olap.sales_cuboid_0d_all;
SELECT TOP 20 * FROM olap.sales_cuboid_2d_time_product ORDER BY timekey, productkey;
SELECT TOP 20 * FROM olap.sales_cuboid_4d_time_product_store_customer ORDER BY timekey, productkey, storekey, customerkey;
SELECT TOP 20 * FROM olap.inventory_cuboid_0d_all;
SELECT TOP 20 * FROM olap.inventory_cuboid_3d_time_product_store ORDER BY timekey, productkey, storekey;
GO
