"""Run all DW test queries and save results to test_dw_results.txt"""
import pyodbc
from db_config import CONNECTION_STRING

conn = pyodbc.connect(CONNECTION_STRING)
out = []


def run(label, sql):
    cur = conn.cursor()
    try:
        cur.execute(sql)
        if cur.description:
            cols = [d[0] for d in cur.description]
            rows = cur.fetchall()
            out.append(f"-- {label}")
            out.append(f"-- Columns: {' | '.join(cols)}")
            out.append(f"-- Rows returned: {len(rows)}")
            for i, r in enumerate(rows):
                if i >= 20:
                    out.append(f"-- ... (truncated, {len(rows)} total)")
                    break
                out.append("-- " + " | ".join(str(x) for x in r))
            out.append("")
        else:
            out.append(f"-- {label}")
            out.append("-- (no result set)")
            out.append("")
    except Exception as e:
        out.append(f"-- {label}")
        out.append(f"-- ERROR: {e}")
        out.append("")
    finally:
        cur.close()


# === SECTION A: DATA QUALITY CHECKS ===
out.append("=" * 80)
out.append("SECTION A: DATA QUALITY CHECKS")
out.append("=" * 80)
out.append("")

run("A1. So dong tung bang", """
SELECT 'dim_time' AS table_name, COUNT(*) AS row_count FROM dw.dim_time
UNION ALL SELECT 'dim_product', COUNT(*) FROM dw.dim_product
UNION ALL SELECT 'dim_customer', COUNT(*) FROM dw.dim_customer
UNION ALL SELECT 'dim_store', COUNT(*) FROM dw.dim_store
UNION ALL SELECT 'fact_sale', COUNT(*) FROM dw.fact_sale
UNION ALL SELECT 'fact_inventory_snapshot', COUNT(*) FROM dw.fact_inventory_snapshot
""")

run("A2. DW co dung 2 nam du lieu", """
SELECT MIN(nam) AS min_nam, MAX(nam) AS max_nam, COUNT(DISTINCT nam) AS so_nam FROM dw.dim_time
""")

run("A3. Kiem tra (nam, thang) trung lap (expect 0 rows)", """
SELECT nam, thang, COUNT(*) AS cnt FROM dw.dim_time GROUP BY nam, thang HAVING COUNT(*) > 1
""")

run("A4. Kiem tra quarter khop month (expect 0 rows)", """
SELECT timekey, thang, quy, ((thang - 1) / 3) + 1 AS expected_quy
FROM dw.dim_time WHERE quy != ((thang - 1) / 3) + 1
""")

run("A5a. Orphan productkey in fact_sale (expect 0)", """
SELECT COUNT(*) AS cnt FROM dw.fact_sale fs LEFT JOIN dw.dim_product dp ON fs.productkey = dp.productkey WHERE dp.productkey IS NULL
""")
run("A5b. Orphan timekey in fact_sale (expect 0)", """
SELECT COUNT(*) AS cnt FROM dw.fact_sale fs LEFT JOIN dw.dim_time dt ON fs.timekey = dt.timekey WHERE dt.timekey IS NULL
""")
run("A5c. Orphan storekey in fact_sale (expect 0)", """
SELECT COUNT(*) AS cnt FROM dw.fact_sale fs LEFT JOIN dw.dim_store ds ON fs.storekey = ds.storekey WHERE ds.storekey IS NULL
""")
run("A5d. Orphan customerkey in fact_sale (expect 0)", """
SELECT COUNT(*) AS cnt FROM dw.fact_sale fs LEFT JOIN dw.dim_customer dc ON fs.customerkey = dc.customerkey WHERE dc.customerkey IS NULL
""")

run("A6a. Orphan timekey in inventory (expect 0)", """
SELECT COUNT(*) AS cnt FROM dw.fact_inventory_snapshot fi LEFT JOIN dw.dim_time dt ON fi.timekey = dt.timekey WHERE dt.timekey IS NULL
""")
run("A6b. Orphan storekey in inventory (expect 0)", """
SELECT COUNT(*) AS cnt FROM dw.fact_inventory_snapshot fi LEFT JOIN dw.dim_store ds ON fi.storekey = ds.storekey WHERE ds.storekey IS NULL
""")
run("A6c. Orphan productkey in inventory (expect 0)", """
SELECT COUNT(*) AS cnt FROM dw.fact_inventory_snapshot fi LEFT JOIN dw.dim_product dp ON fi.productkey = dp.productkey WHERE dp.productkey IS NULL
""")

