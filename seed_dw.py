#!/usr/bin/env python3
"""
seed_dw.py

Sinh dữ liệu ảo cho kho dữ liệu DW trên PostgreSQL theo mô hình đã chốt.

Mô hình giả định:
- dw.dim_time(timekey, ngay, thang, nam)
- dw.dim_product(productkey, mamh, mota, kichco, trongluong, gia)
- dw.dim_order(orderkey, madon)
- dw.dim_thanhpho(mathanhpho, tenthanhpho, bang)
- dw.dim_customer(customerkey, makh, tenkh, mathanhpho, iskhdulich, iskhbuudien)
- dw.dim_store(storekey, macuahang, sodienthoai, mathanhpho, diachivp)
- dw.fact_orderdetail(timekey, orderkey, customerkey, productkey, soluongdat, tongtien)
- dw.fact_inventory(timekey, storekey, productkey, soluongtonkho)

Thiết kế dữ liệu bám theo bối cảnh doanh nghiệp tại Việt Nam:
- 3 "bang" theo đề bài được hiểu là 3 miền: Miền Bắc, Miền Trung, Miền Nam
- 32 thành phố
- trung bình khoảng 5 cửa hàng / thành phố; các thành phố lớn có thể nhiều hơn
- sản phẩm thuộc 3 nhóm chính:
  + thời trang
  + phụ kiện
  + tiêu dùng

Mặc định script tạo:
- 180 ngày
- 32 thành phố
- 160 cửa hàng
- 180 sản phẩm
- 3000 khách hàng
- 4500 đơn hàng
- ~10000 dòng fact_orderdetail
- ~4800 dòng fact_inventory

Cách dùng:
    python seed_dw.py --mode seed
    python seed_dw.py --mode reset-and-seed

Nếu muốn đổi kết nối DB:
    PowerShell:
        $env:DATABASE_URL="postgresql://dwuser:dwpass@localhost:5433/dwdb"
        python seed_dw.py --mode reset-and-seed
"""

from __future__ import annotations

import argparse
import os
import random
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Iterable, List, Sequence, Tuple
from db_config import DATABASE_URL, SAFE_DATABASE_URL

import psycopg
from faker import Faker

SCHEMA = os.getenv("POSTGRES_SCHEMA", "dw")


@dataclass(frozen=True)
class Config:
    start_date: date = date(2025, 1, 1)
    num_days: int = 180
    num_cities: int = 32
    num_stores: int = 160
    num_products: int = 180
    num_customers: int = 3000
    num_orders: int = 4500
    target_order_lines: int = 10000
    target_inventory_rows: int = 4800
    random_seed: int = 42
    inventory_snapshot_days: int = 3


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

PRODUCT_CATALOG: Dict[str, Dict[str, object]] = {
    "thời trang": {
        "names": [
            "Áo thun", "Áo sơ mi", "Quần jeans", "Quần kaki", "Váy liền",
            "Chân váy", "Áo khoác", "Áo hoodie", "Đầm công sở", "Bộ mặc nhà",
            "Áo polo", "Quần short", "Áo len", "Áo chống nắng", "Jacket denim",
        ],
        "price_range": (129000, 899000),
        "weight_range": (0.15, 1.20),
        "sizes": ("S", "M", "L", "XL", "XXL"),
    },
    "phụ kiện": {
        "names": [
            "Túi xách", "Ví da", "Thắt lưng", "Mũ lưỡi trai", "Kính mát",
            "Khăn choàng", "Đồng hồ thời trang", "Bông tai", "Dây chuyền",
            "Vòng tay", "Ba lô mini", "Nón bucket", "Kẹp tóc", "Khẩu trang vải", "Bao điện thoại",
        ],
        "price_range": (49000, 699000),
        "weight_range": (0.05, 0.80),
        "sizes": ("Free", "Mini", "M", "L"),
    },
    "tiêu dùng": {
        "names": [
            "Bình nước", "Hộp đựng thực phẩm", "Khăn giấy", "Sữa tắm",
            "Dầu gội", "Nước rửa tay", "Bột giặt", "Nước lau sàn", "Kem đánh răng",
            "Bàn chải đánh răng", "Khăn mặt", "Túi rác", "Nước xả vải", "Nến thơm", "Ly giữ nhiệt",
        ],
        "price_range": (19000, 399000),
        "weight_range": (0.08, 3.50),
        "sizes": ("Nhỏ", "Vừa", "Lớn", "500ml", "1L", "2L"),
    },
}

