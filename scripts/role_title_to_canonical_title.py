import csv
import re
from collections import defaultdict

INPUT_CSV = "C:\\Users\\kaleb\\Downloads\\wispy-block-33237869_production_neondb_2026-01-21_18-04-57.csv"

CANONICAL_RULES = {
    # Software / Dev roles
    "Software Engineer": [
        "software engineer",
        "senior software engineer",
        "software developer",
        "full stack engineer",
        "fullstack engineer",
        "frontend developer",
        "front end entry level",
        "back end developer",
        "embedded software engineer",
        "python developer",
        "java developer",
        "dotnet developer",
        "developer",
    ],
    "Data Scientist": [
        "data scientist",
    ],
    "Data Engineer": [
        "data engineer",
        "senior data engineer",
    ],
    "DevOps Engineer": [
        "devops engineer",
        "site reliability engineer",
        "sre",
        "platform engineer",
    ],
    "IT Support Specialist": [
        "it support",
        "technical support",
        "desktop support",
        "desktop support technician",
        "desktop support specialist",
    ],
    "Data Analyst": [
        "data analyst",
    ],

    # Product / Project Management
    "Product Manager": [
        "product manager",
        "technical product manager",
        "senior product manager",
        "product owner",
        "program manager",
    ],
    "Project Manager": [
        "project manager",
        "senior project manager",
        "assistant project manager",
        "technical project manager",
        "project coordinator",
        "construction project manager",
        "construction manager",
        "test development project manager",
    ],

    # Nurses / Healthcare
    "Registered Nurse": [
        "registered nurse",
        "registered nurse - rn - ltac",
        "registered nurse (rn)",
        "hospice registered nurse",
        "med-surg registered nurse",
        "telemetry registered nurse",
        "travel rn - med surg",
    ],
    "Licensed Practical Nurse": [
        "licensed practical nurse",
        "licensed practical nurse (lpn)",
        "lpn licensed practical nurse",
        "nurse - lpn - ltc",
    ],
    "Certified Nursing Assistant": [
        "certified nursing assistant",
        "certified nursing assistant (cna)",
        "certified nursing assistant - oak forest health & rehab center",
    ],
    "CRNA": [
        "crna",
        "crna - prn",
        "certified registered nurse anesthetist",
        "crna intern",
        "anesthesiology crna",
        "crna locum tenens",
        "chief crna",
        "per diem pediatric crna",
        "student crna / anesthesia",
    ],
    "Registered Behavior Technician": [
        "registered behavior technician",
        "behavior technician",
    ],
    "Physical Therapist": [
        "physical therapist",
        "physical therapist (pt)",
    ],
    "Occupational Therapist": [
        "occupational therapist",
    ],
    "Licensed Therapist": [
        "licensed therapist for online counseling",
    ],

    # Finance / Accounting
    "Accountant": [
        "accountant",
        "staff accountant",
        "senior accountant",
    ],
    "Controller": [
        "controller",
        "assistant controller",
    ],
    "Financial Analyst": [
        "financial analyst",
        "senior financial analyst",
    ],
    "Financial Advisor": [
        "financial advisor",
        "us experienced financial advisor",
    ],
    "Accounting Manager": [
        "accounting manager",
    ],
    "Bookkeeper": [
        "bookkeeper",
    ],
    "Accounts Payable Specialist": [
        "accounts payable specialist",
    ],
    "Accounts Receivable Specialist": [
        "accounts receivable specialist",
    ],
    "Accounting Clerk": [
        "accounting clerk",
    ],
    "Tax Manager": [
        "tax manager",
    ],
    "Finance Manager": [
        "finance manager",
    ],
    "Financial Controller": [
        "financial controller",
    ],

    # Sales / Business Development
    "Sales Manager": [
        "sales manager",
        "regional sales manager",
        "territory sales manager",
        "sales director",
        "area sales manager",
    ],
    "Account Executive": [
        "account executive",
        "account manager",
        "senior account executive",
        "sales executive",
        "sales representative",
        "sales associate",
        "sales specialist",
        "sales consultant",
        "business development manager",
        "business development representative",
        "business development specialist",
        "relationship banker",
        "global account manager",
        "sales account manager",
        "lead sales associate",
    ],

    # Admin / Assistant roles
    "Administrative Assistant": [
        "administrative assistant",
        "executive assistant",
        "executive administrative assistant",
    ],
    "Office Manager": [
        "office manager",
        "office administrator",
    ],
    "Assistant Manager": [
        "assistant manager",
        "assistant store manager",
        "assistant store manager - spirit",
        "assistant general manager",
    ],
    "Team Member": [
        "team member",
        "team member (full time & part time storewide opportunities)",
    ],
    "Intern": [
        "intern",
        "graduate program",
    ],
    "Administrative Coordinator": [
        "administrative coordinator",
    ],

    # Technical / Engineering
    "Electrical Engineer": [
        "electrical engineer",
        "senior electrical engineer",
    ],
    "Mechanical Engineer": [
        "mechanical engineer",
        "senior mechanical engineer",
    ],
    "Manufacturing Engineer": [
        "manufacturing engineer",
    ],
    "Quality Engineer": [
        "quality engineer",
    ],
    "Process Engineer": [
        "process engineer",
    ],
    "Structural Engineer": [
        "structural engineer",
    ],
    "Design Engineer": [
        "design engineer",
    ],
    "Controls Engineer": [
        "controls engineer",
    ],
    "Production Engineer": [
        "production engineer",
    ],
    "Automation Engineer": [
        "automation engineer",
    ],
    "Engineering Manager": [
        "engineering manager",
    ],
    "Mechanical Design Engineer": [
        "mechanical design engineer",
    ],

    # Operations / Warehouse / Logistics
    "Operations Manager": [
        "operations manager",
        "general manager",
    ],
    "Store Manager": [
        "store manager",
        "store manager - spencer's",
        "store manager - spirit",
    ],
    "Warehouse Supervisor": [
        "warehouse supervisor",
    ],
    "Warehouse Manager": [
        "warehouse manager",
    ],
    "Warehouse Associate": [
        "warehouse associate",
        "warehouse worker",
        "warehouse part time overnight",
    ],
    "Material Handler": [
        "material handler",
    ],
    "Delivery Driver": [
        "delivery driver",
        "delivery specialist",
        "cdl a local delivery truck driver",
    ],
    "Package Handler": [
        "package handler - part time (warehouse like)",
        "package handler (warehouse like)",
    ],
    "Forklift Operator": [
        "forklift operator",
    ],
    "Auto Body / Mechanic": [
        "auto body technician",
        "mechanic",
        "automotive technician",
    ],

    # Customer Service / Retail
    "Customer Service Representative": [
        "customer service representative",
        "customer service rep",
        "customer service specialist",
    ],
    "Retail Sales Associate": [
        "retail sales associate",
        "retail sales – part time",
        "retail sales and store support",
        "retail sales print & marketing associate",
        "sales associate sunglass hut",
        "sales associate - spirit",
        "in-store shopper - part time seasonal",
        "store assistant, full time",
    ],

    # Food / Hospitality
    "Cook": [
        "cook",
        "line cook",
    ],
    "Bartender": [
        "bartender",
    ],
    "Deli Associate": [
        "deli production team member",
        "deli associate",
    ],
    "Housekeeper": [
        "housekeeper",
        "seasonal piecework housekeeper",
    ],
    "Restaurant Manager": [
        "restaurant manager",
    ],
    
    # Marketing / Design
    "Marketing Manager": [
        "marketing manager",
        "marketing coordinator",
        "marketing assistant",
        "marketing intern",
        "marketing specialist",
        "marketing director",
    ],
    "Graphic Designer": [
        "graphic designer",
    ],
    "Copywriter": [
        "copywriter",
    ],

    # Legal
    "Attorney": [
        "attorney",
    ],
    "Paralegal": [
        "paralegal",
        "litigation paralegal",
        "litigation associate",
        "associate team leader",
    ],
}

def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower().strip())

def find_canonical(title: str) -> str | None:
    for canonical, patterns in CANONICAL_RULES.items():
        for p in patterns:
            if p in title:
                return canonical
    return None

canonical_roles = set()
role_aliases = []

with open(INPUT_CSV, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        title = normalize(row["normalized_title"])
        count = int(row["job_count"])

        canonical = find_canonical(title)

        if canonical:
            canonical_roles.add(canonical)
            role_aliases.append({
                "canonical_name": canonical,
                "alias": title,
                "job_count": count,
            })

# Write canonical_roles.csv
with open("canonical_roles.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["canonical_name"])
    writer.writeheader()
    for role in sorted(canonical_roles):
        writer.writerow({"canonical_name": role})

# Write role_aliases.csv
with open("role_aliases.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=["canonical_name", "alias", "job_count"]
    )
    writer.writeheader()
    for row in role_aliases:
        writer.writerow(row)

print("✅ Canonicalization complete")
print(f"Roles created: {len(canonical_roles)}")
print(f"Aliases mapped: {len(role_aliases)}")
