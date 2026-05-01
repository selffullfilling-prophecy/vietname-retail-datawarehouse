-- ============================================================================
-- create_olap_indexes.sql
-- Optional indexes for OLAP/SSAS processing and large analytical scans.
--
-- Use this after create_advanced_indexes.sql when fact tables grow large or
-- SSAS processing spends most of its time scanning/aggregating fact tables.
--
-- These are nonclustered columnstore indexes. They complement rowstore indexes:
-- - rowstore indexes are best for selective filters and joins
-- - columnstore indexes are best for scan-heavy aggregate workloads
--
-- Do not run UPDATE STATISTICS against the auto-created statistics on these
-- columnstore indexes. SQL Server does not support that operation and can raise
-- error 35337. Rebuild/recreate the columnstore index after large reloads if
-- columnstore maintenance is needed.
-- ============================================================================

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ncci_fact_sale_olap' AND object_id = OBJECT_ID(N'dw.fact_sale'))
    DROP INDEX ncci_fact_sale_olap ON dw.fact_sale;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ncci_inventory_snapshot_olap' AND object_id = OBJECT_ID(N'dw.fact_inventory_snapshot'))
    DROP INDEX ncci_inventory_snapshot_olap ON dw.fact_inventory_snapshot;
GO

CREATE NONCLUSTERED COLUMNSTORE INDEX ncci_fact_sale_olap
    ON dw.fact_sale(productkey, timekey, storekey, customerkey, soluongban, tongtien);
GO

CREATE NONCLUSTERED COLUMNSTORE INDEX ncci_inventory_snapshot_olap
    ON dw.fact_inventory_snapshot(timekey, storekey, productkey, soluongtonkho);
GO
