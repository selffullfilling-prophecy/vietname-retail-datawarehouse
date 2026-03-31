# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A SQL Server-based data warehouse (DW) for retail sales and inventory, with Vietnamese-language domain terms. The project uses a star schema under the `dw` SQL Server schema, with Docker for the database and Python scripts for schema management and data seeding.

## Commands

```bash
# Start SQL Server (Docker)
docker compose up -d

# Create/recreate the DW schema (drops and recreates dw.*)
python build_dw.py --mode schema

# Seed with synthetic data (requires schema to exist first)
python seed_dw.py --mode reset-and-seed

# Seed without deleting existing data
python seed_dw.py --mode seed
```

Python venv: `venv_dw/`. Activate before running scripts. Dependencies: `pip install -r requirements.txt`.

Requires ODBC Driver 18 for SQL Server installed on the host machine.

## Architecture

**Star schema** in SQL Server schema `dw`:
- **Dimensions**: `dim_time` (monthly grain, timekey=YYYYMM), `dim_product`, `dim_customer`, `dim_store`
- **Facts**: `fact_sale` (composite PK: productkey+timekey+storekey+customerkey), `fact_inventory_snapshot` (monthly snapshot per store-product)

**Key business rules** (enforced in schema and seed logic):
- Customers must be at least one of: du lich (travel) or buu dien (postal) — `ck_customer_subtype` constraint
- Sales only occur for products a store actually stocks (store-product relationship built in `build_store_product_map`)
- Inventory decreases by sold quantity each month; never goes below zero

**Key files**:
- `build_dw.py` — DDL: drops and recreates the `dw` schema with all tables, constraints, and indexes. Also ensures the database exists via `master` connection.
- `seed_dw.py` — Generates deterministic fake data (seed=42) using Faker(vi_VN) and pyodbc `fast_executemany`. All generation params are CLI-configurable.
- `db_config.py` — Loads connection config from `.env`, exports `CONNECTION_STRING` (pyodbc format) and `SAFE_DATABASE_URL`. Uses `sa` user.
- `docker-compose.yml` — SQL Server 2022 container on port from `MSSQL_PORT` env var.

**Data seeding flow** (`seed_dw.py`): dimensions are generated first, then `build_store_product_map` creates the store-product stocking relationship, then `fact_sale` rows are generated respecting that map, then `fact_inventory_snapshot` is derived from initial stock minus cumulative monthly sales.

## Environment

Requires `.env` file (see `.env.example`). Key vars: `SA_PASSWORD`, `MSSQL_HOST`, `MSSQL_PORT`, `MSSQL_DB`, `MSSQL_SCHEMA`, `MSSQL_DRIVER`.

SA_PASSWORD must meet SQL Server complexity requirements (uppercase, lowercase, digit, special char, min 8 chars).
