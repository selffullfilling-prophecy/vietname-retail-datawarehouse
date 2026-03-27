# 1) tạo file .env từ .env.example
# 2) build và chạy postgres
docker compose up -d --build

# 3) tạo schema DW
python build_dw.py --mode schema

# 4) seed dữ liệu
python seed_dw.py --mode reset-and-seed