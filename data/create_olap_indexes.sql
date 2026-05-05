-- ============================================================================
-- create_olap_indexes.sql
-- Optional columnstore indexes for OLAP/SSAS processing and large scans.
--
-- This file is optional. It complements, but does not replace:
--   - data/create_advanced_indexes.sql        (rowstore/covering DW indexes)
--   - data/create_materialized_cuboids.sql    (precomputed OLAP cuboids)
--
-- Use when fact tables grow large or when SSAS processing spends most time
-- scanning/aggregating fact tables.
-- ============================================================================

USE datawarehouse;
GO

DROP INDEX IF EXISTS ncci_fact_sale_olap ON dw.fact_sale;
GO

DROP INDEX IF EXISTS ncci_inventory_snapshot_olap ON dw.fact_inventory_snapshot;
GO

CREATE NONCLUSTERED COLUMNSTORE INDEX ncci_fact_sale_olap
ON dw.fact_sale
(
    productkey,
    timekey,
    storekey,
    customerkey,
    soluongban,
    tongtien
);
GO

CREATE NONCLUSTERED COLUMNSTORE INDEX ncci_inventory_snapshot_olap
ON dw.fact_inventory_snapshot
(
    timekey,
    storekey,
    productkey,
    soluongtonkho
);
GO
