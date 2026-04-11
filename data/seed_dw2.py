#!/usr/bin/env python3
from __future__ import annotations

"""
seed_dw2.py

Sinh du lieu lich su cho 2 nam 2023-2024.

Luu y:
- Gia ban khong luu trong dim_product.
- Gia duoc mo phong thong qua fact_sale.tongtien / fact_sale.soluongban.
- Script nay tao bo du lieu 2023-2024 voi:
  1. 180 ma hang chung
  2. 10 ma hang chi xuat hien o slice lich su
  3. mot phan ma hang chung co don gia lich su khac nhe
"""

import argparse
import random
import sys
from dataclasses import dataclass
from decimal import Decimal
from typing import Iterable, List, Sequence, Tuple

from faker import Faker

from seed_dw import (
    CONNECTION_STRING,
    SAFE_DATABASE_URL,
    SCHEMA,
    SIZE_VALUES,
    aggregate_monthly_sales,
    build_store_product_map,
    build_time_rows,
    connect,
    decimal2,
    gen_dim_customer,
    gen_dim_store,
    gen_fact_inventory_snapshot,
    gen_fact_sale,
    insert_many,
    reset_tables,
)


@dataclass(frozen=True)
class HistoricalConfig:
    start_year: int = 2023
    num_years: int = 2
    num_stores: int = 160
    num_customers: int = 3000

    base_product_count: int = 180
    extra_historical_products: int = 10

    # Ty le ma hang chung duoc dieu chinh gia cho slice 2023-2024.
    historical_price_change_ratio: float = 0.18
    historical_price_delta_min_pct: float = 0.05
    historical_price_delta_max_pct: float = 0.18

    # Quan he store-product
    store_min_products: int = 95
    store_max_products: int = 145
    min_stores_per_product: int = 20

    # Ban hang theo thang
    sale_rows_per_store_month_min: int = 12
    sale_rows_per_store_month_max: int = 35
    sale_qty_min: int = 1
    sale_qty_max: int = 8

    # Ton kho ban dau
    initial_stock_min: int = 300
    initial_stock_max: int = 1000

    random_seed: int = 142

    @property
    def num_products(self) -> int:
        return self.base_product_count + self.extra_historical_products


def _validate_config(cfg: HistoricalConfig) -> None:
    if cfg.base_product_count <= 0:
        raise ValueError("base_product_count phai > 0.")
    if cfg.extra_historical_products < 0:
        raise ValueError("extra_historical_products phai >= 0.")
    if not 0 <= cfg.historical_price_change_ratio <= 1:
        raise ValueError("historical_price_change_ratio phai nam trong [0, 1].")
    if cfg.historical_price_delta_min_pct < 0 or cfg.historical_price_delta_max_pct < 0:
        raise ValueError("Gia tri delta phan tram phai >= 0.")
    if cfg.historical_price_delta_min_pct > cfg.historical_price_delta_max_pct:
        raise ValueError("historical_price_delta_min_pct phai <= historical_price_delta_max_pct.")
    if cfg.store_min_products > cfg.num_products:
        raise ValueError("store_min_products lon hon tong so product.")
    if cfg.store_max_products > cfg.num_products:
        raise ValueError("store_max_products lon hon tong so product.")


def gen_dim_product_historical(
    cfg: HistoricalConfig,
    rnd: random.Random,
) -> List[Tuple[int, str, str, str, Decimal]]:
    rows: List[Tuple[int, str, str, str, Decimal]] = []
    for i in range(1, cfg.num_products + 1):
        productkey = i
        mamh = f"MH{i:04d}"

        if i <= cfg.base_product_count:
            mota = f"Mat hang {i:03d}"
        else:
            mota = f"Mat hang lich su {i:03d}"

        kichco = SIZE_VALUES[(i - 1) % len(SIZE_VALUES)]
        trongluong = decimal2(round(rnd.uniform(0.10, 5.00), 2))
        rows.append((productkey, mamh, mota, kichco, trongluong))

    return rows


