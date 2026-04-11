from __future__ import annotations

import argparse
import sys
from typing import Iterable

from db_config import CONNECTION_STRING, MASTER_CONNECTION_STRING, DB_NAME, DB_SCHEMA, SAFE_DATABASE_URL

try:
    import pyodbc
except Exception as exc:  # pragma: no cover
    raise SystemExit(
        "Chua cai thu vien 'pyodbc'. Hay chay: pip install pyodbc"
    ) from exc


DROP_TABLES_SQL = f"""
IF OBJECT_ID('{DB_SCHEMA}.fact_sale', 'U') IS NOT NULL DROP TABLE {DB_SCHEMA}.fact_sale;
IF OBJECT_ID('{DB_SCHEMA}.fact_inventory_snapshot', 'U') IS NOT NULL DROP TABLE {DB_SCHEMA}.fact_inventory_snapshot;
IF OBJECT_ID('{DB_SCHEMA}.dim_customer', 'U') IS NOT NULL DROP TABLE {DB_SCHEMA}.dim_customer;
IF OBJECT_ID('{DB_SCHEMA}.dim_store', 'U') IS NOT NULL DROP TABLE {DB_SCHEMA}.dim_store;
IF OBJECT_ID('{DB_SCHEMA}.dim_product', 'U') IS NOT NULL DROP TABLE {DB_SCHEMA}.dim_product;
IF OBJECT_ID('{DB_SCHEMA}.dim_time', 'U') IS NOT NULL DROP TABLE {DB_SCHEMA}.dim_time;

IF EXISTS (SELECT * FROM sys.schemas WHERE name = '{DB_SCHEMA}')
    DROP SCHEMA {DB_SCHEMA};
"""

CREATE_SCHEMA_SQL = f"CREATE SCHEMA {DB_SCHEMA};"

