-- ============================================================================
-- create_olap_metadata.sql
-- Metadata for OLAP materialized cuboids and SSAS conceptual objects.
-- This script is documentation-friendly and can be shown in SSMS.
-- ============================================================================

USE datawarehouse;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'metadata')
    EXEC(N'CREATE SCHEMA metadata');
GO

DROP TABLE IF EXISTS metadata.olap_cuboid_metadata;
GO

CREATE TABLE metadata.olap_cuboid_metadata (
    cuboid_metadata_id INT IDENTITY(1,1) PRIMARY KEY,
    subject_area NVARCHAR(50) NOT NULL,
    cuboid_name NVARCHAR(256) NOT NULL,
    dimensionality NVARCHAR(10) NOT NULL,
    grouping_keys NVARCHAR(500) NOT NULL,
    measures NVARCHAR(1000) NOT NULL,
    source_fact_table NVARCHAR(256) NOT NULL,
    purpose NVARCHAR(1000) NOT NULL,
    refresh_strategy NVARCHAR(200) NOT NULL DEFAULT N'Rebuild after fact refresh / seed / ETL load'
);
GO

INSERT INTO metadata.olap_cuboid_metadata
(
    subject_area,
    cuboid_name,
    dimensionality,
    grouping_keys,
    measures,
    source_fact_table,
    purpose
)
VALUES
    (N'Sales', N'olap.sales_cuboid_0d_all', N'0D', N'ALL', N'total_quantity_sold,total_sales_amount,row_count', N'dw.fact_sale', N'Total sales quantity and amount across all dimensions.'),
    (N'Sales', N'olap.sales_cuboid_1d_time', N'1D', N'timekey', N'total_quantity_sold,total_sales_amount,row_count', N'dw.fact_sale', N'Precomputed sales aggregate by Time.'),
    (N'Sales', N'olap.sales_cuboid_1d_product', N'1D', N'productkey', N'total_quantity_sold,total_sales_amount,row_count', N'dw.fact_sale', N'Precomputed sales aggregate by Product.'),
    (N'Sales', N'olap.sales_cuboid_1d_store', N'1D', N'storekey', N'total_quantity_sold,total_sales_amount,row_count', N'dw.fact_sale', N'Precomputed sales aggregate by Store.'),
    (N'Sales', N'olap.sales_cuboid_1d_customer', N'1D', N'customerkey', N'total_quantity_sold,total_sales_amount,row_count', N'dw.fact_sale', N'Precomputed sales aggregate by Customer.'),
    (N'Sales', N'olap.sales_cuboid_2d_time_product', N'2D', N'timekey, productkey', N'total_quantity_sold,total_sales_amount,row_count', N'dw.fact_sale', N'Precomputed sales aggregate by Time, Product.'),
    (N'Sales', N'olap.sales_cuboid_2d_time_store', N'2D', N'timekey, storekey', N'total_quantity_sold,total_sales_amount,row_count', N'dw.fact_sale', N'Precomputed sales aggregate by Time, Store.'),
    (N'Sales', N'olap.sales_cuboid_2d_time_customer', N'2D', N'timekey, customerkey', N'total_quantity_sold,total_sales_amount,row_count', N'dw.fact_sale', N'Precomputed sales aggregate by Time, Customer.'),
    (N'Sales', N'olap.sales_cuboid_2d_product_store', N'2D', N'productkey, storekey', N'total_quantity_sold,total_sales_amount,row_count', N'dw.fact_sale', N'Precomputed sales aggregate by Product, Store.'),
    (N'Sales', N'olap.sales_cuboid_2d_product_customer', N'2D', N'productkey, customerkey', N'total_quantity_sold,total_sales_amount,row_count', N'dw.fact_sale', N'Precomputed sales aggregate by Product, Customer.'),
    (N'Sales', N'olap.sales_cuboid_2d_store_customer', N'2D', N'storekey, customerkey', N'total_quantity_sold,total_sales_amount,row_count', N'dw.fact_sale', N'Precomputed sales aggregate by Store, Customer.'),
    (N'Sales', N'olap.sales_cuboid_3d_time_product_store', N'3D', N'timekey, productkey, storekey', N'total_quantity_sold,total_sales_amount,row_count', N'dw.fact_sale', N'Precomputed sales aggregate by Time, Product, Store.'),
    (N'Sales', N'olap.sales_cuboid_3d_time_product_customer', N'3D', N'timekey, productkey, customerkey', N'total_quantity_sold,total_sales_amount,row_count', N'dw.fact_sale', N'Precomputed sales aggregate by Time, Product, Customer.'),
    (N'Sales', N'olap.sales_cuboid_3d_time_store_customer', N'3D', N'timekey, storekey, customerkey', N'total_quantity_sold,total_sales_amount,row_count', N'dw.fact_sale', N'Precomputed sales aggregate by Time, Store, Customer.'),
    (N'Sales', N'olap.sales_cuboid_3d_product_store_customer', N'3D', N'productkey, storekey, customerkey', N'total_quantity_sold,total_sales_amount,row_count', N'dw.fact_sale', N'Precomputed sales aggregate by Product, Store, Customer.'),
    (N'Sales', N'olap.sales_cuboid_4d_time_product_store_customer', N'4D', N'timekey, productkey, storekey, customerkey', N'total_quantity_sold,total_sales_amount,row_count', N'dw.fact_sale', N'Precomputed sales aggregate by Time, Product, Store, Customer.'),
    (N'Inventory', N'olap.inventory_cuboid_0d_all', N'0D', N'ALL', N'total_inventory_quantity,avg_inventory_quantity,min_inventory_quantity,max_inventory_quantity,row_count', N'dw.fact_inventory_snapshot', N'Total/average/min/max inventory across all dimensions.'),
    (N'Inventory', N'olap.inventory_cuboid_1d_time', N'1D', N'timekey', N'total_inventory_quantity,avg_inventory_quantity,min_inventory_quantity,max_inventory_quantity,row_count', N'dw.fact_inventory_snapshot', N'Precomputed inventory aggregate by Time.'),
    (N'Inventory', N'olap.inventory_cuboid_1d_product', N'1D', N'productkey', N'total_inventory_quantity,avg_inventory_quantity,min_inventory_quantity,max_inventory_quantity,row_count', N'dw.fact_inventory_snapshot', N'Precomputed inventory aggregate by Product.'),
    (N'Inventory', N'olap.inventory_cuboid_1d_store', N'1D', N'storekey', N'total_inventory_quantity,avg_inventory_quantity,min_inventory_quantity,max_inventory_quantity,row_count', N'dw.fact_inventory_snapshot', N'Precomputed inventory aggregate by Store.'),
    (N'Inventory', N'olap.inventory_cuboid_2d_time_product', N'2D', N'timekey, productkey', N'total_inventory_quantity,avg_inventory_quantity,min_inventory_quantity,max_inventory_quantity,row_count', N'dw.fact_inventory_snapshot', N'Precomputed inventory aggregate by Time, Product.'),
    (N'Inventory', N'olap.inventory_cuboid_2d_time_store', N'2D', N'timekey, storekey', N'total_inventory_quantity,avg_inventory_quantity,min_inventory_quantity,max_inventory_quantity,row_count', N'dw.fact_inventory_snapshot', N'Precomputed inventory aggregate by Time, Store.'),
    (N'Inventory', N'olap.inventory_cuboid_2d_product_store', N'2D', N'productkey, storekey', N'total_inventory_quantity,avg_inventory_quantity,min_inventory_quantity,max_inventory_quantity,row_count', N'dw.fact_inventory_snapshot', N'Precomputed inventory aggregate by Product, Store.'),
    (N'Inventory', N'olap.inventory_cuboid_3d_time_product_store', N'3D', N'timekey, productkey, storekey', N'total_inventory_quantity,avg_inventory_quantity,min_inventory_quantity,max_inventory_quantity,row_count', N'dw.fact_inventory_snapshot', N'Precomputed inventory aggregate by Time, Product, Store.');
