#!/usr/bin/env python3
from __future__ import annotations

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
    build_product_year_price_book,
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
class UnifiedConfig:
    start_year: int = 2022
    num_years: int = 4
    historical_years: int = 2
    current_years: int = 2

    num_stores: int = 160
    num_customers: int = 3000
    base_product_count: int = 180
    extra_historical_products: int = 10

    historical_price_change_ratio: float = 0.18
    historical_price_delta_min_pct: float = 0.05
    historical_price_delta_max_pct: float = 0.18

    historical_store_min_products: int = 95
    historical_store_max_products: int = 145
    current_store_min_products: int = 90
    current_store_max_products: int = 140
    min_stores_per_product: int = 20

    sale_rows_per_store_month_min: int = 12
    sale_rows_per_store_month_max: int = 35
    sale_qty_min: int = 1
    sale_qty_max: int = 8

    initial_stock_min: int = 300
    initial_stock_max: int = 1000

    random_seed: int = 242

    @property
    def total_product_count(self) -> int:
        return self.base_product_count + self.extra_historical_products


@dataclass(frozen=True)
class SaleConfig:
    start_year: int
    num_years: int
    num_stores: int
    num_products: int
    num_customers: int
    store_min_products: int
    store_max_products: int
    min_stores_per_product: int
    sale_rows_per_store_month_min: int
    sale_rows_per_store_month_max: int
    sale_qty_min: int
    sale_qty_max: int
    initial_stock_min: int
    initial_stock_max: int
    random_seed: int


def validate_config(cfg: UnifiedConfig) -> None:
    if cfg.num_years != cfg.historical_years + cfg.current_years:
        raise ValueError("num_years phai bang historical_years + current_years.")
    if cfg.base_product_count <= 0:
        raise ValueError("base_product_count phai > 0.")
    if cfg.extra_historical_products < 0:
        raise ValueError("extra_historical_products phai >= 0.")
    if cfg.historical_store_min_products > cfg.historical_store_max_products:
        raise ValueError("historical_store_min_products phai <= historical_store_max_products.")
    if cfg.current_store_min_products > cfg.current_store_max_products:
        raise ValueError("current_store_min_products phai <= current_store_max_products.")
    if cfg.historical_store_max_products > cfg.total_product_count:
        raise ValueError("historical_store_max_products lon hon tong so product.")
    if cfg.current_store_max_products > cfg.base_product_count:
        raise ValueError("current_store_max_products lon hon so product hien hanh.")
    if cfg.min_stores_per_product > cfg.num_stores:
        raise ValueError("min_stores_per_product lon hon tong so store.")
    if cfg.sale_rows_per_store_month_min > cfg.sale_rows_per_store_month_max:
        raise ValueError("sale_rows_per_store_month_min phai <= sale_rows_per_store_month_max.")
    if cfg.sale_qty_min > cfg.sale_qty_max:
        raise ValueError("sale_qty_min phai <= sale_qty_max.")
    if cfg.initial_stock_min > cfg.initial_stock_max:
        raise ValueError("initial_stock_min phai <= initial_stock_max.")
    if not 0 <= cfg.historical_price_change_ratio <= 1:
        raise ValueError("historical_price_change_ratio phai nam trong [0, 1].")
    if cfg.historical_price_delta_min_pct > cfg.historical_price_delta_max_pct:
        raise ValueError("historical_price_delta_min_pct phai <= historical_price_delta_max_pct.")


def build_unified_product_rows(
    cfg: UnifiedConfig,
    rnd: random.Random,
) -> List[Tuple[int, str, str, str, Decimal]]:
    rows: List[Tuple[int, str, str, str, Decimal]] = []
    for i in range(1, cfg.total_product_count + 1):
        description = f"Mat hang {i:03d}" if i <= cfg.base_product_count else f"Mat hang lich su {i:03d}"
        rows.append(
            (
                i,
                f"MH{i:04d}",
                description,
                SIZE_VALUES[(i - 1) % len(SIZE_VALUES)],
                decimal2(round(rnd.uniform(0.10, 5.00), 2)),
            )
        )
    return rows


