#!/usr/bin/env python3
from __future__ import annotations

"""
seed_dw.py

Sinh du lieu ao truc tiep cho kho du lieu DW theo mo hinh cuoi cung.

Nguyen tac:
- Sinh du lieu truc tiep cho DW, khong mo phong ETL vat ly tu IDB vao server.
- Du lieu van phai khop logic nghiep vu nguon:
  + Khach hang thuoc it nhat mot trong hai loai: du lich / buu dien.
  + Chi phat sinh ban hang cho cac mat hang ma cua hang co luu tru.
  + Inventory snapshot luu so luong ton kho theo thang.
- Khong dua MucDoTonKho vao fact. Measure vat ly cua inventory chi la SoLuongTonKho.
- Time dimension theo thang, kho co 2 nam du lieu (24 thang).
"""

import argparse
import os
import random
from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Iterable, List, Sequence, Set, Tuple

import pyodbc
from faker import Faker

from db_config import CONNECTION_STRING, SAFE_DATABASE_URL

SCHEMA = os.getenv("MSSQL_SCHEMA", "dw")


@dataclass(frozen=True)
class Config:
    start_year: int = 2024
    num_years: int = 2
    num_stores: int = 160
    num_products: int = 180
    num_customers: int = 3000

    # Quan he store-product (tuong ung logic LuuTru)
    store_min_products: int = 90
    store_max_products: int = 140
    min_stores_per_product: int = 20

    # Ban hang theo thang
    sale_rows_per_store_month_min: int = 12
    sale_rows_per_store_month_max: int = 35
    sale_qty_min: int = 1
    sale_qty_max: int = 8

    # Ton kho khoi tao cho moi cap store-product
    initial_stock_min: int = 300
    initial_stock_max: int = 1000

    random_seed: int = 42


CITY_REGION_DATA: Tuple[Tuple[str, str, int], ...] = (
    ("Hà Nội", "Miền Bắc", 5),
    ("Hải Phòng", "Miền Bắc", 4),
    ("Quảng Ninh", "Miền Bắc", 3),
    ("Bắc Ninh", "Miền Bắc", 3),
    ("Hải Dương", "Miền Bắc", 2),
    ("Nam Định", "Miền Bắc", 2),
    ("Ninh Bình", "Miền Bắc", 2),
    ("Thái Nguyên", "Miền Bắc", 2),
    ("Lạng Sơn", "Miền Bắc", 1),
    ("Lào Cai", "Miền Bắc", 1),
    ("Thanh Hóa", "Miền Trung", 4),
    ("Vinh", "Miền Trung", 3),
    ("Hà Tĩnh", "Miền Trung", 1),
    ("Đồng Hới", "Miền Trung", 1),
    ("Huế", "Miền Trung", 3),
    ("Đà Nẵng", "Miền Trung", 5),
    ("Tam Kỳ", "Miền Trung", 1),
    ("Quảng Ngãi", "Miền Trung", 1),
    ("Quy Nhơn", "Miền Trung", 2),
    ("Nha Trang", "Miền Trung", 3),
    ("Phan Rang", "Miền Trung", 1),
    ("Đà Lạt", "Miền Trung", 2),
    ("TP Hồ Chí Minh", "Miền Nam", 6),
    ("Biên Hòa", "Miền Nam", 3),
    ("Thủ Dầu Một", "Miền Nam", 3),
    ("Vũng Tàu", "Miền Nam", 2),
    ("Cần Thơ", "Miền Nam", 4),
    ("Mỹ Tho", "Miền Nam", 2),
    ("Long Xuyên", "Miền Nam", 1),
    ("Rạch Giá", "Miền Nam", 1),
    ("Cà Mau", "Miền Nam", 1),
    ("Sóc Trăng", "Miền Nam", 1),
)

SIZE_VALUES: Tuple[str, ...] = ("S", "M", "L", "XL", "XXL", "Free", "Nhỏ", "Vừa", "Lớn")


