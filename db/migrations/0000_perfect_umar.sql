CREATE TABLE "benefits" (
	"job_id" text PRIMARY KEY NOT NULL,
	"inferred" text NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"company_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"company_size" text,
	"state" text,
	"country" text,
	"city" text,
	"zip_code" text,
	"address" text,
	"url" text
);
--> statement-breakpoint
CREATE TABLE "company_industries" (
	"company_id" text NOT NULL,
	"industry" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_specialties" (
	"company_id" text NOT NULL,
	"specialty" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_counts" (
	"company_id" text PRIMARY KEY NOT NULL,
	"employee_count" integer PRIMARY KEY NOT NULL,
	"follower_count" integer NOT NULL,
	"time_recorded" timestamp PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "industries" (
	"industry_id" text PRIMARY KEY NOT NULL,
	"industry_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_industries" (
	"job_id" text NOT NULL,
	"industry_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_skills" (
	"job_id" text NOT NULL,
	"skill_abr" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postings" (
	"job_id" text PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"max_salary" integer,
	"pay_period" text,
	"location" text,
	"company_id" text NOT NULL,
	"views" integer,
	"med_salary" integer,
	"min_salary" integer,
	"formatted_work_type" text,
	"applies" integer,
	"original_listed_time" timestamp,
	"remote_allowed" boolean,
	"job_posting_url" text NOT NULL,
	"application_url" text,
	"application_type" text,
	"expiry" timestamp,
	"closed_time" timestamp,
	"formatted_experience_level" text,
	"skills_desc" text,
	"listed_time" timestamp NOT NULL,
	"posting_domain" text,
	"sponsored" boolean,
	"work_type" text,
	"currency" text,
	"compensation_type" text,
	"normalized_salary" integer,
	"zip_code" text,
	"fips" text
);
--> statement-breakpoint
CREATE TABLE "salaries" (
	"salary_id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"max_salary" integer,
	"med_salary" integer,
	"min_salary" integer,
	"pay_period" text,
	"currency" text,
	"compensation_type" text
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"skill_abr" text PRIMARY KEY NOT NULL,
	"skill_name" text NOT NULL
);
