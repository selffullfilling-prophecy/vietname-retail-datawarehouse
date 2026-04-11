from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os
import sys
from typing import List, Sequence

from dotenv import load_dotenv
import pyodbc

from db_config import DB_NAME, DB_HOST, DB_PORT


REPORT_PATH = Path("test_dw_business_report.txt")

load_dotenv(override=True)


@dataclass(frozen=True)
class QueryCase:
    code: str
    title: str
    sql: str
    status: str
    note: str = ""
    max_rows: int = 20


def format_table(columns: Sequence[str], rows: Sequence[Sequence[object]]) -> str:
    if not columns:
        return "(no columns)"

    str_rows = [[("" if value is None else str(value)) for value in row] for row in rows]
    widths = [len(col) for col in columns]
    for row in str_rows:
        for idx, value in enumerate(row):
            widths[idx] = max(widths[idx], len(value))

    def render_row(values: Sequence[str]) -> str:
        return " | ".join(value.ljust(widths[idx]) for idx, value in enumerate(values))

    header = render_row(columns)
    divider = "-+-".join("-" * width for width in widths)
    body = "\n".join(render_row(row) for row in str_rows) if str_rows else "(0 rows)"
    return f"{header}\n{divider}\n{body}"


def _db_password() -> str:
    password = os.getenv("SA_PASSWORD") or os.getenv("MSSQL_SA_PASSWORD")
    if not password:
        raise RuntimeError("Khong tim thay SA_PASSWORD hoac MSSQL_SA_PASSWORD trong moi truong/.env.")
    return password


def build_connection_string() -> str:
    return (
        "DRIVER={ODBC Driver 18 for SQL Server};"
        f"SERVER={DB_HOST},{DB_PORT};"
        f"DATABASE={DB_NAME};"
        "UID=sa;"
        f"PWD={_db_password()};"
        "Encrypt=no;"
        "TrustServerCertificate=yes;"
    )


def run_query(cur: pyodbc.Cursor, sql: str) -> tuple[list[str], list[tuple]]:
    cur.execute(sql)
    columns = [desc[0] for desc in cur.description] if cur.description else []
    rows = cur.fetchall() if cur.description else []
    return columns, rows


def get_scalar(cur: pyodbc.Cursor, sql: str) -> object:
    columns, rows = run_query(cur, sql)
    if not columns or not rows:
        return None
    return rows[0][0]


