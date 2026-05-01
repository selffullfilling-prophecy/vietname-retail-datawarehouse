# OLAP Design and Indexing Plan

## Ket luan ngan

Voi schema hien tai, khong nen tao rat nhieu cube. Nen tao:

1. `RetailAnalyticsCube`: cube chinh, gom 2 measure group: `Sales` va `Inventory`.
2. `SaleCube` va `InventoryCube`: chi giu tam thoi neu can tuong thich voi API hien tai.

Sau khi API duoc doi sang cube chinh, muc tieu nen la 1 cube chinh + nhieu perspectives, khong phai nhieu cube.

## Muc dich cua OLAP

OLAP khong chi la "tao nhieu cube". Muc dich dung hon:

- gom cac measure theo business process;
- cho phep drill down, roll up, slice/dice, pivot theo hierarchy;
- tinh aggregate nhanh hon truy van SQL lap di lap lai;
- tao semantic layer co ten goi than thien hon bang/cot vat ly;
- quan ly partition, aggregation, KPI, calculation va security o lop phan tich.

## Mo hinh cube de xuat

### 1. RetailAnalyticsCube

Measure groups:

- `Sales`
  - source: `dw.fact_sale`
  - measures:
    - `Sales Amount` = SUM(`tongtien`)
    - `Sales Quantity` = SUM(`soluongban`)
    - `Sales Row Count` = COUNT rows
    - calculated: `Average Unit Price` = `Sales Amount` / `Sales Quantity`
- `Inventory`
  - source: `dw.fact_inventory_snapshot`
  - measures:
    - `Inventory Quantity` = SUM or AVG depending on dashboard semantics
    - `Inventory Snapshot Count` = COUNT rows
    - calculated: `Average Inventory`

Shared dimensions:

- `Dim Time`: `Nam > Quy > Thang`
- `Dim Store`: `Bang > Thanhpho > Macuahang`
- `Dim Product`: `Mamh`
- `Dim Customer`: customer attributes and customer type

Dimension usage:

- `Sales` uses Time, Store, Product, Customer.
- `Inventory` uses Time, Store, Product.
- Customer should not be related to Inventory unless a later bridge/fact supports that relationship.

Perspectives:

- `Executive Overview`
- `Sales Analysis`
- `Inventory Analysis`
- `Store/Product Analysis`

### 2. Backward-compatible cubes

Neu API hien tai van query `[SaleCube]` va `[InventoryCube]`, co the giu 2 cube nay trong giai doan chuyen doi. Khong nen mo rong thanh nhieu cube chi vi co nhieu dashboard.

## Khi nao moi tao them cube

Tao cube rieng khi co it nhat mot dieu kien:

- nguon fact co grain khac xa va dimension usage khac nhieu;
- security khac nhau theo nhom nguoi dung;
- processing schedule khac nhau ro ret;
- cube qua lon va aggregation design/partition strategy khong the quan ly chung;
- subject area doc lap, vi du finance, HR, supply chain.

Voi repo hien tai chi co sales va inventory, 1 cube chinh la hop ly.

## Index phuc vu OLAP

### Lop 1: rowstore index cho load/processing co filter

Da dat trong `data/create_advanced_indexes.sql`:

- fact sales theo `timekey`, `storekey`, `productkey`
- fact sales theo `storekey`, `productkey`, `timekey`
- fact sales theo `customerkey`, `productkey`, `timekey`
- inventory theo `productkey`, `timekey`, `storekey`
- inventory theo `storekey`, `productkey`, `timekey`
- dimension hierarchy cho Time, Store, Customer

### Lop 2: nonclustered columnstore cho scan/aggregate lon

Dat trong `data/create_olap_indexes.sql`:

- `ncci_fact_sale_olap`
- `ncci_inventory_snapshot_olap`

Dung khi:

- SSAS processing phai scan nhieu dong fact;
- query aggregate lon tren SQL Server tang;
- fact table tang len hang trieu dong tro len.

Khong dung `UPDATE STATISTICS` truc tiep tren auto-created stats cua columnstore index. Neu reload lon, rebuild/recreate columnstore index thay vi update stats kieu rowstore.

## Partition de xuat cho SSAS

Partition theo nam cho tung measure group:

- Sales 2022, 2023, 2024, 2025
- Inventory 2022, 2023, 2024, 2025

Neu du lieu tang nhanh, partition theo thang cho nam hien tai va theo nam cho nam cu.

## Aggregation design de xuat

Uu tien aggregation theo cac duong drill hay dung:

- Time: Year, Quarter, Month
- Store: Region, City, Store
- Product: Product
- Customer: Customer Type, Customer

Khong tao aggregation cho moi combination. Bat dau voi aggregation theo Time + Store + Product, sau do do bang SSAS usage/log.

## Thu tu trien khai

1. Build schema.
2. Seed du lieu 2022-2025.
3. Chay `create_advanced_indexes.sql`.
4. Neu processing/query scan lon, chay `create_olap_indexes.sql`.
5. Tao `RetailAnalyticsCube` voi 2 measure group.
6. Tao perspectives thay vi tao them cube.
7. Partition measure group theo nam.
8. Process dimension truoc, process cube/partition sau.
9. Do thoi gian process va query MDX, sau do moi them/bot index.