def build_historical_price_book(
    cfg: UnifiedConfig,
    historical_time_rows: Sequence[Tuple[int, int, int, int]],
    product_rows: Sequence[Tuple[int, str, str, str, Decimal]],
    rnd: random.Random,
) -> Tuple[dict[tuple[int, int], Decimal], List[str]]:
    years = sorted({row[3] for row in historical_time_rows})
    first_year, last_year = years[0], years[-1]
    productkeys = [row[0] for row in product_rows]

    price_book: dict[tuple[int, int], Decimal] = {
        (first_year, productkey): decimal2(rnd.randint(18, 460) * 1000)
        for productkey in productkeys
    }

    changed_count = int(round(cfg.base_product_count * cfg.historical_price_change_ratio))
    if cfg.base_product_count > 0 and cfg.historical_price_change_ratio > 0:
        changed_count = max(1, changed_count)

    changed_shared_products = (
        set(rnd.sample(range(1, cfg.base_product_count + 1), changed_count))
        if changed_count > 0
        else set()
    )

    changed_codes: List[str] = []
    for productkey in productkeys:
        prev_price = price_book[(first_year, productkey)]
        if productkey in changed_shared_products:
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


def ensure_empty_tables(conn) -> None:
    cur = conn.cursor()
    cur.execute(
        f"""
        SELECT
            (SELECT COUNT(*) FROM {SCHEMA}.dim_time),
            (SELECT COUNT(*) FROM {SCHEMA}.dim_product),
            (SELECT COUNT(*) FROM {SCHEMA}.dim_customer),
            (SELECT COUNT(*) FROM {SCHEMA}.dim_store),
            (SELECT COUNT(*) FROM {SCHEMA}.fact_sale),
            (SELECT COUNT(*) FROM {SCHEMA}.fact_inventory_snapshot);
        """
    )
    counts = cur.fetchone()
    cur.close()
    if any(count > 0 for count in counts):
        raise RuntimeError(
            "Cac bang DW da co du lieu. Neu muon nap lai bo 2022-2025, hay dung --mode reset-and-seed."
        )


def ensure_schema_ready(conn) -> None:
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
        raise RuntimeError("Schema DW chua duoc tao day du. Hay chay build_dw.py --mode schema truoc.")


def build_sale_cfg(
    cfg: UnifiedConfig,
    start_year: int,
    num_years: int,
    num_products: int,
    store_min_products: int,
    store_max_products: int,
    random_seed: int,
) -> SaleConfig:
    return SaleConfig(
        start_year=start_year,
        num_years=num_years,
        num_stores=cfg.num_stores,
        num_products=num_products,
        num_customers=cfg.num_customers,
        store_min_products=store_min_products,
        store_max_products=store_max_products,
        min_stores_per_product=cfg.min_stores_per_product,
        sale_rows_per_store_month_min=cfg.sale_rows_per_store_month_min,
        sale_rows_per_store_month_max=cfg.sale_rows_per_store_month_max,
        sale_qty_min=cfg.sale_qty_min,
        sale_qty_max=cfg.sale_qty_max,
        initial_stock_min=cfg.initial_stock_min,
        initial_stock_max=cfg.initial_stock_max,
        random_seed=random_seed,
    )


