# DW Indexing Plan

## Muc tieu

Index trong du an duoc chia thanh 3 lop:

1. `build_dw.py`: tao schema va constraint. Cac index do `PRIMARY KEY` va `UNIQUE` sinh ra van ton tai, nhung khong tao manual index.
2. `create_advanced_indexes.sql`: tao rowstore index phuc vu query nghiep vu tren DW.
3. `create_olap_indexes.sql`: tao columnstore index tuy chon cho OLAP/SSAS processing.

## Vi sao bo 3 index cu

Ba index sau la thua:

- `idx_dim_product_mamh`
- `idx_dim_customer_makh`
- `idx_dim_store_macuahang`

Ly do: cac cot `mamh`, `makh`, `macuahang` da co `UNIQUE`, SQL Server da tu tao unique index de enforce rang buoc. Tao them non-unique index tren cung mot cot lam ton them dung luong va chi phi load du lieu.

Khong drop unique constraint index. Chi drop cac index thu cong co ten `idx_*`.

## Thu tu chay khuyen nghi

```powershell
.\venv_dw\Scripts\python.exe .\data\build_dw.py --mode schema
.\venv_dw\Scripts\python.exe .\data\seed_dw_2022_2025.py --mode reset-and-seed
sqlcmd -S localhost,1433 -U sa -P "MAT_KHAU_SA_CUA_BAN" -C -d datawarehouse -i data\create_advanced_indexes.sql
```

Neu can toi uu them cho SSAS processing hoac query aggregate lon:

```powershell
sqlcmd -S localhost,1433 -U sa -P "MAT_KHAU_SA_CUA_BAN" -C -d datawarehouse -i data\create_olap_indexes.sql
```

## Nguyen tac drop index trung

Co the drop index cu neu index moi co cung leading key va cover cung workload.

Vi du:

- `idx_fact_sale_storekey` co key `(storekey)`
- `idx_fact_sale_store_product_time_cover` co key `(storekey, productkey, timekey)` va include measure

Index moi co the dung cho dieu kien `WHERE storekey = ...`, dong thoi tot hon cho query nhom theo store/product/time. Vi vay script drop index cu.

Khong drop index neu:

- no den tu `PRIMARY KEY`
- no den tu `UNIQUE`
- no co leading key khac va phuc vu query khac

## Cach do hieu qua

Chay truoc/sau voi query can test:

```sql
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

-- query can do

SET STATISTICS IO OFF;
SET STATISTICS TIME OFF;
```

Giu index neu `logical reads` hoac thoi gian giam ro. Drop index neu khong duoc dung va lam seed/load cham.
