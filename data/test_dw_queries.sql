-- ============================================================================
-- test_dw_queries.sql
-- Tap hop cac truy van kiem tra chat luong du lieu va yeu cau nghiep vu
-- cho kho du lieu DW (SQL Server, schema: dw)
-- ============================================================================

-- ############################################################################
-- SECTION A: DATA QUALITY CHECKS
-- ############################################################################
-- dùng lệnh sqlcmd -S localhost,1433 -U sa -P "MAT_KHAU_SA_CUA_BAN" -C -d datawarehouse -i data\test_dw_queries.sql -o data\test_dw_results.txt
-- để chạy file, nhớ thay mật khẩu
-- ----------------------------------------------------------------------------
-- A1. Row count per table
-- ----------------------------------------------------------------------------
SELECT 'dim_time' AS table_name, COUNT(*) AS row_count FROM dw.dim_time
UNION ALL
SELECT 'dim_product',COUNT(*) FROM dw.dim_product
UNION ALL
SELECT 'dim_customer',             COUNT(*) FROM dw.dim_customer
UNION ALL
SELECT 'dim_store',                COUNT(*) FROM dw.dim_store
UNION ALL
SELECT 'fact_sale',                COUNT(*) FROM dw.fact_sale
UNION ALL
SELECT 'fact_inventory_snapshot',  COUNT(*) FROM dw.fact_inventory_snapshot;
GO

-- ----------------------------------------------------------------------------
-- A2. Check DW has exactly 4 years of data
-- Expected after running seed_dw_2022_2025.py:
-- MIN(nam) = 2022, MAX(nam) = 2025, COUNT(DISTINCT nam) = 4
-- ----------------------------------------------------------------------------
SELECT
    MIN(nam)            AS min_nam,
    MAX(nam)            AS max_nam,
    COUNT(DISTINCT nam) AS so_nam
FROM dw.dim_time;
GO

-- ----------------------------------------------------------------------------
-- A3. Check each (nam, thang) has exactly 1 row - find duplicates
-- Expected: 0 rows (no duplicates)
-- ----------------------------------------------------------------------------
SELECT nam, thang, COUNT(*) AS cnt
FROM dw.dim_time
GROUP BY nam, thang
HAVING COUNT(*) > 1;
GO

-- ----------------------------------------------------------------------------
-- A4. Check quarter matches month correctly - find mismatches
-- Expected: 0 rows
-- ----------------------------------------------------------------------------
SELECT timekey, thang, quy,
       ((thang - 1) / 3) + 1 AS expected_quy
FROM dw.dim_time
WHERE quy != ((thang - 1) / 3) + 1;
GO

-- ----------------------------------------------------------------------------
-- A5. Check orphan FK in fact_sale
-- Expected: 0 rows per query (no orphan foreign keys)
-- ----------------------------------------------------------------------------

-- Orphan productkey
SELECT fs.*
FROM dw.fact_sale fs
LEFT JOIN dw.dim_product dp ON fs.productkey = dp.productkey
WHERE dp.productkey IS NULL;

-- Orphan timekey
SELECT fs.*
FROM dw.fact_sale fs
LEFT JOIN dw.dim_time dt ON fs.timekey = dt.timekey
WHERE dt.timekey IS NULL;

-- Orphan storekey
SELECT fs.*
FROM dw.fact_sale fs
LEFT JOIN dw.dim_store ds ON fs.storekey = ds.storekey
WHERE ds.storekey IS NULL;

-- Orphan customerkey
SELECT fs.*
FROM dw.fact_sale fs
LEFT JOIN dw.dim_customer dc ON fs.customerkey = dc.customerkey
WHERE dc.customerkey IS NULL;
GO

-- ----------------------------------------------------------------------------
-- A6. Check orphan FK in fact_inventory_snapshot
-- Expected: 0 rows per query
-- ----------------------------------------------------------------------------

-- Orphan timekey
SELECT fi.*
FROM dw.fact_inventory_snapshot fi
LEFT JOIN dw.dim_time dt ON fi.timekey = dt.timekey
WHERE dt.timekey IS NULL;

-- Orphan storekey
SELECT fi.*
FROM dw.fact_inventory_snapshot fi
LEFT JOIN dw.dim_store ds ON fi.storekey = ds.storekey
WHERE ds.storekey IS NULL;