def build_cases(sample_city: str, max_timekey: int) -> List[QueryCase]:
    latest_year = max_timekey // 100
    latest_month = max_timekey % 100
    return [
        QueryCase(
            code="Q0",
            title="Chat luong du lieu tong quan",
            status="PASS",
            sql="""
SELECT 'dim_time' AS table_name, COUNT(*) AS row_count FROM dw.dim_time
UNION ALL SELECT 'dim_product', COUNT(*) FROM dw.dim_product
UNION ALL SELECT 'dim_customer', COUNT(*) FROM dw.dim_customer
UNION ALL SELECT 'dim_store', COUNT(*) FROM dw.dim_store
UNION ALL SELECT 'fact_sale', COUNT(*) FROM dw.fact_sale
UNION ALL SELECT 'fact_inventory_snapshot', COUNT(*) FROM dw.fact_inventory_snapshot
ORDER BY table_name;
""",
        ),
        QueryCase(
            code="Q0b",
            title="Kiem tra dim_product khong con cot gia",
            status="PASS",
            sql="""
SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dw'
  AND TABLE_NAME = 'dim_product'
ORDER BY ORDINAL_POSITION;
""",
        ),
        QueryCase(
            code="Q1",
            title="YC1. Cua hang + thong tin mat hang da ban + don gia suy ra",
            status="PASS",
            sql="""
SELECT TOP 20
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
    ds.macuahang, ds.thanhpho, ds.bang, ds.sodienthoai,
    dp.mamh, dp.mota, dp.kichco, dp.trongluong
ORDER BY ds.macuahang, dp.mamh;
""",
        ),
        QueryCase(
            code="Q2",
            title="YC2. Don dat hang theo khach hang va ngay dat",
            status="PARTIAL",
            note="Schema hien tai khong co order_id hoac ngay_dat_hang cap don. Query duoi day chi mo phong theo grain fact_sale (khach hang, thang, cua hang, mat hang).",
            sql="""
SELECT TOP 20
    dc.makh,
    dc.tenkh,
    dt.timekey AS ky_thang,
    dt.nam,
    dt.thang,
    ds.macuahang,
    dp.mamh,
    fs.soluongban,
    fs.tongtien
FROM dw.fact_sale fs
JOIN dw.dim_customer dc ON fs.customerkey = dc.customerkey
JOIN dw.dim_time dt ON fs.timekey = dt.timekey
JOIN dw.dim_store ds ON fs.storekey = ds.storekey
JOIN dw.dim_product dp ON fs.productkey = dp.productkey
ORDER BY dc.makh, dt.timekey, ds.macuahang, dp.mamh;
""",
        ),
        QueryCase(
            code="Q3",
            title="YC3. Cua hang co ban cac mat hang duoc KH00001 da mua",
            status="PASS",
            sql=f"""
SELECT DISTINCT TOP 20
    ds.macuahang,
    ds.thanhpho,
    ds.sodienthoai
FROM dw.fact_inventory_snapshot fi
JOIN dw.dim_store ds ON fi.storekey = ds.storekey
WHERE fi.timekey = {max_timekey}
  AND fi.productkey IN (
      SELECT DISTINCT fs.productkey
      FROM dw.fact_sale fs
      JOIN dw.dim_customer dc ON fs.customerkey = dc.customerkey
      WHERE dc.makh = 'KH00001'
  )
ORDER BY ds.macuahang;
""",
        ),
        QueryCase(
            code="Q4",
            title=f"YC4. Cua hang ton kho MH0001 > 100 tai ky {max_timekey}",
            status="PASS",
            sql=f"""
SELECT TOP 20
    ds.macuahang,
    ds.diachivp,
    ds.thanhpho,
    ds.bang,
    fi.soluongtonkho
FROM dw.fact_inventory_snapshot fi
JOIN dw.dim_store ds ON fi.storekey = ds.storekey
JOIN dw.dim_product dp ON fi.productkey = dp.productkey
WHERE dp.mamh = 'MH0001'
  AND fi.timekey = {max_timekey}
  AND fi.soluongtonkho >= 100
ORDER BY fi.soluongtonkho DESC, ds.macuahang;
""",
        ),
        QueryCase(
            code="Q5",
            title="YC5. Mat hang khach da mua va cac cua hang co ban mat hang do",
            status="PARTIAL",
            note="Schema khong co bang don dat hang rieng. Query duoi day tra ve cac dong fact_sale va danh sach cua hang dang co ton mat hang tuong ung o ky moi nhat.",
            sql=f"""
SELECT TOP 20
    dc.makh,
    dc.tenkh,
    dp.mamh,
    dp.mota,
    fs.soluongban,
    src_store.macuahang AS cua_hang_khach_mua,
    dst_store.macuahang AS cua_hang_con_ban,
    dst_store.thanhpho
FROM dw.fact_sale fs
JOIN dw.dim_customer dc ON fs.customerkey = dc.customerkey
JOIN dw.dim_product dp ON fs.productkey = dp.productkey
JOIN dw.dim_store src_store ON fs.storekey = src_store.storekey
JOIN dw.fact_inventory_snapshot fi ON fi.productkey = fs.productkey AND fi.timekey = {max_timekey} AND fi.soluongtonkho > 0
JOIN dw.dim_store dst_store ON fi.storekey = dst_store.storekey
ORDER BY dc.makh, dp.mamh, dst_store.macuahang;
""",
        ),
        QueryCase(
            code="Q6",
            title="YC6. Thanh pho va bang cua KH00001",
            status="PASS",
            sql="""
SELECT makh, tenkh, thanhpho, bang
FROM dw.dim_customer
WHERE makh = 'KH00001';
""",
            max_rows=5,
        ),
        QueryCase(
            code="Q7",
            title=f"YC7. Ton kho MH0010 tai cac cua hang o thanh pho {sample_city} ky {latest_year:04d}-{latest_month:02d}",
            status="PASS",
            sql=f"""
SELECT
    ds.macuahang,
    ds.thanhpho,
    ds.sodienthoai,
    dp.mamh,
    dp.mota,
    fi.soluongtonkho
FROM dw.fact_inventory_snapshot fi
JOIN dw.dim_store ds ON fi.storekey = ds.storekey
JOIN dw.dim_product dp ON fi.productkey = dp.productkey
WHERE dp.mamh = 'MH0010'
  AND ds.thanhpho = N'{sample_city.replace("'", "''")}'
  AND fi.timekey = {max_timekey}
ORDER BY ds.macuahang;
""",
        ),
        QueryCase(
            code="Q8",
            title="YC8. Mat hang, so luong, khach hang, cua hang, thanh pho cua mot dong ban hang",
            status="PARTIAL",
            note="Schema hien tai chi co dong fact_sale, khong co order_id. Vi vay query nay kiem tra o muc dong ban hang thay vi muc don dat hang.",
            sql="""
SELECT TOP 20
    dp.mamh,
    dp.mota,
    fs.soluongban,
    dc.makh,
    dc.tenkh,
    ds.macuahang,
    ds.thanhpho
FROM dw.fact_sale fs
JOIN dw.dim_product dp ON fs.productkey = dp.productkey
JOIN dw.dim_customer dc ON fs.customerkey = dc.customerkey
JOIN dw.dim_store ds ON fs.storekey = ds.storekey
ORDER BY dc.makh, ds.macuahang, dp.mamh;
""",
        ),
        QueryCase(
            code="Q9a",
            title="YC9a. Khach hang du lich",
            status="PASS",
            sql="""
SELECT TOP 20 makh, tenkh, thanhpho, bang
FROM dw.dim_customer
WHERE iskhdulich = 1 AND iskhbuudien = 0
ORDER BY makh;
""",
        ),
        QueryCase(
            code="Q9b",
            title="YC9b. Khach hang buu dien",
            status="PASS",
            sql="""
SELECT TOP 20 makh, tenkh, thanhpho, bang
FROM dw.dim_customer
WHERE iskhdulich = 0 AND iskhbuudien = 1
ORDER BY makh;
""",
        ),
        QueryCase(
            code="Q9c",
            title="YC9c. Khach hang ca hai",
            status="PASS",
            sql="""
SELECT TOP 20 makh, tenkh, thanhpho, bang
FROM dw.dim_customer
WHERE iskhdulich = 1 AND iskhbuudien = 1
ORDER BY makh;
""",
        ),
    ]