PRODUCT_CATEGORY_WEIGHTS: Tuple[Tuple[str, int], ...] = (
    ("thời trang", 45),
    ("phụ kiện", 30),
    ("tiêu dùng", 25),
)

STORE_CATEGORY_PROFILE: Dict[str, Tuple[str, ...]] = {
    "fashion_heavy": ("thời trang", "phụ kiện"),
    "mixed": ("thời trang", "phụ kiện", "tiêu dùng"),
    "consumer_heavy": ("tiêu dùng", "phụ kiện"),
}


def decimal2(value: float | Decimal) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def connect(database_url: str):
    return psycopg.connect(database_url, autocommit=False)


def reset_tables(cur) -> None:
    cur.execute(f"TRUNCATE TABLE {SCHEMA}.fact_orderdetail CASCADE;")
    cur.execute(f"TRUNCATE TABLE {SCHEMA}.fact_inventory CASCADE;")
    cur.execute(f"TRUNCATE TABLE {SCHEMA}.dim_order CASCADE;")
    cur.execute(f"TRUNCATE TABLE {SCHEMA}.dim_customer CASCADE;")
    cur.execute(f"TRUNCATE TABLE {SCHEMA}.dim_store CASCADE;")
    cur.execute(f"TRUNCATE TABLE {SCHEMA}.dim_product CASCADE;")
    cur.execute(f"TRUNCATE TABLE {SCHEMA}.dim_time CASCADE;")
    cur.execute(f"TRUNCATE TABLE {SCHEMA}.dim_thanhpho CASCADE;")


def gen_dim_time(cfg: Config) -> List[Tuple[int, date, int, int]]:
    rows: List[Tuple[int, date, int, int]] = []
    for i in range(cfg.num_days):
        d = cfg.start_date + timedelta(days=i)
        rows.append((int(d.strftime("%Y%m%d")), d, d.month, d.year))
    return rows


def gen_dim_thanhpho(cfg: Config) -> List[Tuple[str, str, str]]:
    rows: List[Tuple[str, str, str]] = []
    city_data = list(CITY_REGION_DATA[:cfg.num_cities])
    if len(city_data) < cfg.num_cities:
        raise ValueError("Số thành phố yêu cầu lớn hơn danh sách cấu hình hiện có.")
    for i, (city_name, region, _weight) in enumerate(city_data, start=1):
        rows.append((f"TP{i:03d}", city_name, region))
    return rows


def _weighted_choice(rnd: random.Random, weighted_items: Sequence[Tuple[str, int]]) -> str:
    items = [x[0] for x in weighted_items]
    weights = [x[1] for x in weighted_items]
    return rnd.choices(items, weights=weights, k=1)[0]


def _make_product_name(base_name: str, rnd: random.Random) -> str:
    suffixes = ["Cao Cấp", "Basic", "Premium", "Urban", "Classic", "Summer", "Daily", "Comfort", "Modern", "Eco"]
    return f"{base_name} {rnd.choice(suffixes)}"