def build_historical_product_year_price_book(
    cfg: HistoricalConfig,
    time_rows: Sequence[Tuple[int, int, int, int]],
    product_rows: Sequence[Tuple[int, str, str, str, Decimal]],
    rnd: random.Random,
) -> Tuple[dict[tuple[int, int], Decimal], List[str]]:
    years = sorted({row[3] for row in time_rows})
    first_year = years[0]
    last_year = years[-1]
    productkeys = [row[0] for row in product_rows]

    price_book: dict[tuple[int, int], Decimal] = {}
    base_price_by_product = {
        productkey: decimal2(rnd.randint(18, 460) * 1000)
        for productkey in productkeys
    }

    for productkey in productkeys:
        price_book[(first_year, productkey)] = base_price_by_product[productkey]

    shared_changed_count = int(round(cfg.base_product_count * cfg.historical_price_change_ratio))
    if cfg.base_product_count > 0 and cfg.historical_price_change_ratio > 0:
        shared_changed_count = max(1, shared_changed_count)

    changed_product_keys = set(
        rnd.sample(range(1, cfg.base_product_count + 1), shared_changed_count)
    ) if shared_changed_count > 0 else set()

    changed_codes: List[str] = []
    for productkey in productkeys:
        prev_price = price_book[(first_year, productkey)]
        if productkey in changed_product_keys:
            direction = -1 if rnd.random() < 0.70 else 1
            delta_pct = rnd.uniform(
                cfg.historical_price_delta_min_pct,
                cfg.historical_price_delta_max_pct,
            )
            factor = Decimal(str(1 + (direction * delta_pct)))
            price_book[(last_year, productkey)] = decimal2(prev_price * factor)
            changed_codes.append(f"MH{productkey:04d}")
        else:
            price_book[(last_year, productkey)] = prev_price

    return price_book, changed_codes


def seed_all(conn, cfg: HistoricalConfig) -> None:
    rnd = random.Random(cfg.random_seed)
    fake = Faker("vi_VN")
    fake.seed_instance(cfg.random_seed)

    time_rows = build_time_rows(cfg)
    product_rows = gen_dim_product_historical(cfg, rnd)
    product_year_price_book, changed_codes = build_historical_product_year_price_book(
        cfg,
        time_rows,
        product_rows,
        rnd,
    )
    customer_rows = gen_dim_customer(cfg, rnd, fake)
    store_rows = gen_dim_store(cfg, rnd)

    store_product_map = build_store_product_map(cfg, store_rows, product_rows, rnd)
    sale_rows = gen_fact_sale(
        cfg,
        time_rows,
        product_rows,
        customer_rows,
        store_rows,
        store_product_map,
        product_year_price_book,
        rnd,
    )
    sales_by_store_product_month = aggregate_monthly_sales(sale_rows)
    inventory_rows = gen_fact_inventory_snapshot(
        cfg,
        time_rows,
        store_rows,
        store_product_map,
        sales_by_store_product_month,
        rnd,
    )

    cur = conn.cursor()

    insert_many(cur, f"{SCHEMA}.dim_time", "timekey, thang, quy, nam", time_rows, "?, ?, ?, ?")
    insert_many(
        cur,
        f"{SCHEMA}.dim_product",
        "productkey, mamh, mota, kichco, trongluong",
        product_rows,
        "?, ?, ?, ?, ?",
    )
    insert_many(
        cur,
        f"{SCHEMA}.dim_customer",
        "customerkey, makh, tenkh, thanhpho, bang, iskhdulich, iskhbuudien",
        customer_rows,
        "?, ?, ?, ?, ?, ?, ?",
    )
    insert_many(
        cur,
        f"{SCHEMA}.dim_store",
        "storekey, macuahang, sodienthoai, thanhpho, bang, diachivp",
        store_rows,
        "?, ?, ?, ?, ?, ?",
    )
    insert_many(
        cur,
        f"{SCHEMA}.fact_sale",
        "productkey, timekey, storekey, customerkey, soluongban, tongtien",
        sale_rows,
        "?, ?, ?, ?, ?, ?",
    )
    insert_many(
        cur,
        f"{SCHEMA}.fact_inventory_snapshot",
        "timekey, storekey, productkey, soluongtonkho",
        inventory_rows,
        "?, ?, ?, ?",
    )

    cur.close()
    conn.commit()

    shared_count = cfg.base_product_count
    extra_count = cfg.extra_historical_products
    print("[OK] Seed lich su hoan tat.")
    print(f"  time span                : {cfg.start_year}-{cfg.start_year + cfg.num_years - 1}")
    print(f"  dim_time                 : {len(time_rows):>8}")
    print(f"  dim_product              : {len(product_rows):>8}")
    print(f"    shared products        : {shared_count:>8}")
    print(f"    extra historical only  : {extra_count:>8}")
    print(f"    price-adjusted shared  : {len(changed_codes):>8}")
    print(f"  dim_customer             : {len(customer_rows):>8}")
    print(f"  dim_store                : {len(store_rows):>8}")
    print(f"  fact_sale                : {len(sale_rows):>8}")
    print(f"  fact_inventory_snapshot  : {len(inventory_rows):>8}")
    if changed_codes:
        preview = ", ".join(changed_codes[:10])
        suffix = "" if len(changed_codes) <= 10 else ", ..."
        print(f"  changed product codes    : {preview}{suffix}")


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Seed historical DW slice for 2023-2024. "
            "Script nay reset va seed mot bo du lieu lich su rieng."
        )
    )
    parser.add_argument("--mode", choices=("seed", "reset-and-seed"), default="reset-and-seed")
    parser.add_argument("--start-year", type=int, default=2023)
    parser.add_argument("--num-years", type=int, default=2)
    parser.add_argument("--num-stores", type=int, default=160)
    parser.add_argument("--num-customers", type=int, default=3000)
    parser.add_argument("--base-product-count", type=int, default=180)
    parser.add_argument("--extra-historical-products", type=int, default=10)
    parser.add_argument("--historical-price-change-ratio", type=float, default=0.18)
    parser.add_argument("--historical-price-delta-min-pct", type=float, default=0.05)
    parser.add_argument("--historical-price-delta-max-pct", type=float, default=0.18)
    parser.add_argument("--store-min-products", type=int, default=95)
    parser.add_argument("--store-max-products", type=int, default=145)
    parser.add_argument("--min-stores-per-product", type=int, default=20)
    parser.add_argument("--sale-rows-per-store-month-min", type=int, default=12)
    parser.add_argument("--sale-rows-per-store-month-max", type=int, default=35)
    parser.add_argument("--sale-qty-min", type=int, default=1)
    parser.add_argument("--sale-qty-max", type=int, default=8)
    parser.add_argument("--initial-stock-min", type=int, default=300)
    parser.add_argument("--initial-stock-max", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=142)
    return parser.parse_args(list(argv))


