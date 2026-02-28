"""Export training data from the PostgreSQL database."""

import os
from pathlib import Path

import pandas as pd
import psycopg2
from dotenv import load_dotenv

TRAINING_DIR = Path(__file__).resolve().parent
ML_SERVICE_DIR = TRAINING_DIR.parent
REPO_ROOT = ML_SERVICE_DIR.parent

SALARY_FILTER_SQL = """
    p.yearly_min_salary IS NOT NULL
    AND p.yearly_min_salary BETWEEN 20000 AND 500000
    AND (
        p.yearly_max_salary IS NULL
        OR (
            p.yearly_max_salary BETWEEN 20000 AND 500000
            AND p.yearly_max_salary >= p.yearly_min_salary
        )
    )
"""


def _load_env_files() -> None:
    # Load common env file locations regardless of current working directory.
    for env_file in (
        ML_SERVICE_DIR / ".env",
        ML_SERVICE_DIR / ".env.local",
        REPO_ROOT / ".env.local",
    ):
        if env_file.exists():
            load_dotenv(env_file, override=False)


def get_connection():
    _load_env_files()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError(
            "DATABASE_URL not set. Add it to ml-service/.env, "
            "ml-service/.env.local, or repo .env.local"
        )
    return psycopg2.connect(database_url)


def export_salary_data() -> pd.DataFrame:
    """Export denormalized salary training data."""
    query = f"""
    WITH latest_employee_counts AS (
        SELECT DISTINCT ON (ec.company_id)
            ec.company_id,
            ec.employee_count
        FROM employee_counts ec
        ORDER BY ec.company_id, ec.time_recorded DESC
    ),
    company_posting_counts AS (
        SELECT
            p2.company_id,
            COUNT(*) AS company_posting_count
        FROM postings p2
        GROUP BY p2.company_id
    )
    SELECT
        COALESCE(LOWER(ra.canonical_name), LOWER(p.title)) AS canonical_title,
        p.location,
        p.country,
        p.formatted_experience_level,
        p.formatted_work_type,
        p.remote_allowed,
        p.yearly_min_salary,
        p.yearly_max_salary,
        p.description,
        c.city AS company_city,
        c.state AS company_state,
        MAX(lec.employee_count) AS employee_count,
        MAX(COALESCE(cpc.company_posting_count, 0)) AS company_posting_count,
        ARRAY_AGG(DISTINCT js.skill_abr) FILTER (WHERE js.skill_abr IS NOT NULL) AS skills,
        ARRAY_AGG(DISTINCT ji.industry_id) FILTER (WHERE ji.industry_id IS NOT NULL) AS industries
    FROM postings p
    LEFT JOIN role_aliases ra ON LOWER(p.title) = LOWER(ra.alias)
    LEFT JOIN companies c ON p.company_id = c.company_id
    LEFT JOIN latest_employee_counts lec ON lec.company_id = p.company_id
    LEFT JOIN company_posting_counts cpc ON cpc.company_id = p.company_id
    LEFT JOIN job_skills js ON p.job_id = js.job_id
    LEFT JOIN job_industries ji ON p.job_id = ji.job_id
    WHERE {SALARY_FILTER_SQL}
    GROUP BY p.job_id, p.title, p.location, p.country,
             p.formatted_experience_level, p.formatted_work_type,
             p.remote_allowed, p.yearly_min_salary, p.yearly_max_salary,
             p.description, c.city, c.state, p.company_id,
             ra.canonical_name
    """
    conn = get_connection()
    try:
        df = pd.read_sql(query, conn)
        print(f"Exported {len(df)} salary training rows")
        return df
    finally:
        conn.close()


def export_salary_skill_vocab() -> pd.DataFrame:
    """Export salary-model skill vocabulary (abbr + label + freq)."""
    query = f"""
    SELECT
        js.skill_abr AS skill_abr,
        COALESCE(s.skill_name, js.skill_abr) AS skill_name,
        COUNT(*) AS freq
    FROM postings p
    JOIN job_skills js ON p.job_id = js.job_id
    LEFT JOIN skills s ON s.skill_abr = js.skill_abr
    WHERE {SALARY_FILTER_SQL}
      AND js.skill_abr IS NOT NULL
    GROUP BY js.skill_abr, s.skill_name
    ORDER BY COUNT(*) DESC
    """
    conn = get_connection()
    try:
        df = pd.read_sql(query, conn)
        print(f"Exported {len(df)} salary skill vocabulary entries")
        return df
    finally:
        conn.close()


def export_tfidf_data() -> pd.DataFrame:
    """Export descriptions grouped by canonical role for TF-IDF."""
    query = """
    SELECT
        COALESCE(LOWER(ra.canonical_name), LOWER(p.title)) AS canonical_title,
        STRING_AGG(p.description, ' ') AS combined_description,
        COUNT(*) AS posting_count
    FROM postings p
    LEFT JOIN role_aliases ra ON LOWER(p.title) = LOWER(ra.alias)
    WHERE p.description IS NOT NULL
      AND LENGTH(p.description) > 100
    GROUP BY COALESCE(LOWER(ra.canonical_name), LOWER(p.title))
    HAVING COUNT(*) >= 3
    ORDER BY COUNT(*) DESC
    """
    conn = get_connection()
    try:
        df = pd.read_sql(query, conn)
        print(f"Exported {len(df)} roles for TF-IDF")
        return df
    finally:
        conn.close()


def export_skill_vectors() -> pd.DataFrame:
    """Export skill multi-hot vectors per canonical role for clustering."""
    query = """
    SELECT
        COALESCE(LOWER(ra.canonical_name), LOWER(p.title)) AS canonical_title,
        js.skill_abr,
        COUNT(*) AS freq
    FROM postings p
    LEFT JOIN role_aliases ra ON LOWER(p.title) = LOWER(ra.alias)
    JOIN job_skills js ON p.job_id = js.job_id
    GROUP BY COALESCE(LOWER(ra.canonical_name), LOWER(p.title)), js.skill_abr
    """
    conn = get_connection()
    try:
        df = pd.read_sql(query, conn)
        print(f"Exported {len(df)} role-skill pairs")
        return df
    finally:
        conn.close()


if __name__ == "__main__":
    salary_df = export_salary_data()
    print(f"Salary data shape: {salary_df.shape}")
    print(f"Salary range: ${salary_df['yearly_min_salary'].min():,.0f} - ${salary_df['yearly_min_salary'].max():,.0f}")

    tfidf_df = export_tfidf_data()
    print(f"TF-IDF data shape: {tfidf_df.shape}")

    skill_df = export_skill_vectors()
    print(f"Skill vector data shape: {skill_df.shape}")
