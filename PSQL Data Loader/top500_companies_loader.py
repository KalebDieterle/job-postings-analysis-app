import os
import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

# =========================
# ENV / CONFIG
# =========================
load_dotenv(".env.local")

CSV_PATH = "PSQL Data Loader/fortune_500_companies.csv"

DATABASE_URL = os.getenv("DATABASE_URL")

# Fallback if DATABASE_URL not set
DB_CONFIG = {
    "host": os.getenv("PGHOST"),
    "dbname": os.getenv("PGDATABASE"),
    "user": os.getenv("PGUSER"),
    "password": os.getenv("PGPASSWORD"),
    "port": os.getenv("PGPORT", 5432),
    "sslmode": "require",
}

# =========================
# LOAD CSV
# =========================
df = pd.read_csv(CSV_PATH)

# Normalize column names
df.columns = [
    c.strip().lower()
     .replace(" ", "_")
     .replace("(", "")
     .replace(")", "")
     .replace("$", "")
     .replace("%", "")
    for c in df.columns
]

# =========================
# SAFELY FIND REQUIRED COLUMNS
# =========================
def find_col(possible):
    for p in possible:
        for c in df.columns:
            if p == c or p in c:
                return c
    raise KeyError(f"Missing expected column: {possible}")

company_col = find_col(["company", "name", "name_of_business"])
rank_col = find_col(["rank", "fortune_rank"])
year_col = find_col(["year"])
industry_col = find_col(["industry"])
sector_col = find_col(["sector"])
city_col = find_col(["hq_city", "city"])
state_col = find_col(["hq_state", "state"])
revenue_col = find_col(["revenue"])
profit_col = find_col(["profit"])
market_col = find_col(["market_value", "market"])

# =========================
# FILTER TO MOST RECENT YEAR
# =========================
latest_year = int(df[year_col].max())
df = df[df[year_col] == latest_year]

# Deduplicate by company
df = df.drop_duplicates(subset=[company_col])

# Ensure numeric types
df[revenue_col] = pd.to_numeric(df[revenue_col], errors='coerce')
df[profit_col] = pd.to_numeric(df[profit_col], errors='coerce')
df[market_col] = pd.to_numeric(df[market_col], errors='coerce')

# =========================
# CONNECT TO NEON
# =========================
if DATABASE_URL:
    conn = psycopg2.connect(DATABASE_URL)
else:
    conn = psycopg2.connect(**DB_CONFIG)

cur = conn.cursor()

# =========================
# UPSERT QUERY
# =========================
insert_sql = """
INSERT INTO top_companies (
    name,
    fortune_rank,
    industry,
    sector,
    hq_city,
    hq_state,
    revenue_m,
    profit_m,
    market_value_m,
    year
)
VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
ON CONFLICT (name) DO UPDATE SET
    fortune_rank = EXCLUDED.fortune_rank,
    industry = EXCLUDED.industry,
    sector = EXCLUDED.sector,
    hq_city = EXCLUDED.hq_city,
    hq_state = EXCLUDED.hq_state,
    revenue_m = EXCLUDED.revenue_m,
    profit_m = EXCLUDED.profit_m,
    market_value_m = EXCLUDED.market_value_m,
    year = EXCLUDED.year;
"""

# =========================
# PREPARE ROWS AND BULK INSERT
# =========================
rows_to_insert = [
    (
        row.get(company_col),
        row.get(rank_col),
        row.get(industry_col),
        row.get(sector_col),
        row.get(city_col),
        row.get(state_col),
        row.get(revenue_col),
        row.get(profit_col),
        row.get(market_col),
        latest_year,
    )
    for _, row in df.iterrows()
]

execute_batch(cur, insert_sql, rows_to_insert, page_size=1000)
conn.commit()
cur.close()
conn.close()

print(f"✅ Imported {len(rows_to_insert)} Fortune 500 companies for year {latest_year} into Neon (top_companies)")