def main(argv: Iterable[str]) -> None:
    args = parse_args(argv)
    cfg = HistoricalConfig(
        start_year=args.start_year,
        num_years=args.num_years,
        num_stores=args.num_stores,
        num_customers=args.num_customers,
        base_product_count=args.base_product_count,
        extra_historical_products=args.extra_historical_products,
        historical_price_change_ratio=args.historical_price_change_ratio,
        historical_price_delta_min_pct=args.historical_price_delta_min_pct,
        historical_price_delta_max_pct=args.historical_price_delta_max_pct,
        store_min_products=args.store_min_products,
        store_max_products=args.store_max_products,
        min_stores_per_product=args.min_stores_per_product,
        sale_rows_per_store_month_min=args.sale_rows_per_store_month_min,
        sale_rows_per_store_month_max=args.sale_rows_per_store_month_max,
        sale_qty_min=args.sale_qty_min,
        sale_qty_max=args.sale_qty_max,
        initial_stock_min=args.initial_stock_min,
        initial_stock_max=args.initial_stock_max,
        random_seed=args.seed,
    )
    _validate_config(cfg)

    print(f"Dang ket noi toi: {SAFE_DATABASE_URL}")
    print(
        "seed_dw2.py se tao bo du lieu 2023-2024 voi 10 san pham lich su bo sung "
        "va don gia ban nam sau co thay doi nhe cho mot phan san pham chung."
    )

    conn = connect(CONNECTION_STRING)
    try:
        cur = conn.cursor()
        cur.execute(
            f"""
            SELECT OBJECT_ID('{SCHEMA}.dim_time', 'U'),
                   OBJECT_ID('{SCHEMA}.dim_product', 'U'),
                   OBJECT_ID('{SCHEMA}.dim_customer', 'U'),
                   OBJECT_ID('{SCHEMA}.dim_store', 'U'),
                   OBJECT_ID('{SCHEMA}.fact_sale', 'U'),
                   OBJECT_ID('{SCHEMA}.fact_inventory_snapshot', 'U');
            """
        )
        regs = cur.fetchone()
        cur.close()
        if any(x is None for x in regs):
            raise RuntimeError(
                "Schema DW chua duoc tao day du. Hay chay build_dw.py --mode schema truoc."
            )

        if args.mode == "reset-and-seed":
            cur = conn.cursor()
            print("Dang xoa du lieu cu trong DW...")
            reset_tables(cur)
            cur.close()
            conn.commit()

        seed_all(conn, cfg)
    finally:
        conn.close()


if __name__ == "__main__":
    main(sys.argv[1:])