def seed_all(conn, cfg: UnifiedConfig) -> None:
    master_rnd = random.Random(cfg.random_seed)
    fake = Faker("vi_VN")
    fake.seed_instance(cfg.random_seed)

    product_rnd = random.Random(master_rnd.randint(1, 10**9))
    shared_dim_rnd = random.Random(master_rnd.randint(1, 10**9))
    historical_rnd = random.Random(master_rnd.randint(1, 10**9))
    current_rnd = random.Random(master_rnd.randint(1, 10**9))

    all_time_rows = build_time_rows(
        SaleConfig(
            start_year=cfg.start_year,
            num_years=cfg.num_years,
            num_stores=cfg.num_stores,
            num_products=cfg.total_product_count,
            num_customers=cfg.num_customers,
            store_min_products=cfg.historical_store_min_products,
            store_max_products=cfg.historical_store_max_products,
            min_stores_per_product=cfg.min_stores_per_product,
            sale_rows_per_store_month_min=cfg.sale_rows_per_store_month_min,
            sale_rows_per_store_month_max=cfg.sale_rows_per_store_month_max,
            sale_qty_min=cfg.sale_qty_min,
            sale_qty_max=cfg.sale_qty_max,
            initial_stock_min=cfg.initial_stock_min,
            initial_stock_max=cfg.initial_stock_max,
            random_seed=cfg.random_seed,
        )
    )
    historical_time_rows = [row for row in all_time_rows if row[3] < cfg.start_year + cfg.historical_years]
    current_time_rows = [row for row in all_time_rows if row[3] >= cfg.start_year + cfg.historical_years]

    product_rows = build_unified_product_rows(cfg, product_rnd)
    shared_product_rows = product_rows[: cfg.base_product_count]
    customer_rows = gen_dim_customer(
        build_sale_cfg(
            cfg,
            cfg.start_year,
            cfg.num_years,
            cfg.total_product_count,
            cfg.historical_store_min_products,
            cfg.historical_store_max_products,
            cfg.random_seed,
        ),
        shared_dim_rnd,
        fake,
    )
    store_rows = gen_dim_store(
        build_sale_cfg(
            cfg,
            cfg.start_year,
            cfg.num_years,
            cfg.total_product_count,
            cfg.historical_store_min_products,
            cfg.historical_store_max_products,
            cfg.random_seed,
        ),
        shared_dim_rnd,
    )

    historical_cfg = build_sale_cfg(
        cfg,
        cfg.start_year,
        cfg.historical_years,
        cfg.total_product_count,
        cfg.historical_store_min_products,
        cfg.historical_store_max_products,
        historical_rnd.randint(1, 10**9),
    )
    current_cfg = build_sale_cfg(
        cfg,
        cfg.start_year + cfg.historical_years,
        cfg.current_years,
        cfg.base_product_count,
        cfg.current_store_min_products,
        cfg.current_store_max_products,
        current_rnd.randint(1, 10**9),
    )

    historical_store_product_map = build_store_product_map(
        historical_cfg,
        store_rows,
        product_rows,
        historical_rnd,
    )
    current_store_product_map = build_store_product_map(
        current_cfg,
        store_rows,
        shared_product_rows,
        current_rnd,
    )

    historical_price_book, changed_codes = build_historical_price_book(
        cfg,
        historical_time_rows,
        product_rows,
        historical_rnd,
    )
    current_price_book = build_product_year_price_book(
        current_time_rows,
        shared_product_rows,
        current_rnd,
    )

    historical_sale_rows = gen_fact_sale(
        historical_cfg,
        historical_time_rows,
        product_rows,
        customer_rows,
        store_rows,
        historical_store_product_map,
        historical_price_book,
        historical_rnd,
    )
    current_sale_rows = gen_fact_sale(
        current_cfg,
        current_time_rows,
        shared_product_rows,
        customer_rows,
        store_rows,
        current_store_product_map,
        current_price_book,
        current_rnd,
    )
    sale_rows = historical_sale_rows + current_sale_rows

    historical_inventory_rows = gen_fact_inventory_snapshot(
        historical_cfg,
        historical_time_rows,
        store_rows,
        historical_store_product_map,
        aggregate_monthly_sales(historical_sale_rows),
        historical_rnd,
    )
    current_inventory_rows = gen_fact_inventory_snapshot(
        current_cfg,
        current_time_rows,
        store_rows,
        current_store_product_map,
        aggregate_monthly_sales(current_sale_rows),
        current_rnd,
    )
    inventory_rows = historical_inventory_rows + current_inventory_rows

    cur = conn.cursor()
    insert_many(cur, f"{SCHEMA}.dim_time", "timekey, thang, quy, nam", all_time_rows, "?, ?, ?, ?")
    insert_many(cur, f"{SCHEMA}.dim_product", "productkey, mamh, mota, kichco, trongluong", product_rows, "?, ?, ?, ?, ?")
    insert_many(cur, f"{SCHEMA}.dim_customer", "customerkey, makh, tenkh, thanhpho, bang, iskhdulich, iskhbuudien", customer_rows, "?, ?, ?, ?, ?, ?, ?")
    insert_many(cur, f"{SCHEMA}.dim_store", "storekey, macuahang, sodienthoai, thanhpho, bang, diachivp", store_rows, "?, ?, ?, ?, ?, ?")
    insert_many(cur, f"{SCHEMA}.fact_sale", "productkey, timekey, storekey, customerkey, soluongban, tongtien", sale_rows, "?, ?, ?, ?, ?, ?")
    insert_many(cur, f"{SCHEMA}.fact_inventory_snapshot", "timekey, storekey, productkey, soluongtonkho", inventory_rows, "?, ?, ?, ?")
    cur.close()
    conn.commit()

    print("[OK] Seed hop nhat hoan tat.")
    print(f"  time span                  : {cfg.start_year}-{cfg.start_year + cfg.num_years - 1}")
    print(f"  dim_time                   : {len(all_time_rows):>8}")
    print(f"  dim_product                : {len(product_rows):>8}")
    print(f"    shared products          : {cfg.base_product_count:>8}")
    print(f"    extra historical only    : {cfg.extra_historical_products:>8}")
    print(f"    price-adjusted hist prod : {len(changed_codes):>8}")
    print(f"  dim_customer               : {len(customer_rows):>8}")
    print(f"  dim_store                  : {len(store_rows):>8}")
    print(f"  fact_sale                  : {len(sale_rows):>8}")
    print(f"    historical rows          : {len(historical_sale_rows):>8}")
    print(f"    current rows             : {len(current_sale_rows):>8}")
    print(f"  fact_inventory_snapshot    : {len(inventory_rows):>8}")
    print(f"    historical rows          : {len(historical_inventory_rows):>8}")
    print(f"    current rows             : {len(current_inventory_rows):>8}")


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed bo du lieu hop nhat 2022-2025 cho schema moi."
    )
    parser.add_argument("--mode", choices=("seed", "reset-and-seed"), default="reset-and-seed")
    parser.add_argument("--start-year", type=int, default=2022)
    parser.add_argument("--num-years", type=int, default=4)
    parser.add_argument("--historical-years", type=int, default=2)
    parser.add_argument("--current-years", type=int, default=2)
    parser.add_argument("--num-stores", type=int, default=160)
    parser.add_argument("--num-customers", type=int, default=3000)
    parser.add_argument("--base-product-count", type=int, default=180)
    parser.add_argument("--extra-historical-products", type=int, default=10)
    parser.add_argument("--historical-price-change-ratio", type=float, default=0.18)
    parser.add_argument("--historical-price-delta-min-pct", type=float, default=0.05)
    parser.add_argument("--historical-price-delta-max-pct", type=float, default=0.18)
    parser.add_argument("--historical-store-min-products", type=int, default=95)
    parser.add_argument("--historical-store-max-products", type=int, default=145)
    parser.add_argument("--current-store-min-products", type=int, default=90)
    parser.add_argument("--current-store-max-products", type=int, default=140)
    parser.add_argument("--min-stores-per-product", type=int, default=20)
    parser.add_argument("--sale-rows-per-store-month-min", type=int, default=12)
    parser.add_argument("--sale-rows-per-store-month-max", type=int, default=35)
    parser.add_argument("--sale-qty-min", type=int, default=1)
    parser.add_argument("--sale-qty-max", type=int, default=8)
    parser.add_argument("--initial-stock-min", type=int, default=300)
    parser.add_argument("--initial-stock-max", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=242)
    return parser.parse_args(list(argv))