def decimal2(value: float | Decimal) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def connect(conn_str: str):
    return pyodbc.connect(conn_str, autocommit=False)


def reset_tables(cur) -> None:
    cur.execute(f"DELETE FROM {SCHEMA}.fact_sale;")
    cur.execute(f"DELETE FROM {SCHEMA}.fact_inventory_snapshot;")
    cur.execute(f"DELETE FROM {SCHEMA}.dim_customer;")
    cur.execute(f"DELETE FROM {SCHEMA}.dim_store;")
    cur.execute(f"DELETE FROM {SCHEMA}.dim_product;")
    cur.execute(f"DELETE FROM {SCHEMA}.dim_time;")


def build_time_rows(cfg: Config) -> List[Tuple[int, int, int, int]]:
    rows: List[Tuple[int, int, int, int]] = []
    for year in range(cfg.start_year, cfg.start_year + cfg.num_years):
        for month in range(1, 13):
            timekey = year * 100 + month
            quarter = ((month - 1) // 3) + 1
            rows.append((timekey, month, quarter, year))
    return rows


def _city_weight_arrays() -> Tuple[List[Tuple[str, str]], List[int]]:
    city_region_pairs = [(city, region) for city, region, _weight in CITY_REGION_DATA]
    weights = [weight for _city, _region, weight in CITY_REGION_DATA]
    return city_region_pairs, weights


def gen_dim_product(cfg: Config, rnd: random.Random) -> List[Tuple[int, str, str, str, Decimal, Decimal]]:
    rows: List[Tuple[int, str, str, str, Decimal, Decimal]] = []
    for i in range(1, cfg.num_products + 1):
        productkey = i
        mamh = f"MH{i:04d}"
        mota = f"Mặt hàng {i:03d}"
        kichco = SIZE_VALUES[(i - 1) % len(SIZE_VALUES)]
        trongluong = decimal2(round(rnd.uniform(0.10, 5.00), 2))
        gia = decimal2(rnd.randint(20, 500) * 1000)
        rows.append((productkey, mamh, mota, kichco, trongluong, gia))
    return rows


def gen_dim_customer(cfg: Config, rnd: random.Random, fake: Faker) -> List[Tuple[int, str, str, str, str, int, int]]:
    city_region_pairs, weights = _city_weight_arrays()
    rows: List[Tuple[int, str, str, str, str, int, int]] = []

    subtype_pattern = (("du_lich",) * 8) + (("buu_dien",) * 8) + (("ca_hai",) * 4)

    for i in range(1, cfg.num_customers + 1):
        city, region = rnd.choices(city_region_pairs, weights=weights, k=1)[0]
        kind = subtype_pattern[(i - 1) % len(subtype_pattern)]
        iskhdulich = 1 if kind in ("du_lich", "ca_hai") else 0
        iskhbuudien = 1 if kind in ("buu_dien", "ca_hai") else 0
        rows.append(
            (
                i,
                f"KH{i:05d}",
                fake.name(),
                city,
                region,
                iskhdulich,
                iskhbuudien,
            )
        )
    return rows


def _vn_phone_number(rnd: random.Random) -> str:
    prefixes = (
        "32", "33", "34", "35", "36", "37", "38", "39",
        "70", "76", "77", "78", "79",
        "81", "82", "83", "84", "85",
        "88", "89",
        "90", "91", "93", "94", "96", "97", "98", "99",
    )
    return f"+84{rnd.choice(prefixes)}{rnd.randint(0, 9999999):07d}"


def gen_dim_store(cfg: Config, rnd: random.Random) -> List[Tuple[int, str, str, str, str, str]]:
    city_region_pairs, weights = _city_weight_arrays()
    city_names = [city for city, _region in city_region_pairs]
    region_by_city = {city: region for city, region in city_region_pairs}

    city_counts = {city: 1 for city in city_names}
    remaining = cfg.num_stores - len(city_names)
    while remaining > 0:
        chosen_city, _chosen_region = rnd.choices(city_region_pairs, weights=weights, k=1)[0]
        city_counts[chosen_city] += 1
        remaining -= 1

    rows: List[Tuple[int, str, str, str, str, str]] = []
    storekey = 1
    for city in city_names:
        region = region_by_city[city]
        for nth in range(1, city_counts[city] + 1):
            rows.append(
                (
                    storekey,
                    f"CH{storekey:04d}",
                    _vn_phone_number(rnd),
                    city,
                    region,
                    f"Văn phòng đại diện {city} - Cửa hàng số {nth}",
                )
            )
            storekey += 1
    return rows


def build_store_product_map(
    cfg: Config,
    store_rows: Sequence[Tuple[int, str, str, str, str, str]],
    product_rows: Sequence[Tuple[int, str, str, str, Decimal, Decimal]],
    rnd: random.Random,
) -> Dict[int, Set[int]]:
    all_product_keys = [row[0] for row in product_rows]
    num_products = len(all_product_keys)

    if cfg.store_min_products > num_products:
        raise ValueError("store_min_products lon hon tong so product.")
    if cfg.store_max_products > num_products:
        raise ValueError("store_max_products lon hon tong so product.")
    if cfg.store_min_products > cfg.store_max_products:
        raise ValueError("store_min_products phai <= store_max_products.")
    if cfg.min_stores_per_product > len(store_rows):
        raise ValueError("min_stores_per_product lon hon tong so store.")

    store_product_map: Dict[int, Set[int]] = {}
    product_to_stores: Dict[int, Set[int]] = defaultdict(set)

    store_keys = [row[0] for row in store_rows]

    for storekey in store_keys:
        k = rnd.randint(cfg.store_min_products, cfg.store_max_products)
        chosen = set(rnd.sample(all_product_keys, k))
        store_product_map[storekey] = chosen
        for productkey in chosen:
            product_to_stores[productkey].add(storekey)

    for productkey in all_product_keys:
        current_store_count = len(product_to_stores[productkey])
        if current_store_count >= cfg.min_stores_per_product:
            continue

        candidate_stores = store_keys[:]
        rnd.shuffle(candidate_stores)
        need = cfg.min_stores_per_product - current_store_count

        for storekey in candidate_stores:
            if need <= 0:
                break
            if productkey in store_product_map[storekey]:
                continue
            if len(store_product_map[storekey]) >= cfg.store_max_products:
                continue
            store_product_map[storekey].add(productkey)
            product_to_stores[productkey].add(storekey)
            need -= 1

        if need > 0:
            raise RuntimeError(
                f"Khong the dam bao product {productkey} co mat o it nhat {cfg.min_stores_per_product} store."
            )

    return store_product_map


def gen_fact_sale(
    cfg: Config,
    time_rows: Sequence[Tuple[int, int, int, int]],
    product_rows: Sequence[Tuple[int, str, str, str, Decimal, Decimal]],
    customer_rows: Sequence[Tuple[int, str, str, str, str, int, int]],
    store_rows: Sequence[Tuple[int, str, str, str, str, str]],
    store_product_map: Dict[int, Set[int]],
    rnd: random.Random,
) -> List[Tuple[int, int, int, int, int, Decimal]]:
    product_price = {row[0]: row[5] for row in product_rows}
    customer_keys = [row[0] for row in customer_rows]

    city_to_customer_keys: Dict[str, List[int]] = defaultdict(list)
    for customerkey, _makh, _tenkh, city, _region, _dl, _bd in customer_rows:
        city_to_customer_keys[city].append(customerkey)

    sale_rows: List[Tuple[int, int, int, int, int, Decimal]] = []
    used_keys: Set[Tuple[int, int, int, int]] = set()

    for timekey, _thang, _quy, _nam in time_rows:
        for storekey, _macuahang, _phone, store_city, _region, _vp in store_rows:
            available_products = list(store_product_map[storekey])
            if not available_products:
                continue

            sale_row_count = rnd.randint(
                cfg.sale_rows_per_store_month_min,
                cfg.sale_rows_per_store_month_max,
            )
            sale_row_count = min(sale_row_count, len(available_products))
            chosen_products = rnd.sample(available_products, sale_row_count)

            preferred_customers = city_to_customer_keys.get(store_city) or customer_keys

            for productkey in chosen_products:
                if rnd.random() < 0.75:
                    customerkey = rnd.choice(preferred_customers)
                else:
                    customerkey = rnd.choice(customer_keys)

                natural_key = (productkey, timekey, storekey, customerkey)
                if natural_key in used_keys:
                    fallback_pool = customer_keys[:]
                    rnd.shuffle(fallback_pool)
                    chosen_customer = None
                    for candidate_customer in fallback_pool:
                        candidate_key = (productkey, timekey, storekey, candidate_customer)
                        if candidate_key not in used_keys:
                            chosen_customer = candidate_customer
                            natural_key = candidate_key
                            break
                    if chosen_customer is None:
                        continue
                    customerkey = chosen_customer

                used_keys.add(natural_key)

                qty = rnd.randint(cfg.sale_qty_min, cfg.sale_qty_max)
                amount = Decimal(product_price[productkey] * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                sale_rows.append((productkey, timekey, storekey, customerkey, qty, amount))

    return sale_rows


def aggregate_monthly_sales(
    sale_rows: Sequence[Tuple[int, int, int, int, int, Decimal]]
) -> Dict[Tuple[int, int, int], int]:
    sales_by_store_product_month: Dict[Tuple[int, int, int], int] = defaultdict(int)
    for productkey, timekey, storekey, _customerkey, qty, _amount in sale_rows:
        sales_by_store_product_month[(storekey, productkey, timekey)] += qty
    return sales_by_store_product_month


def gen_fact_inventory_snapshot(
    cfg: Config,
    time_rows: Sequence[Tuple[int, int, int, int]],
    store_rows: Sequence[Tuple[int, str, str, str, str, str]],
    store_product_map: Dict[int, Set[int]],
    sales_by_store_product_month: Dict[Tuple[int, int, int], int],
    rnd: random.Random,
) -> List[Tuple[int, int, int, int]]:
    opening_stock: Dict[Tuple[int, int], int] = {}
    for storekey, _macuahang, _phone, _city, _region, _vp in store_rows:
        for productkey in store_product_map[storekey]:
            opening_stock[(storekey, productkey)] = rnd.randint(
                cfg.initial_stock_min, cfg.initial_stock_max
            )

    timekeys_ordered = [row[0] for row in sorted(time_rows, key=lambda x: x[0])]

    inventory_rows: List[Tuple[int, int, int, int]] = []
    remaining_stock: Dict[Tuple[int, int], int] = dict(opening_stock)

    for timekey in timekeys_ordered:
        for storekey, _macuahang, _phone, _city, _region, _vp in store_rows:
            for productkey in sorted(store_product_map[storekey]):
                sold_qty = sales_by_store_product_month.get((storekey, productkey, timekey), 0)
                current_stock = max(0, remaining_stock[(storekey, productkey)] - sold_qty)
                remaining_stock[(storekey, productkey)] = current_stock
                inventory_rows.append((timekey, storekey, productkey, current_stock))

    return inventory_rows


def insert_many(cur, table: str, columns: str, rows: list, placeholder: str) -> None:
    sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholder})"
    cur.fast_executemany = True
    cur.executemany(sql, rows)