-- Orphan productkey
SELECT fi.*
FROM dw.fact_inventory_snapshot fi
LEFT JOIN dw.dim_product dp ON fi.productkey = dp.productkey
WHERE dp.productkey IS NULL;
GO

-- ----------------------------------------------------------------------------
-- A7. Check business codes are unique (no duplicates)
-- Expected: 0 rows per query
-- ----------------------------------------------------------------------------

-- Duplicate mamh in dim_product
SELECT mamh, COUNT(*) AS cnt
FROM dw.dim_product
GROUP BY mamh
HAVING COUNT(*) > 1;

-- Duplicate makh in dim_customer
SELECT makh, COUNT(*) AS cnt
FROM dw.dim_customer
GROUP BY makh
HAVING COUNT(*) > 1;

-- Duplicate macuahang in dim_store
SELECT macuahang, COUNT(*) AS cnt
FROM dw.dim_store
GROUP BY macuahang
HAVING COUNT(*) > 1;
GO

-- ----------------------------------------------------------------------------
-- A8. Check every customer belongs to at least 1 type
-- Expected: 0 rows (no customer without any type)
-- ----------------------------------------------------------------------------
SELECT customerkey, makh, tenkh, iskhdulich, iskhbuudien
FROM dw.dim_customer
WHERE iskhdulich = 0 AND iskhbuudien = 0;
GO

-- ----------------------------------------------------------------------------
-- A9. Stats for 3 customer types
-- ----------------------------------------------------------------------------
SELECT
    CASE
        WHEN iskhdulich = 1 AND iskhbuudien = 0 THEN N'Du lich'
        WHEN iskhdulich = 0 AND iskhbuudien = 1 THEN N'Buu dien'
        WHEN iskhdulich = 1 AND iskhbuudien = 1 THEN N'Ca hai'
        ELSE N'Khong xac dinh'
    END AS loai_khach_hang,
    COUNT(*) AS so_luong
FROM dw.dim_customer
GROUP BY
    CASE
        WHEN iskhdulich = 1 AND iskhbuudien = 0 THEN N'Du lich'
        WHEN iskhdulich = 0 AND iskhbuudien = 1 THEN N'Buu dien'
        WHEN iskhdulich = 1 AND iskhbuudien = 1 THEN N'Ca hai'
        ELSE N'Khong xac dinh'
    END;
GO

-- ----------------------------------------------------------------------------
-- A10. Check phone format +84xxxxxxxxx (13 characters total)
-- Expected: 0 rows
-- ----------------------------------------------------------------------------
SELECT storekey, macuahang, sodienthoai
FROM dw.dim_store
WHERE sodienthoai NOT LIKE '+84%'
   OR LEN(sodienthoai) NOT BETWEEN 12 AND 14;
GO

-- ----------------------------------------------------------------------------
-- A11. Check quantity/amount not negative
-- Expected: 0 rows per query
-- ----------------------------------------------------------------------------

-- fact_sale: soluongban must be > 0, tongtien must be >= 0
SELECT *
FROM dw.fact_sale
WHERE soluongban <= 0 OR tongtien < 0;

-- fact_inventory_snapshot: soluongtonkho must be >= 0
SELECT *
FROM dw.fact_inventory_snapshot
WHERE soluongtonkho < 0;
GO

-- ----------------------------------------------------------------------------
-- A12. Check derived unit sale price is positive
-- Expected: 0 rows
-- ----------------------------------------------------------------------------
SELECT
    productkey,
    timekey,
    storekey,
    customerkey,
    soluongban,
    tongtien,
    CAST(tongtien AS DECIMAL(18,4)) / NULLIF(soluongban, 0) AS don_gia_suy_ra
FROM dw.fact_sale
WHERE CAST(tongtien AS DECIMAL(18,4)) / NULLIF(soluongban, 0) <= 0;
GO