run("A7a. Duplicate mamh in dim_product (expect 0 rows)", """
SELECT mamh, COUNT(*) AS cnt FROM dw.dim_product GROUP BY mamh HAVING COUNT(*) > 1
""")
run("A7b. Duplicate makh in dim_customer (expect 0 rows)", """
SELECT makh, COUNT(*) AS cnt FROM dw.dim_customer GROUP BY makh HAVING COUNT(*) > 1
""")
run("A7c. Duplicate macuahang in dim_store (expect 0 rows)", """
SELECT macuahang, COUNT(*) AS cnt FROM dw.dim_store GROUP BY macuahang HAVING COUNT(*) > 1
""")

run("A8. KH khong thuoc loai nao (expect 0)", """
SELECT COUNT(*) AS cnt FROM dw.dim_customer WHERE iskhdulich = 0 AND iskhbuudien = 0
""")

run("A9. Thong ke 3 loai KH", """
SELECT
    CASE WHEN iskhdulich = 1 AND iskhbuudien = 0 THEN N'Du lich'
         WHEN iskhdulich = 0 AND iskhbuudien = 1 THEN N'Buu dien'
         WHEN iskhdulich = 1 AND iskhbuudien = 1 THEN N'Ca hai'
         ELSE N'Khong xac dinh'
    END AS loai_kh, COUNT(*) AS so_luong
FROM dw.dim_customer
GROUP BY CASE WHEN iskhdulich = 1 AND iskhbuudien = 0 THEN N'Du lich'
              WHEN iskhdulich = 0 AND iskhbuudien = 1 THEN N'Buu dien'
              WHEN iskhdulich = 1 AND iskhbuudien = 1 THEN N'Ca hai'
              ELSE N'Khong xac dinh' END
""")

run("A10. SDT sai dinh dang (expect 0 rows)", """
SELECT storekey, macuahang, sodienthoai FROM dw.dim_store
WHERE sodienthoai NOT LIKE '+84%' OR LEN(sodienthoai) NOT BETWEEN 12 AND 14
""")

run("A11a. fact_sale: SL/tien khong hop le (expect 0)", """
SELECT COUNT(*) AS cnt FROM dw.fact_sale WHERE soluongban <= 0 OR tongtien < 0
""")
run("A11b. inventory: ton kho am (expect 0)", """
SELECT COUNT(*) AS cnt FROM dw.fact_inventory_snapshot WHERE soluongtonkho < 0
""")

run("A12. Don gia ban suy ra tu fact_sale phai duong (expect 0)", """
SELECT COUNT(*) AS cnt
FROM dw.fact_sale
WHERE CAST(tongtien AS DECIMAL(18,4)) / NULLIF(soluongban, 0) <= 0
""")

run("A13. Cap (store,product) thieu snapshot (expect 0 rows)", """
SELECT storekey, productkey, COUNT(DISTINCT timekey) AS so_thang
FROM dw.fact_inventory_snapshot GROUP BY storekey, productkey
HAVING COUNT(DISTINCT timekey) != 24
""")

run("A14a. dim_customer: city/bang null/rong (expect 0)", """
SELECT COUNT(*) AS cnt FROM dw.dim_customer
WHERE thanhpho IS NULL OR thanhpho = '' OR bang IS NULL OR bang = ''
""")
run("A14b. dim_store: city/bang null/rong (expect 0)", """
SELECT COUNT(*) AS cnt FROM dw.dim_store
WHERE thanhpho IS NULL OR thanhpho = '' OR bang IS NULL OR bang = ''
""")

# === SECTION B: BUSINESS REQUIREMENT QUERIES ===
out.append("=" * 80)
out.append("SECTION B: BUSINESS REQUIREMENT QUERIES")
out.append("=" * 80)
out.append("")