def gen_dim_product(cfg: Config, rnd: random.Random) -> List[Tuple[int, str, str, str, Decimal, Decimal]]:
    rows: List[Tuple[int, str, str, str, Decimal, Decimal]] = []
    category_cycle: List[str] = list(PRODUCT_CATALOG.keys())
    while len(category_cycle) < cfg.num_products:
        category_cycle.append(_weighted_choice(rnd, PRODUCT_CATEGORY_WEIGHTS))
    rnd.shuffle(category_cycle)

    for i in range(1, cfg.num_products + 1):
        category = category_cycle[i - 1]
        catalog = PRODUCT_CATALOG[category]
        base_name = rnd.choice(catalog["names"])
        mota = f"{_make_product_name(base_name, rnd)} - nhóm {category}"
        kichco = rnd.choice(catalog["sizes"])
        weight_low, weight_high = catalog["weight_range"]
        price_low, price_high = catalog["price_range"]

        trongluong = decimal2(round(rnd.uniform(weight_low, weight_high), 2))
        gia_raw = rnd.randint(price_low // 1000, price_high // 1000) * 1000
        gia = decimal2(gia_raw)
        rows.append((i, f"MH{i:04d}", mota, kichco, trongluong, gia))
    return rows


def _build_city_weights(cities: Sequence[Tuple[str, str, str]]) -> Dict[str, int]:
    name_to_weight = {name: weight for name, _, weight in CITY_REGION_DATA}
    result: Dict[str, int] = {}
    for code, city_name, _region in cities:
        result[code] = name_to_weight.get(city_name, 1)
    return result


def gen_dim_customer(cfg: Config, cities: Sequence[Tuple[str, str, str]], rnd: random.Random, fake: Faker) -> List[Tuple[int, str, str, str, bool, bool]]:
    rows: List[Tuple[int, str, str, str, bool, bool]] = []
    city_codes = [c[0] for c in cities]
    city_weights_map = _build_city_weights(cities)
    city_weights = [city_weights_map[c] for c in city_codes]

    for i in range(1, cfg.num_customers + 1):
        makh = f"KH{i:05d}"
        tenkh = fake.name()
        mathanhpho = rnd.choices(city_codes, weights=city_weights, k=1)[0]

        roll = i % 20
        if roll in (0, 1, 2, 3, 4, 5):
            iskhdulich = True
            iskhbuudien = False
        elif roll in (6, 7, 8, 9, 10, 11):
            iskhdulich = False
            iskhbuudien = True
        elif roll in (12, 13, 14):
            iskhdulich = True
            iskhbuudien = True
        else:
            iskhdulich = False
            iskhbuudien = False

        rows.append((i, makh, tenkh, mathanhpho, iskhdulich, iskhbuudien))

    return rows


def _vn_phone_number(rnd: random.Random) -> str:
    prefixes = (
        "32", "33", "34", "35", "36", "37", "38", "39",
        "70", "76", "77", "78", "79",
        "81", "82", "83", "84", "85",
        "88", "89",
        "90", "91", "93", "94", "96", "97", "98", "99",
    )
    prefix = rnd.choice(prefixes)
    tail = f"{rnd.randint(0, 9999999):07d}"
    return f"+84{prefix}{tail}"


def gen_dim_store(cfg: Config, cities: Sequence[Tuple[str, str, str]], rnd: random.Random) -> List[Tuple[int, str, str, str, str]]:
    rows: List[Tuple[int, str, str, str, str]] = []
    city_to_name = {c[0]: c[1] for c in cities}
    city_codes = [c[0] for c in cities]
    city_weights_map = _build_city_weights(cities)
    weights = [city_weights_map[c] for c in city_codes]

    store_counts = {c: 1 for c in city_codes}
    remaining = cfg.num_stores - len(city_codes)
    while remaining > 0:
        chosen_city = rnd.choices(city_codes, weights=weights, k=1)[0]
        store_counts[chosen_city] += 1
        remaining -= 1

    store_id = 1
    for city_code in city_codes:
        city_name = city_to_name[city_code]
        for _ in range(store_counts[city_code]):
            rows.append((store_id, f"CH{store_id:04d}", _vn_phone_number(rnd), city_code, f"Văn phòng đại diện {city_name}"))
            store_id += 1
    return rows


def gen_dim_order(cfg: Config) -> List[Tuple[int, str]]:
    return [(i, f"D{i:06d}") for i in range(1, cfg.num_orders + 1)]


def _store_product_plan(store_rows, product_rows, rnd: random.Random) -> Dict[int, List[int]]:
    fashion_products: List[int] = []
    accessories_products: List[int] = []
    consumer_products: List[int] = []
    for productkey, _mamh, mota, _size, _weight, _price in product_rows:
        if "thời trang" in mota:
            fashion_products.append(productkey)
        elif "phụ kiện" in mota:
            accessories_products.append(productkey)
        else:
            consumer_products.append(productkey)

    profiles = list(STORE_CATEGORY_PROFILE.keys())
    plan: Dict[int, List[int]] = {}
    for storekey, _macuahang, _phone, _city, _vp in store_rows:
        profile = rnd.choices(profiles, weights=[40, 35, 25], k=1)[0]
        categories = STORE_CATEGORY_PROFILE[profile]

        chosen: List[int] = []
        if "thời trang" in categories:
            chosen.extend(rnd.sample(fashion_products, k=min(rnd.randint(20, 35), len(fashion_products))))
        if "phụ kiện" in categories:
            chosen.extend(rnd.sample(accessories_products, k=min(rnd.randint(10, 20), len(accessories_products))))
        if "tiêu dùng" in categories:
            chosen.extend(rnd.sample(consumer_products, k=min(rnd.randint(10, 25), len(consumer_products))))
        plan[storekey] = sorted(set(chosen))
    return plan


def gen_fact_orderdetail(cfg: Config, time_rows, customer_rows, product_rows, order_rows, rnd: random.Random) -> List[Tuple[int, int, int, int, int, Decimal]]:
    timekeys = [r[0] for r in time_rows]
    customers = [r[0] for r in customer_rows]
    customer_weights = []
    for _customerkey, _makh, _tenkh, _mathanhpho, iskhdulich, iskhbuudien in customer_rows:
        w = 1.0
        if iskhdulich:
            w += 0.2
        if iskhbuudien:
            w += 0.2
        customer_weights.append(w)

    products = [(r[0], r[5]) for r in product_rows]
    rows: List[Tuple[int, int, int, int, int, Decimal]] = []
    used = set()

    remaining_lines = cfg.target_order_lines
    line_counts: List[int] = []
    for idx in range(cfg.num_orders):
        orders_left = cfg.num_orders - idx
        min_remaining = orders_left - 1
        if idx < int(cfg.num_orders * 0.55):
            line_count = 2
        elif idx < int(cfg.num_orders * 0.85):
            line_count = 3
        else:
            line_count = 1
        max_allowed = max(1, remaining_lines - min_remaining)
        line_count = min(line_count, max_allowed)
        line_counts.append(line_count)
        remaining_lines -= line_count

    i = 0
    while remaining_lines > 0:
        if line_counts[i] < 5:
            line_counts[i] += 1
            remaining_lines -= 1
        i = (i + 1) % cfg.num_orders

    for (orderkey, _madon), line_count in zip(order_rows, line_counts):
        customerkey = rnd.choices(customers, weights=customer_weights, k=1)[0]
        timekey = rnd.choice(timekeys)
        chosen_products = rnd.sample(products, k=min(line_count, len(products)))
        for productkey, unit_price in chosen_products:
            pk = (timekey, orderkey, customerkey, productkey)
            if pk in used:
                continue
            used.add(pk)
            soluong = rnd.randint(1, 4)
            tongtien = decimal2(unit_price * soluong)
            rows.append((timekey, orderkey, customerkey, productkey, soluong, tongtien))
    return rows


def gen_fact_inventory(cfg: Config, time_rows, store_rows, product_rows, rnd: random.Random) -> List[Tuple[int, int, int, int]]:
    selected_timekeys = [r[0] for r in time_rows[:cfg.inventory_snapshot_days]]
    store_plan = _store_product_plan(store_rows, product_rows, rnd)
    rows: List[Tuple[int, int, int, int]] = []
    for timekey in selected_timekeys:
        for storekey, _macuahang, _phone, _city, _vp in store_rows:
            for productkey in store_plan[storekey]:
                rows.append((timekey, storekey, productkey, rnd.randint(0, 150)))

    if len(rows) > cfg.target_inventory_rows:
        rows = rnd.sample(rows, cfg.target_inventory_rows)
    return rows


def insert_many(cur, sql: str, rows: Iterable[Tuple]) -> None:
    with cur.copy(sql) as copy:
        for row in rows:
            copy.write_row(row)


def seed_all(conn, cfg: Config) -> None:
    rnd = random.Random(cfg.random_seed)
    fake = Faker("vi_VN")
    fake.seed_instance(cfg.random_seed)

    time_rows = gen_dim_time(cfg)
    city_rows = gen_dim_thanhpho(cfg)
    product_rows = gen_dim_product(cfg, rnd)
    customer_rows = gen_dim_customer(cfg, city_rows, rnd, fake)
    store_rows = gen_dim_store(cfg, city_rows, rnd)
    order_rows = gen_dim_order(cfg)
    order_fact_rows = gen_fact_orderdetail(cfg, time_rows, customer_rows, product_rows, order_rows, rnd)
    inventory_fact_rows = gen_fact_inventory(cfg, time_rows, store_rows, product_rows, rnd)

    with conn.cursor() as cur:
        insert_many(cur, f"COPY {SCHEMA}.dim_time (timekey, ngay, thang, nam) FROM STDIN", time_rows)
        insert_many(cur, f"COPY {SCHEMA}.dim_thanhpho (mathanhpho, tenthanhpho, bang) FROM STDIN", city_rows)
        insert_many(cur, f"COPY {SCHEMA}.dim_product (productkey, mamh, mota, kichco, trongluong, gia) FROM STDIN", product_rows)
        insert_many(cur, f"COPY {SCHEMA}.dim_customer (customerkey, makh, tenkh, mathanhpho, iskhdulich, iskhbuudien) FROM STDIN", customer_rows)
        insert_many(cur, f"COPY {SCHEMA}.dim_store (storekey, macuahang, sodienthoai, mathanhpho, diachivp) FROM STDIN", store_rows)
        insert_many(cur, f"COPY {SCHEMA}.dim_order (orderkey, madon) FROM STDIN", order_rows)
        insert_many(cur, f"COPY {SCHEMA}.fact_orderdetail (timekey, orderkey, customerkey, productkey, soluongdat, tongtien) FROM STDIN", order_fact_rows)
        insert_many(cur, f"COPY {SCHEMA}.fact_inventory (timekey, storekey, productkey, soluongtonkho) FROM STDIN", inventory_fact_rows)

    conn.commit()
    print("[OK] Seed hoàn tất.")
    print(f"  dim_time         : {len(time_rows):>8}")
    print(f"  dim_thanhpho     : {len(city_rows):>8}")
    print(f"  dim_product      : {len(product_rows):>8}")
    print(f"  dim_customer     : {len(customer_rows):>8}")
    print(f"  dim_store        : {len(store_rows):>8}")
    print(f"  dim_order        : {len(order_rows):>8}")
    print(f"  fact_orderdetail : {len(order_fact_rows):>8}")
    print(f"  fact_inventory   : {len(inventory_fact_rows):>8}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sinh dữ liệu ảo cho DW.")
    parser.add_argument("--mode", choices=("seed", "reset-and-seed"), default="seed")
    parser.add_argument("--num-days", type=int, default=180)
    parser.add_argument("--num-cities", type=int, default=32)
    parser.add_argument("--num-stores", type=int, default=160)
    parser.add_argument("--num-products", type=int, default=180)
    parser.add_argument("--num-customers", type=int, default=3000)
    parser.add_argument("--num-orders", type=int, default=4500)
    parser.add_argument("--target-order-lines", type=int, default=10000)
    parser.add_argument("--target-inventory-rows", type=int, default=4800)
    parser.add_argument("--inventory-snapshot-days", type=int, default=3)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    cfg = Config(
        num_days=args.num_days,
        num_cities=args.num_cities,
        num_stores=args.num_stores,
        num_products=args.num_products,
        num_customers=args.num_customers,
        num_orders=args.num_orders,
        target_order_lines=args.target_order_lines,
        target_inventory_rows=args.target_inventory_rows,
        inventory_snapshot_days=args.inventory_snapshot_days,
        random_seed=args.seed,
    )

    database_url = DATABASE_URL
    print(f"Dang ket noi toi: {SAFE_DATABASE_URL}")

    try:
        with connect(database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT to_regclass('{SCHEMA}.dim_time'),
                           to_regclass('{SCHEMA}.dim_product'),
                           to_regclass('{SCHEMA}.dim_order'),
                           to_regclass('{SCHEMA}.dim_thanhpho'),
                           to_regclass('{SCHEMA}.dim_customer'),
                           to_regclass('{SCHEMA}.dim_store'),
                           to_regclass('{SCHEMA}.fact_orderdetail'),
                           to_regclass('{SCHEMA}.fact_inventory');
                    """
                )
                regs = cur.fetchone()
                if any(x is None for x in regs):
                    raise RuntimeError("Schema DW chưa được tạo đầy đủ. Hãy chạy build_dw.py --mode schema trước.")

            if args.mode == "reset-and-seed":
                with conn.cursor() as cur:
                    print("Dang xoa du lieu cu trong DW...")
                    reset_tables(cur)
                conn.commit()

            seed_all(conn, cfg)

    except Exception as exc:
        print(f"[ERROR] {exc}")
        raise


if __name__ == "__main__":
    main()