-- ----------------------------------------------------------------------------
-- A13. Check each active (store, product) pair in inventory has contiguous monthly snapshots
-- Expected: 0 rows.
-- Some products exist only in 2022-2023, while shared products may exist through 2025.
-- Therefore the expected snapshot count depends on the active period of each pair.
-- ----------------------------------------------------------------------------
WITH inventory_span AS (
    SELECT
        fi.storekey,
        fi.productkey,
        MIN(DATEFROMPARTS(fi.timekey / 100, fi.timekey % 100, 1)) AS first_month,
        MAX(DATEFROMPARTS(fi.timekey / 100, fi.timekey % 100, 1)) AS last_month,
        COUNT(DISTINCT fi.timekey) AS so_thang
    FROM dw.fact_inventory_snapshot fi
    GROUP BY fi.storekey, fi.productkey
)
SELECT
    storekey,
    productkey,
    first_month,
    last_month,
    so_thang,
    DATEDIFF(MONTH, first_month, last_month) + 1 AS expected_so_thang
FROM inventory_span
WHERE so_thang != DATEDIFF(MONTH, first_month, last_month) + 1;
GO

-- ----------------------------------------------------------------------------
-- A14. Check city/bang not null or empty in dim_customer and dim_store
-- Expected: 0 rows per query
-- ----------------------------------------------------------------------------

-- dim_customer
SELECT customerkey, makh, thanhpho, bang
FROM dw.dim_customer
WHERE thanhpho IS NULL OR thanhpho = ''
   OR bang IS NULL OR bang = '';

-- dim_store
SELECT storekey, macuahang, thanhpho, bang
FROM dw.dim_store
WHERE thanhpho IS NULL OR thanhpho = ''
   OR bang IS NULL OR bang = '';
GO


-- ############################################################################
-- SECTION B: BUSINESS REQUIREMENT QUERIES
-- ############################################################################

-- ----------------------------------------------------------------------------
-- Requirement 1: Find all stores with city, bang, phone, and description,
--                size, weight, and average sale unit price of products sold there.
-- ----------------------------------------------------------------------------
SELECT
    ds.macuahang,
    ds.thanhpho,
    ds.bang,
    ds.sodienthoai,
    dp.mamh,
    dp.mota,
    dp.kichco,
    dp.trongluong,
    CAST(AVG(CAST(fs.tongtien AS DECIMAL(18,2)) / NULLIF(fs.soluongban, 0)) AS DECIMAL(18,2)) AS don_gia_binh_quan
FROM dw.fact_sale fs
JOIN dw.dim_store   ds ON fs.storekey   = ds.storekey
JOIN dw.dim_product dp ON fs.productkey = dp.productkey
GROUP BY
    ds.macuahang,
    ds.thanhpho,
    ds.bang,
    ds.sodienthoai,
    dp.mamh,
    dp.mota,
    dp.kichco,
    dp.trongluong
ORDER BY ds.macuahang, dp.mamh;
GO

-- ----------------------------------------------------------------------------
-- Requirement 3: Find all stores (city, phone) that sell products ordered
--                by a specific customer.
--                Step 1: Find products the customer bought (via fact_sale).
--                Step 2: Find stores stocking those products (via latest
--                        inventory snapshot).
-- ----------------------------------------------------------------------------
DECLARE @MaKH NVARCHAR(20) = 'KH00001';

-- Tim cac san pham ma khach hang da mua
-- Roi tim cac cua hang con ton kho san pham do (ky snapshot moi nhat)
SELECT DISTINCT
    ds.macuahang,
    ds.thanhpho,
    ds.sodienthoai
FROM dw.fact_inventory_snapshot fi
JOIN dw.dim_store ds ON fi.storekey = ds.storekey
WHERE fi.timekey = (SELECT MAX(timekey) FROM dw.dim_time)
  AND fi.productkey IN (
      SELECT DISTINCT fs.productkey
      FROM dw.fact_sale fs
      JOIN dw.dim_customer dc ON fs.customerkey = dc.customerkey
      WHERE dc.makh = @MaKH
  )
ORDER BY ds.macuahang;
GO

-- ----------------------------------------------------------------------------
-- Requirement 4: Find VP address, city, bang of stores stocking a specific
--                product above a quantity threshold at a given snapshot period.
-- ----------------------------------------------------------------------------
DECLARE @MaMH         NVARCHAR(20) = 'MH0001';
DECLARE @NguongTonKho INT          = 100;
DECLARE @KySnapshot   INT          = 202512;

SELECT
    ds.macuahang,
    ds.diachivp,
    ds.thanhpho,
    ds.bang,
    fi.soluongtonkho
