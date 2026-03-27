from __future__ import annotations

import argparse
import os
import sys
from typing import Iterable
from db_config import DATABASE_URL, SAFE_DATABASE_URL
from dotenv import load_dotenv
load_dotenv()
try:
    import psycopg
except Exception as exc:  # pragma: no cover
    raise SystemExit(
        "Chua cai thu vien 'psycopg'. Hay chay: pip install psycopg[binary]"
    ) from exc


CREATE_SQL = r"""
CREATE SCHEMA IF NOT EXISTS dw;

CREATE TABLE IF NOT EXISTS dw.dim_time (
    timekey      INT PRIMARY KEY,
    ngay         DATE NOT NULL,
    thang        INT NOT NULL,
    nam          INT NOT NULL
);

CREATE TABLE IF NOT EXISTS dw.dim_product (
    productkey   INT PRIMARY KEY,
    mamh         VARCHAR(20) NOT NULL UNIQUE,
    mota         VARCHAR(255) NOT NULL,
    kichco       VARCHAR(50),
    trongluong   DECIMAL(10,2),
    gia          DECIMAL(18,2)
);

CREATE TABLE IF NOT EXISTS dw.dim_order (
    orderkey     INT PRIMARY KEY,
    madon        VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS dw.dim_thanhpho (
    mathanhpho   VARCHAR(20) PRIMARY KEY,
    tenthanhpho  VARCHAR(100) NOT NULL,
    bang         VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS dw.dim_customer (
    customerkey   INT PRIMARY KEY,
    makh          VARCHAR(20) NOT NULL UNIQUE,
    tenkh         VARCHAR(100) NOT NULL,
    mathanhpho    VARCHAR(20) NOT NULL,
    iskhdulich    BOOLEAN NOT NULL DEFAULT FALSE,
    iskhbuudien   BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_dim_customer_thanhpho
        FOREIGN KEY (mathanhpho) REFERENCES dw.dim_thanhpho(mathanhpho)
);

CREATE TABLE IF NOT EXISTS dw.dim_store (
    storekey      INT PRIMARY KEY,
    macuahang     VARCHAR(20) NOT NULL UNIQUE,
    sodienthoai   VARCHAR(20),
    mathanhpho    VARCHAR(20) NOT NULL,
    diachivp      VARCHAR(255),
    CONSTRAINT fk_dim_store_thanhpho
        FOREIGN KEY (mathanhpho) REFERENCES dw.dim_thanhpho(mathanhpho)
);

CREATE TABLE IF NOT EXISTS dw.fact_orderdetail (
    timekey       INT NOT NULL,
    orderkey      INT NOT NULL,
    customerkey   INT NOT NULL,
    productkey    INT NOT NULL,
    soluongdat    INT NOT NULL CHECK (soluongdat > 0),
    tongtien      DECIMAL(18,2) NOT NULL CHECK (tongtien >= 0),

    CONSTRAINT pk_fact_orderdetail
        PRIMARY KEY (timekey, orderkey, customerkey, productkey),

    CONSTRAINT fk_fact_orderdetail_time
        FOREIGN KEY (timekey) REFERENCES dw.dim_time(timekey),
    CONSTRAINT fk_fact_orderdetail_order
        FOREIGN KEY (orderkey) REFERENCES dw.dim_order(orderkey),
    CONSTRAINT fk_fact_orderdetail_customer
        FOREIGN KEY (customerkey) REFERENCES dw.dim_customer(customerkey),
    CONSTRAINT fk_fact_orderdetail_product
        FOREIGN KEY (productkey) REFERENCES dw.dim_product(productkey)
);

CREATE TABLE IF NOT EXISTS dw.fact_inventory (
    timekey         INT NOT NULL,
    storekey        INT NOT NULL,
    productkey      INT NOT NULL,
    soluongtonkho   INT NOT NULL CHECK (soluongtonkho >= 0),

    CONSTRAINT pk_fact_inventory
        PRIMARY KEY (timekey, storekey, productkey),

    CONSTRAINT fk_fact_inventory_time
        FOREIGN KEY (timekey) REFERENCES dw.dim_time(timekey),
    CONSTRAINT fk_fact_inventory_store
        FOREIGN KEY (storekey) REFERENCES dw.dim_store(storekey),
    CONSTRAINT fk_fact_inventory_product
        FOREIGN KEY (productkey) REFERENCES dw.dim_product(productkey)
);

CREATE INDEX IF NOT EXISTS idx_fact_orderdetail_timekey
    ON dw.fact_orderdetail(timekey);
CREATE INDEX IF NOT EXISTS idx_fact_orderdetail_orderkey
    ON dw.fact_orderdetail(orderkey);
CREATE INDEX IF NOT EXISTS idx_fact_orderdetail_customerkey
    ON dw.fact_orderdetail(customerkey);
CREATE INDEX IF NOT EXISTS idx_fact_orderdetail_productkey
    ON dw.fact_orderdetail(productkey);
CREATE INDEX IF NOT EXISTS idx_fact_inventory_timekey
    ON dw.fact_inventory(timekey);
CREATE INDEX IF NOT EXISTS idx_fact_inventory_storekey
    ON dw.fact_inventory(storekey);
CREATE INDEX IF NOT EXISTS idx_fact_inventory_productkey
    ON dw.fact_inventory(productkey);
"""





def run_sql(conn: psycopg.Connection, sql_text: str, label: str) -> None:
    with conn.cursor() as cur:
        cur.execute(sql_text)
    conn.commit()
    print(f"[OK] {label}")


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build and seed PostgreSQL DW")
    parser.add_argument(
        "--mode",
        choices=["all", "schema", "seed"],
        default="all",
        help="all: tao schema + seed, schema: chi tao bang, seed: chi chen du lieu",
    )
    return parser.parse_args(list(argv))


def main(argv: Iterable[str]) -> int:
    args = parse_args(argv)
    conn_str = DATABASE_URL
    print(f"Dang ket noi toi: {SAFE_DATABASE_URL}")

    try:
        with psycopg.connect(conn_str, autocommit=False) as conn:
            if args.mode in ("all", "schema"):
                run_sql(conn, CREATE_SQL, "Tao schema DW")
            if args.mode in ("all", "seed"):
                run_sql(conn, SEED_SQL, "Chen du lieu mau")
    except Exception as exc:
        print(f"[ERROR] {exc}")
        return 1

    print("Hoan tat.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
