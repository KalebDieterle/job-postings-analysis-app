import os
import re
import psycopg2
import csv
from psycopg2 import sql

DB_HOST = "localhost"
DB_NAME = "labor_market"
DB_USER = "postgres"
DB_PASSWORD = ""
DB_PORT = "5432"

def connect_to_db():
    """Establish a connection to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT
        )
        print("Connection to database established.")
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None
    

def sanitize_column(name: str) -> str:
    """Sanitize CSV header into a safe SQL identifier (lowercase, underscores).

    Ensures the name doesn't start with a digit and replaces unsafe chars.
    """
    name = (name or '').strip()
    name = name.replace(' ', '_')
    name = re.sub(r'[^0-9a-zA-Z_]', '_', name)
    if re.match(r'^[0-9]', name):
        name = '_' + name
    return name.lower() or 'col'


def ensure_table_for_csv(path: str, table: str, cur):
    """Create a table named `table` if it doesn't exist, using the CSV header
    to define TEXT columns in the same order.
    """
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if not header:
            raise ValueError(f"CSV file {path} is empty or has no header")

        cols = []
        seen = {}
        for raw in header:
            col = sanitize_column(raw)
            base = col
            i = 1
            while col in seen:
                col = f"{base}_{i}"
                i += 1
            seen[col] = True
            cols.append(col)

    # Check if table exists
    cur.execute("SELECT to_regclass(%s)", (table,))
    if cur.fetchone()[0]:
        return

    # Build CREATE TABLE statement with TEXT columns preserving order
    col_defs = [sql.SQL("{} text").format(sql.Identifier(c)) for c in cols]
    create_sql = sql.SQL('CREATE TABLE {} (').format(sql.Identifier(table)) + sql.SQL(', ').join(col_defs) + sql.SQL(')')
    cur.execute(create_sql)


def ingest_data(root_dir='.'):
    """Recursively find CSV files under `root_dir` and load each into a table
    whose name is the CSV filename (without extension) using PostgreSQL COPY.
    """
    conn = connect_to_db()
    if conn is None:
        return

    try:
        cur = conn.cursor()

        for dirpath, dirnames, filenames in os.walk(root_dir):
            for fname in filenames:
                if not fname.lower().endswith('.csv'):
                    continue

                path = os.path.join(dirpath, fname)
                table = os.path.splitext(fname)[0]

                print(f"Loading {path} into table '{table}'...")
                try:
                    # Ensure table exists with columns inferred from CSV header
                    ensure_table_for_csv(path, table, cur)

                    with open(path, 'r', encoding='utf-8') as f:
                        copy_sql = sql.SQL("COPY {} FROM STDIN WITH CSV HEADER").format(
                            sql.Identifier(table)
                        )
                        cur.copy_expert(copy_sql.as_string(conn), f)
                    conn.commit()
                    print(f"Successfully loaded {path} -> {table}")
                except Exception as e:
                    conn.rollback()
                    print(f"Failed to load {path} into {table}: {e}")

        cur.close()
    finally:
        conn.close()


if __name__ == '__main__':
    # Run ingestion from current working directory by default
    ingest_data('.')


def sanitize_column(name: str) -> str:
    """Sanitize CSV header into a safe SQL identifier (lowercase, underscores).

    Ensures the name doesn't start with a digit and replaces unsafe chars.
    """
    name = (name or '').strip()
    name = name.replace(' ', '_')
    name = re.sub(r'[^0-9a-zA-Z_]', '_', name)
    if re.match(r'^[0-9]', name):
        name = '_' + name
    return name.lower() or 'col'


def ensure_table_for_csv(path: str, table: str, cur):
    """Create a table named `table` if it doesn't exist, using the CSV header
    to define TEXT columns in the same order.
    """
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if not header:
            raise ValueError(f"CSV file {path} is empty or has no header")

        cols = []
        seen = {}
        for raw in header:
            col = sanitize_column(raw)
            base = col
            i = 1
            while col in seen:
                col = f"{base}_{i}"
                i += 1
            seen[col] = True
            cols.append(col)

    # Check if table exists
    cur.execute("SELECT to_regclass(%s)", (table,))
    if cur.fetchone()[0]:
        return

    # Build CREATE TABLE statement with TEXT columns preserving order
    col_defs = [sql.SQL("{} text").format(sql.Identifier(c)) for c in cols]
    create_sql = sql.SQL('CREATE TABLE {} (').format(sql.Identifier(table)) + sql.SQL(', ').join(col_defs) + sql.SQL(')')
    cur.execute(create_sql)