GO

DROP TABLE IF EXISTS metadata.olap_ssas_conceptual_metadata;
GO

CREATE TABLE metadata.olap_ssas_conceptual_metadata (
    object_metadata_id INT IDENTITY(1,1) PRIMARY KEY,
    object_type NVARCHAR(100) NOT NULL,
    object_name NVARCHAR(256) NOT NULL,
    source_object NVARCHAR(256) NULL,
    relationship_note NVARCHAR(1000) NULL,
    purpose NVARCHAR(1000) NOT NULL
);
GO

INSERT INTO metadata.olap_ssas_conceptual_metadata
(object_type, object_name, source_object, relationship_note, purpose)
VALUES
    (N'Cube', N'Retail Analytics Cube', NULL, NULL,
     N'Integrated retail analytical space for Sales and Inventory analysis.'),
    (N'Measure Group', N'Sales', N'dw.fact_sale',
     N'Linked to Time, Product, Store, Customer dimensions.',
     N'Sales quantity and amount analysis.'),
    (N'Measure Group', N'Inventory Snapshot', N'dw.fact_inventory_snapshot',
     N'Linked to Time, Product, Store dimensions. No Customer relationship.',
     N'Inventory snapshot analysis by time, product, and store.'),
    (N'Dimension', N'Time', N'dw.dim_time',
     N'Used by both Sales and Inventory.',
     N'Drill down / roll up by Nam -> Quy -> Thang.'),
    (N'Dimension', N'Product', N'dw.dim_product',
     N'Used by both Sales and Inventory.',
     N'Analyze measures by product business code and product attributes.'),
    (N'Dimension', N'Store', N'dw.dim_store',
     N'Used by both Sales and Inventory.',
     N'Drill down / roll up by Bang -> ThanhPho -> MaCuaHang.'),
    (N'Dimension', N'Customer', N'dw.dim_customer',
     N'Used only by Sales; Inventory has no customerkey.',
     N'Analyze customer purchase behavior and customer type.'),
    (N'Hierarchy', N'Time: Nam -> Quy -> Thang', N'dw.dim_time',
     NULL,
     N'Time hierarchy for drill-down and roll-up.'),
    (N'Hierarchy', N'Store: Bang -> ThanhPho -> MaCuaHang', N'dw.dim_store',
     NULL,
     N'Geographic store hierarchy for drill-down and roll-up.'),
    (N'Hierarchy', N'Customer geography/type', N'dw.dim_customer',
     NULL,
     N'Customer geography and subtype filter attributes.');
GO

SELECT * FROM metadata.olap_cuboid_metadata ORDER BY subject_area, dimensionality, cuboid_name;
SELECT * FROM metadata.olap_ssas_conceptual_metadata ORDER BY object_metadata_id;
GO