def run_case(cur: pyodbc.Cursor, case: QueryCase) -> str:
    columns, rows = run_query(cur, case.sql)
    shown_rows = rows[: case.max_rows]
    parts = [f"[{case.status}] {case.code} - {case.title}"]
    if case.note:
        parts.append(f"Note: {case.note}")
    parts.append(f"Rows returned: {len(rows)}")
    parts.append(format_table(columns, shown_rows))
    if len(rows) > case.max_rows:
        parts.append(f"... truncated, showing {case.max_rows}/{len(rows)} rows")
    return "\n".join(parts)


def main() -> None:
    out: List[str] = []
    conn = pyodbc.connect(build_connection_string())
    try:
        cur = conn.cursor()
        sample_city = get_scalar(cur, "SELECT TOP 1 thanhpho AS sample_city FROM dw.dim_store ORDER BY thanhpho")
        max_timekey = int(get_scalar(cur, "SELECT MAX(timekey) AS max_timekey FROM dw.dim_time"))
        min_year = get_scalar(cur, "SELECT MIN(nam) AS min_year FROM dw.dim_time")
        max_year = get_scalar(cur, "SELECT MAX(nam) AS max_year FROM dw.dim_time")
        distinct_years = get_scalar(cur, "SELECT COUNT(DISTINCT nam) AS distinct_years FROM dw.dim_time")

        out.append("DW BUSINESS TEST REPORT")
        out.append("=" * 80)
        out.append(f"Data span: {min_year} -> {max_year} ({distinct_years} nam)")
        out.append(f"Latest timekey: {max_timekey}")
        out.append(f"Sample city for YC7: {sample_city}")
        out.append("")

        unsupported = [
            "YC2, YC5, YC8 khong the kiem tra chinh xac 100% theo nghiep vu don dat hang vi schema hien tai khong co order_id, order_date, va order line rieng.",
            "Cac query PARTIAL duoi day la best-effort tren grain hien co cua fact_sale.",
        ]
        out.append("Schema note")
        out.append("-" * 80)
        out.extend(unsupported)
        out.append("")

        for case in build_cases(str(sample_city), max_timekey):
            out.append(run_case(cur, case))
            out.append("")
        cur.close()
    finally:
        conn.close()

    report = "\n".join(out)
    REPORT_PATH.write_text(report, encoding="utf-8")
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    sys.stdout.write(report)
    sys.stdout.write("\n\n")
    sys.stdout.write(f"Saved report to: {REPORT_PATH}\n")


if __name__ == "__main__":
    main()
