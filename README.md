# Vietnam Retail Data Warehouse

Repo nay gom 3 phan chinh:

- `data/`: script Python de tao schema, seed du lieu va test Data Warehouse tren SQL Server
- `apps/analytics-api/`: API ASP.NET Core doc du lieu phan tich tu SSAS
- `apps/web/`: frontend React + Vite de hien thi dashboard phan tich

## Kien truc chay local

Luong chay cua du an:

1. Docker chay `SQL Server`
2. Python tao schema DW va seed du lieu vao database
3. SSAS tren may Windows doc du lieu tu DW va deploy catalog/cube
4. API `.NET` query `SSAS`
5. Frontend React goi API de hien thi dashboard

Neu chi can dung va kiem tra Data Warehouse, ban chi can chay phan `SQL Server + Python`.

Neu muon chay full dashboard, ban can them `SSAS` da duoc deploy san tren may.

## Yeu cau moi truong

Can cai san:

- Docker Desktop
- Python 3.12
- Node.js 18+ va npm
- .NET SDK 8.0
- ODBC Driver 18 for SQL Server
- SQL Server Analysis Services (SSAS) neu muon chay API/dashboard

## Cau hinh bien moi truong

Tao file `.env` tu `.env.example`.

Luu y quan trong:

- `docker-compose.yml` doc bien `MSSQL_SA_PASSWORD`
- script Python doc bien `SA_PASSWORD`

De tranh loi, hay dat ca hai bien cung mot gia tri.

Vi du:

```env
SA_PASSWORD=YourStr0ng!Passw0rd
MSSQL_SA_PASSWORD=YourStr0ng!Passw0rd
MSSQL_HOST=localhost
MSSQL_PORT=1433
MSSQL_DB=datawarehouse
MSSQL_SCHEMA=dw
MSSQL_DRIVER=ODBC Driver 18 for SQL Server
SQLSERVER_PORT=1433
```

## 1. Khoi dong SQL Server bang Docker

Tai thu muc goc repo, chay:

```powershell
docker compose up -d
```

Mac dinh container SQL Server se mo cong `1433`.

Kiem tra container:

```powershell
docker ps
```

## 2. Tao virtual environment va cai Python dependencies

Neu chua co moi truong ao:

```powershell
python -m venv venv_dw
```

Kich hoat virtual environment:

```powershell
.\venv_dw\Scripts\Activate.ps1
```

Cai thu vien:

```powershell
pip install -r requirements.txt
```

## 3. Tao schema Data Warehouse

Script tao database neu chua ton tai, xoa schema cu va tao lai bang/index:

```powershell
python .\data\build_dw.py --mode schema
```

Sau khi chay xong, schema mac dinh la `dw` trong database `datawarehouse`.

## 4. Seed du lieu mau

Seed lai toan bo du lieu:

```powershell
python .\data\seed_dw.py --mode reset-and-seed
```

Thong so mac dinh hien tai:

- 2 nam du lieu bat dau tu `2024`
- 160 cua hang
- 180 mat hang
- 3000 khach hang

Neu muon seed voi quy mo khac:

```powershell
python .\data\seed_dw.py --mode reset-and-seed --num-stores 50 --num-products 80 --num-customers 500
```

## 5. Kiem tra du lieu DW

Repo co 2 cach kiem tra:

### Cach 1: Chay bo query test tong hop

```powershell
python .\run_tests.py
```

Ket qua se duoc ghi ra file `test_dw_results.txt`.

### Cach 2: Chay business test report

```powershell
python .\data\test_dw_business.py
```

Ket qua se duoc ghi ra file `data\test_dw_business_report.txt`.

## 6. Chay API Analytics (.NET + SSAS)

Phan nay chi chay duoc khi may da co `SSAS` va da deploy catalog/cube.

API doc cau hinh tai:

- `apps/analytics-api/src/Analytics.Api/appsettings.json`
- `apps/analytics-api/src/Analytics.Api/appsettings.Development.json`

Gia tri development hien co:

```json
{
  "Ssas": {
    "DataSource": "localhost",
    "Catalog": "RetailAnalytics_SSAS",
    "Cube": "Retail Analytics Cube"
  }
}
```

Neu may cua ban khac, hay sua `DataSource`, `Catalog`, va `Cube` cho dung voi instance SSAS local. Co the override bang bien moi truong `SSAS_SERVER`, `SSAS_CATALOG`, va `SSAS_CUBE`.

Chay API:

```powershell
cd .\apps\analytics-api\src\Analytics.Api
dotnet restore
dotnet run
```

API mac dinh chay tai:

- `http://localhost:5056`
- Swagger: `http://localhost:5056/swagger`

Health check:

- `http://localhost:5056/api/health`
- SSAS smoke test: `http://localhost:5056/api/metadata/smoke-test`

## 7. Chay frontend React

Mo terminal moi:

```powershell
cd .\apps\web
npm install
```

Tao file `.env` trong `apps/web` neu muon doi API URL:

```env
VITE_API_BASE_URL=http://localhost:5056
```

Neu khong tao file nay, frontend van mac dinh goi `http://localhost:5056`.

Chay frontend:

```powershell
npm run dev
```

Sau do mo dia chi do Vite in ra man hinh, thuong la:

- `http://localhost:5173`

## Thu tu chay full local

Neu muon chay tu dau den cuoi, thu tu nen la:

1. Tao `.env`
2. `docker compose up -d`
3. Kich hoat `venv_dw`
4. `pip install -r requirements.txt`
5. `python .\data\build_dw.py --mode schema`
6. `python .\data\seed_dw.py --mode reset-and-seed`
7. Deploy/process cube len `SSAS`
8. `dotnet run` trong `apps/analytics-api/src/Analytics.Api`
9. `npm run dev` trong `apps/web`

## Mot so loi thuong gap

### Docker len nhung Python ket noi SQL Server that bai

Kiem tra:

- container da chay chua
- cong `1433` co bi trung khong
- `.env` da co `SA_PASSWORD` dung chua
- may da cai `ODBC Driver 18 for SQL Server` chua

### Docker compose khong tao duoc SQL Server

Thuong do thieu `MSSQL_SA_PASSWORD`. Hay chac rang `.env` co ca:

- `SA_PASSWORD`
- `MSSQL_SA_PASSWORD`

### API chay len nhung query SSAS loi

Kiem tra:

- `Ssas:DataSource` dung ten instance SSAS chua
- `Ssas:Catalog` dung ten catalog da deploy chua
- `Ssas:Cube` dung ten cube da deploy chua
- cube da process xong chua
- tai khoan Windows hien tai co quyen truy cap SSAS chua

### Frontend len nhung khong co du lieu

Kiem tra:

- API dang chay tai `http://localhost:5056`
- frontend dang goi dung `VITE_API_BASE_URL`
- swagger co tra ve du lieu o `/api/health`, `/api/metadata/overview` hay khong

## Cau truc thu muc

```text
.
|-- data/
|   |-- build_dw.py
|   |-- seed_dw.py
|   `-- test_dw_business.py
|-- apps/
|   |-- analytics-api/
|   `-- web/
|-- db_config.py
|-- docker-compose.yml
|-- requirements.txt
`-- run_tests.py
```

## Ghi chu

- Phan DW hien tai dung SQL Server container, con SSAS duoc thiet ke de chay tren may Windows host.
- Dashboard frontend va API khong doc truc tiep SQL Server; chung doc du lieu tu SSAS.
- Neu ban chi can demo phan Data Warehouse, co the bo qua `apps/analytics-api` va `apps/web`.