def main(argv: Iterable[str]) -> None:
    args = parse_args(argv)
    cfg = UnifiedConfig(
        start_year=args.start_year,
        num_years=args.num_years,
        historical_years=args.historical_years,
        current_years=args.current_years,
        num_stores=args.num_stores,
        num_customers=args.num_customers,
        base_product_count=args.base_product_count,
        extra_historical_products=args.extra_historical_products,
        historical_price_change_ratio=args.historical_price_change_ratio,
        historical_price_delta_min_pct=args.historical_price_delta_min_pct,
        historical_price_delta_max_pct=args.historical_price_delta_max_pct,
        historical_store_min_products=args.historical_store_min_products,
        historical_store_max_products=args.historical_store_max_products,
        current_store_min_products=args.current_store_min_products,
        current_store_max_products=args.current_store_max_products,
        min_stores_per_product=args.min_stores_per_product,
        sale_rows_per_store_month_min=args.sale_rows_per_store_month_min,
        sale_rows_per_store_month_max=args.sale_rows_per_store_month_max,
        sale_qty_min=args.sale_qty_min,
        sale_qty_max=args.sale_qty_max,
        initial_stock_min=args.initial_stock_min,
        initial_stock_max=args.initial_stock_max,
        random_seed=args.seed,
    )
    validate_config(cfg)

    print(f"Dang ket noi toi: {SAFE_DATABASE_URL}")
    print(
        "seed_dw_2022_2025.py se tao bo du lieu hop nhat 2022-2025, "
        "gom 180 san pham chung va 10 san pham chi xuat hien trong giai doan 2022-2023."
    )

    conn = connect(CONNECTION_STRING)
    try:
        ensure_schema_ready(conn)
        if args.mode == "reset-and-seed":
            cur = conn.cursor()
            print("Dang xoa du lieu cu trong DW...")
            reset_tables(cur)
            cur.close()
            conn.commit()
        else:
            ensure_empty_tables(conn)
        seed_all(conn, cfg)
    finally:
        conn.close()


if __name__ == "__main__":
    main(sys.argv[1:])