run("Req1. Cua hang + mat hang da ban + don gia ban binh quan (TOP 15)", """
SELECT TOP 15
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
JOIN dw.dim_store ds ON fs.storekey = ds.storekey
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
ORDER BY ds.macuahang, dp.mamh
""")

run("Req3. Cua hang ban mat hang dat boi KH00001 (TOP 15)", """
SELECT DISTINCT TOP 15 ds.macuahang, ds.thanhpho, ds.sodienthoai
FROM dw.fact_inventory_snapshot fi
JOIN dw.dim_store ds ON fi.storekey = ds.storekey
WHERE fi.timekey = (SELECT MAX(timekey) FROM dw.dim_time)
  AND fi.productkey IN (
      SELECT DISTINCT fs.productkey FROM dw.fact_sale fs
      JOIN dw.dim_customer dc ON fs.customerkey = dc.customerkey
      WHERE dc.makh = 'KH00001')
ORDER BY ds.macuahang
""")

run("Req4. VP dai dien luu kho MH0001 > 100 (ky 202512, TOP 15)", """
SELECT TOP 15 ds.macuahang, ds.diachivp, ds.thanhpho, ds.bang, fi.soluongtonkho
FROM dw.fact_inventory_snapshot fi
JOIN dw.dim_store ds ON fi.storekey = ds.storekey
JOIN dw.dim_product dp ON fi.productkey = dp.productkey
WHERE dp.mamh = 'MH0001' AND fi.timekey = 202512 AND fi.soluongtonkho >= 100
ORDER BY fi.soluongtonkho DESC
""")

run("Req6. Thanh pho/bang cua KH00001", """
SELECT makh, tenkh, thanhpho, bang FROM dw.dim_customer WHERE makh = 'KH00001'
""")

run("Req7a. Ton kho MH0010 tai Ha Noi (thang 202512)", """
SELECT ds.macuahang, ds.thanhpho, ds.sodienthoai, dp.mamh, dp.mota, fi.soluongtonkho
FROM dw.fact_inventory_snapshot fi
JOIN dw.dim_store ds ON fi.storekey = ds.storekey
JOIN dw.dim_product dp ON fi.productkey = dp.productkey
WHERE dp.mamh = 'MH0010' AND ds.thanhpho = N'H\u00e0 N\u1ed9i' AND fi.timekey = 202512
ORDER BY ds.macuahang
""")

run("Req7b. AVG ton kho MH0010 tai Ha Noi (2024-2025)", """
SELECT ds.macuahang, ds.thanhpho, dp.mamh, dp.mota,
    AVG(CAST(fi.soluongtonkho AS DECIMAL(18,2))) AS avg_ton_kho,
    MIN(fi.soluongtonkho) AS min_ton_kho,
    MAX(fi.soluongtonkho) AS max_ton_kho,
    COUNT(*) AS so_ky
FROM dw.fact_inventory_snapshot fi
JOIN dw.dim_store ds ON fi.storekey = ds.storekey
JOIN dw.dim_product dp ON fi.productkey = dp.productkey
WHERE dp.mamh = 'MH0010' AND ds.thanhpho = N'H\u00e0 N\u1ed9i'
  AND fi.timekey >= 202401 AND fi.timekey <= 202512
GROUP BY ds.macuahang, ds.thanhpho, dp.mamh, dp.mota
ORDER BY ds.macuahang
""")

run("Req9a. KH Du lich (TOP 10)", """
SELECT TOP 10 makh, tenkh, thanhpho, bang FROM dw.dim_customer
WHERE iskhdulich = 1 AND iskhbuudien = 0 ORDER BY makh
""")
run("Req9b. KH Buu dien (TOP 10)", """
SELECT TOP 10 makh, tenkh, thanhpho, bang FROM dw.dim_customer
WHERE iskhdulich = 0 AND iskhbuudien = 1 ORDER BY makh
""")
run("Req9c. KH Ca hai (TOP 10)", """
SELECT TOP 10 makh, tenkh, thanhpho, bang FROM dw.dim_customer
WHERE iskhdulich = 1 AND iskhbuudien = 1 ORDER BY makh
""")

conn.close()

result = "\n".join(out)
with open("test_dw_results.txt", "w", encoding="utf-8") as f:
    f.write(result)
print(result)