def seed_all(conn, cfg: Config) -> None:
    rnd = random.Random(cfg.random_seed)
    fake = Faker("vi_VN")
    fake.seed_instance(cfg.random_seed)

    time_rows = build_time_rows(cfg)
    product_rows = gen_dim_product(cfg, rnd)
    customer_rows = gen_dim_customer(cfg, rnd, fake)
    store_rows = gen_dim_store(cfg, rnd)

    store_product_map = build_store_product_map(cfg, store_rows, product_rows, rnd)
    sale_rows = gen_fact_sale(cfg, time_rows, product_rows, customer_rows, store_rows, store_product_map, rnd)
    sales_by_store_product_month = aggregate_monthly_sales(sale_rows)
    inventory_rows = gen_fact_inventory_snapshot(cfg, time_rows, store_rows, store_product_map, sales_by_store_product_month, rnd)

    cur = conn.cursor()

    insert_many(cur, f"{SCHEMA}.dim_time", "timekey, thang, quy, nam", time_rows, "?, ?, ?, ?")
    insert_many(cur, f"{SCHEMA}.dim_product", "productkey, mamh, mota, kichco, trongluong, gia", product_rows, "?, ?, ?, ?, ?, ?")
    insert_many(cur, f"{SCHEMA}.dim_customer", "customerkey, makh, tenkh, thanhpho, bang, iskhdulich, iskhbuudien", customer_rows, "?, ?, ?, ?, ?, ?, ?")
    insert_many(cur, f"{SCHEMA}.dim_store", "storekey, macuahang, sodienthoai, thanhpho, bang, diachivp", store_rows, "?, ?, ?, ?, ?, ?")
    insert_many(cur, f"{SCHEMA}.fact_sale", "productkey, timekey, storekey, customerkey, soluongban, tongtien", sale_rows, "?, ?, ?, ?, ?, ?")
    insert_many(cur, f"{SCHEMA}.fact_inventory_snapshot", "timekey, storekey, productkey, soluongtonkho", inventory_rows, "?, ?, ?, ?")

    cur.close()
    conn.commit()

    store_product_count = sum(len(v) for v in store_product_map.values())
    print("[OK] Seed hoan tat.")
    print(f"  dim_time                : {len(time_rows):>8}")
    print(f"  dim_product             : {len(product_rows):>8}")
    print(f"  dim_customer            : {len(customer_rows):>8}")
    print(f"  dim_store               : {len(store_rows):>8}")
    print(f"  fact_sale               : {len(sale_rows):>8}")
    print(f"  fact_inventory_snapshot : {len(inventory_rows):>8}")
    print(f"  store_product_relation  : {store_product_count:>8}")
    print(f"  warehouse_age_years     : {cfg.num_years:>8}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sinh du lieu ao cho DW theo kien truc cuoi cung.")
    parser.add_argument("--mode", choices=("seed", "reset-and-seed"), default="seed")
    parser.add_argument("--start-year", type=int, default=2024)
    parser.add_argument("--num-years", type=int, default=2)
    parser.add_argument("--num-stores", type=int, default=160)
    parser.add_argument("--num-products", type=int, default=180)
    parser.add_argument("--num-customers", type=int, default=3000)
    parser.add_argument("--store-min-products", type=int, default=90)
    parser.add_argument("--store-max-products", type=int, default=140)
    parser.add_argument("--min-stores-per-product", type=int, default=20)
    parser.add_argument("--sale-rows-per-store-month-min", type=int, default=12)
    parser.add_argument("--sale-rows-per-store-month-max", type=int, default=35)
    parser.add_argument("--sale-qty-min", type=int, default=1)
    parser.add_argument("--sale-qty-max", type=int, default=8)
    parser.add_argument("--initial-stock-min", type=int, default=300)
    parser.add_argument("--initial-stock-max", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    cfg = Config(
        start_year=args.start_year,
        num_years=args.num_years,
        num_stores=args.num_stores,
        num_products=args.num_products,
        num_customers=args.num_customers,
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

    print(f"Dang ket noi toi: {SAFE_DATABASE_URL}")

    try:
        conn = connect(CONNECTION_STRING)

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

        if args.mode == "reset-and-seed":
            cur = conn.cursor()
            print("Dang xoa du lieu cu trong DW...")
            reset_tables(cur)
            cur.close()
            conn.commit()

        seed_all(conn, cfg)
        conn.close()

    except Exception as exc:
        print(f"[ERROR] {exc}")
        raise


if __name__ == "__main__":
    main()