CREATE_TABLES_SQL = f"""
CREATE TABLE {DB_SCHEMA}.dim_time (
    timekey      INT PRIMARY KEY,
    thang        INT NOT NULL CHECK (thang BETWEEN 1 AND 12),
    quy          INT NOT NULL CHECK (quy BETWEEN 1 AND 4),
    nam          INT NOT NULL,
    CONSTRAINT uq_dim_time_year_month UNIQUE (nam, thang)
);

CREATE TABLE {DB_SCHEMA}.dim_product (
    productkey   INT PRIMARY KEY,
    mamh         NVARCHAR(20) NOT NULL UNIQUE,
    mota         NVARCHAR(255) NOT NULL,
    kichco       NVARCHAR(50),
    trongluong   DECIMAL(10,2)
);

CREATE TABLE {DB_SCHEMA}.dim_customer (
    customerkey   INT PRIMARY KEY,
    makh          NVARCHAR(20) NOT NULL UNIQUE,
    tenkh         NVARCHAR(100) NOT NULL,
    thanhpho      NVARCHAR(100) NOT NULL,
    bang          NVARCHAR(100) NOT NULL,
    iskhdulich    BIT NOT NULL DEFAULT 0,
    iskhbuudien   BIT NOT NULL DEFAULT 0,
    CONSTRAINT ck_customer_subtype CHECK (iskhdulich = 1 OR iskhbuudien = 1)
);

CREATE TABLE {DB_SCHEMA}.dim_store (
    storekey      INT PRIMARY KEY,
    macuahang     NVARCHAR(20) NOT NULL UNIQUE,
    sodienthoai   NVARCHAR(20),
    thanhpho      NVARCHAR(100) NOT NULL,
    bang          NVARCHAR(100) NOT NULL,
    diachivp      NVARCHAR(255)
);

CREATE TABLE {DB_SCHEMA}.fact_sale (
    productkey    INT NOT NULL,
    timekey       INT NOT NULL,
    storekey      INT NOT NULL,
    customerkey   INT NOT NULL,
    soluongban    INT NOT NULL CHECK (soluongban > 0),
    tongtien      DECIMAL(18,2) NOT NULL CHECK (tongtien >= 0),

    CONSTRAINT pk_fact_sale
        PRIMARY KEY (productkey, timekey, storekey, customerkey),

    CONSTRAINT fk_fact_sale_product
        FOREIGN KEY (productkey) REFERENCES {DB_SCHEMA}.dim_product(productkey),
    CONSTRAINT fk_fact_sale_time
        FOREIGN KEY (timekey) REFERENCES {DB_SCHEMA}.dim_time(timekey),
    CONSTRAINT fk_fact_sale_store
        FOREIGN KEY (storekey) REFERENCES {DB_SCHEMA}.dim_store(storekey),
    CONSTRAINT fk_fact_sale_customer
        FOREIGN KEY (customerkey) REFERENCES {DB_SCHEMA}.dim_customer(customerkey)
);

CREATE TABLE {DB_SCHEMA}.fact_inventory_snapshot (
    timekey          INT NOT NULL,
    storekey         INT NOT NULL,
    productkey       INT NOT NULL,
    soluongtonkho    INT NOT NULL CHECK (soluongtonkho >= 0),

    CONSTRAINT pk_fact_inventory_snapshot
        PRIMARY KEY (timekey, storekey, productkey),

    CONSTRAINT fk_inventory_snapshot_time
        FOREIGN KEY (timekey) REFERENCES {DB_SCHEMA}.dim_time(timekey),
    CONSTRAINT fk_inventory_snapshot_store
        FOREIGN KEY (storekey) REFERENCES {DB_SCHEMA}.dim_store(storekey),
    CONSTRAINT fk_inventory_snapshot_product
        FOREIGN KEY (productkey) REFERENCES {DB_SCHEMA}.dim_product(productkey)
);

CREATE INDEX idx_dim_time_year_quarter_month
    ON {DB_SCHEMA}.dim_time(nam, quy, thang);

CREATE INDEX idx_dim_product_mamh
    ON {DB_SCHEMA}.dim_product(mamh);

CREATE INDEX idx_dim_customer_makh
    ON {DB_SCHEMA}.dim_customer(makh);

CREATE INDEX idx_dim_customer_city_region
    ON {DB_SCHEMA}.dim_customer(thanhpho, bang);

CREATE INDEX idx_dim_store_macuahang
    ON {DB_SCHEMA}.dim_store(macuahang);

CREATE INDEX idx_dim_store_city_region
    ON {DB_SCHEMA}.dim_store(thanhpho, bang);

CREATE INDEX idx_fact_sale_timekey
    ON {DB_SCHEMA}.fact_sale(timekey);

CREATE INDEX idx_fact_sale_storekey
    ON {DB_SCHEMA}.fact_sale(storekey);

CREATE INDEX idx_fact_sale_customerkey
    ON {DB_SCHEMA}.fact_sale(customerkey);

CREATE INDEX idx_fact_sale_productkey
    ON {DB_SCHEMA}.fact_sale(productkey);

CREATE INDEX idx_fact_sale_store_product_time
    ON {DB_SCHEMA}.fact_sale(storekey, productkey, timekey);

CREATE INDEX idx_inventory_snapshot_timekey
    ON {DB_SCHEMA}.fact_inventory_snapshot(timekey);

CREATE INDEX idx_inventory_snapshot_storekey
    ON {DB_SCHEMA}.fact_inventory_snapshot(storekey);

CREATE INDEX idx_inventory_snapshot_productkey
    ON {DB_SCHEMA}.fact_inventory_snapshot(productkey);

CREATE INDEX idx_inventory_snapshot_store_product_time
    ON {DB_SCHEMA}.fact_inventory_snapshot(storekey, productkey, timekey);
"""


def ensure_database(conn_str: str, db_name: str) -> None:
    conn = pyodbc.connect(conn_str, autocommit=True)
    cur = conn.cursor()
    cur.execute(
        f"IF DB_ID('{db_name}') IS NULL CREATE DATABASE [{db_name}];"
    )
    cur.close()
    conn.close()
    print(f"[OK] Database '{db_name}' da san sang.")


def run_sql(conn: pyodbc.Connection, sql_text: str, label: str) -> None:
    cur = conn.cursor()
    cur.execute(sql_text)
    cur.close()
    conn.commit()
    print(f"[OK] {label}")


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Tao lai schema SQL Server DW theo kien truc cuoi cung."
    )
    parser.add_argument(
        "--mode",
        choices=["schema", "all"],
        default="schema",
        help="schema/all deu tao lai schema; giu lai de tuong thich lenh cu.",
    )
    return parser.parse_args(list(argv))


def main(argv: Iterable[str]) -> int:
    _args = parse_args(argv)
    print(f"Dang ket noi toi: {SAFE_DATABASE_URL}")

    try:
        ensure_database(MASTER_CONNECTION_STRING, DB_NAME)

        conn = pyodbc.connect(CONNECTION_STRING, autocommit=False)
        run_sql(conn, DROP_TABLES_SQL, "Xoa schema cu")
        run_sql(conn, CREATE_SCHEMA_SQL, "Tao schema moi")
        run_sql(conn, CREATE_TABLES_SQL, "Tao bang va index")
        conn.close()
    except Exception as exc:
        print(f"[ERROR] {exc}")
        return 1

    print("Hoan tat.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))