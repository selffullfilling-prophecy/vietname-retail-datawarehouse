# 1) tạo file .env từ .env.example
# 2) chạy SQL Server container
docker compose up -d

# 3) tạo schema DW
python build_dw.py --mode schema

# 4) seed dữ liệu
python seed_dw.py --mode reset-and-seed