FROM dw.fact_inventory_snapshot fi
JOIN dw.dim_store   ds ON fi.storekey   = ds.storekey
JOIN dw.dim_product dp ON fi.productkey = dp.productkey
WHERE dp.mamh       = @MaMH
  AND fi.timekey    = @KySnapshot
  AND fi.soluongtonkho >= @NguongTonKho
ORDER BY fi.soluongtonkho DESC;
GO

-- ----------------------------------------------------------------------------
-- Requirement 6: Find city and bang of a specific customer.
-- ----------------------------------------------------------------------------
DECLARE @MaKH NVARCHAR(20) = 'KH00001';

SELECT
    makh,
    tenkh,
    thanhpho,
    bang
FROM dw.dim_customer
WHERE makh = @MaKH;
GO

-- ----------------------------------------------------------------------------
-- Requirement 7a: Inventory snapshot at a specific month - find stock of a
--                 specific product at all stores in a specific city.
-- ----------------------------------------------------------------------------
DECLARE @MaMH       NVARCHAR(20)  = 'MH0010';
DECLARE @ThanhPho   NVARCHAR(100) = N'Hà Nội';
DECLARE @KySnapshot INT           = 202512;

SELECT
    ds.macuahang,
    ds.thanhpho,
    ds.sodienthoai,
    dp.mamh,
    dp.mota,
    fi.soluongtonkho
FROM dw.fact_inventory_snapshot fi
JOIN dw.dim_store   ds ON fi.storekey   = ds.storekey
JOIN dw.dim_product dp ON fi.productkey = dp.productkey
WHERE dp.mamh     = @MaMH
  AND ds.thanhpho = @ThanhPho
  AND fi.timekey  = @KySnapshot
ORDER BY ds.macuahang;
GO

-- ----------------------------------------------------------------------------
-- Requirement 7b: AVG inventory over a time range for a specific product
--                 at stores in a specific city.
-- ----------------------------------------------------------------------------
DECLARE @MaMH     NVARCHAR(20)  = 'MH0010';
DECLARE @ThanhPho NVARCHAR(100) = N'Hà Nội';
DECLARE @TuThang  INT           = 202201;
DECLARE @DenThang INT           = 202512;

SELECT
    ds.macuahang,
    ds.thanhpho,
    dp.mamh,
    dp.mota,
    AVG(CAST(fi.soluongtonkho AS DECIMAL(18,2))) AS avg_ton_kho,
    MIN(fi.soluongtonkho)                        AS min_ton_kho,
    MAX(fi.soluongtonkho)                        AS max_ton_kho,
    COUNT(*)                                      AS so_ky_snapshot
FROM dw.fact_inventory_snapshot fi
JOIN dw.dim_store   ds ON fi.storekey   = ds.storekey
JOIN dw.dim_product dp ON fi.productkey = dp.productkey
WHERE dp.mamh     = @MaMH
  AND ds.thanhpho = @ThanhPho
  AND fi.timekey  >= @TuThang
  AND fi.timekey  <= @DenThang
GROUP BY ds.macuahang, ds.thanhpho, dp.mamh, dp.mota
ORDER BY ds.macuahang;
GO

-- ----------------------------------------------------------------------------
-- Requirement 9: List customers by type
-- ----------------------------------------------------------------------------

-- 9a. Khach hang du lich only (iskhdulich = 1 AND iskhbuudien = 0)
SELECT TOP 20
    makh,
    tenkh,
    thanhpho,
    bang
FROM dw.dim_customer
WHERE iskhdulich = 1 AND iskhbuudien = 0
ORDER BY makh;

-- 9b. Khach hang buu dien only (iskhdulich = 0 AND iskhbuudien = 1)
SELECT TOP 20
    makh,
    tenkh,
    thanhpho,
    bang
FROM dw.dim_customer
WHERE iskhdulich = 0 AND iskhbuudien = 1
ORDER BY makh;

-- 9c. Khach hang ca hai (iskhdulich = 1 AND iskhbuudien = 1)
SELECT TOP 20
    makh,
    tenkh,
    thanhpho,
    bang
FROM dw.dim_customer
WHERE iskhdulich = 1 AND iskhbuudien = 1
ORDER BY makh;
GO
