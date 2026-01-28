import { pgTable, text, integer, boolean, timestamp, index, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const benefits = pgTable("benefits", {
    job_id: text("job_id").notNull().primaryKey(),
    inferred: text("inferred").notNull(),
    type: text("type").notNull(),
});

export const companies = pgTable("companies", {
  company_id: text("company_id").notNull().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  company_size: text("company_size"),
  state: text("state"),
  country: text("country"),
  city: text("city"),
  zip_code: text("zip_code"),
  address: text("address"),
  url: text("url"),
});

export const company_industries = pgTable("company_industries", {
    company_id: text("company_id").notNull(),
    industry: text("industry").notNull(),
});

export const company_specialties = pgTable("company_specialties", {
    company_id: text("company_id").notNull(),
    specialty: text("specialty").notNull(),
});

export const employee_counts = pgTable("employee_counts", {
    company_id: text("company_id").notNull().primaryKey(),
    employee_count: integer("employee_count").notNull().primaryKey(),
    follower_count: integer("follower_count").notNull(),
    time_recorded: timestamp("time_recorded").notNull().primaryKey(),
});

export const industries = pgTable("industries", {
    industry_id: text("industry_id").notNull().primaryKey(),
    industry_name: text("industry_name").notNull(),
});

export const job_industries = pgTable("job_industries", {
    job_id: text("job_id").notNull(),
    industry_id: text("industry_id").notNull(),
});

export const job_skills = pgTable("job_skills", {
    job_id: text("job_id").notNull(),
    skill_abr: text("skill_abr").notNull(),
});

export const postings = pgTable("postings", {
  job_id: text("job_id").notNull().primaryKey(),
  company_name: text("company_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  max_salary: integer("max_salary"),
  yearly_max_salary: integer("yearly_max_salary"),
  pay_period: text("pay_period"),
  location: text("location"),
  company_id: text("company_id").notNull(),
  views: integer("views"),
  med_salary: integer("med_salary"),
  yearly_med_salary: integer("yearly_med_salary"),
  min_salary: integer("min_salary"),
  yearly_min_salary: integer("yearly_min_salary"),
  formatted_work_type: text("formatted_work_type"),
  applies: integer("applies"),
  original_listed_time: timestamp("original_listed_time"),
  remote_allowed: boolean("remote_allowed"),
  job_posting_url: text("job_posting_url").notNull(),
  application_url: text("application_url"),
  application_type: text("application_type"),
  expiry: timestamp("expiry"),
  closed_time: timestamp("closed_time"),
  formatted_experience_level: text("formatted_experience_level"),
  skills_desc: text("skills_desc"),
  listed_time: timestamp("listed_time").notNull(),
  posting_domain: text("posting_domain")  ,
  sponsored: boolean("sponsored"),
  work_type: text("work_type"),
  currency: text("currency"),
  compensation_type: text("compensation_type"),
  normalized_salary: integer("normalized_salary"),
  zip_code: text("zip_code"),
  fips: text("fips"),
});

export const salaries = pgTable("salaries", {
    salary_id: text("salary_id").notNull().primaryKey(),
    job_id: text("job_id").notNull(),
    max_salary: integer("max_salary"),
    med_salary: integer("med_salary"),
    min_salary: integer("min_salary"),
    pay_period: text("pay_period"),
    currency: text("currency"),
    compensation_type: text("compensation_type"),
});

export const skills = pgTable("skills", {
    skill_abr: text("skill_abr").notNull().primaryKey(),
    skill_name: text("skill_name").notNull(),
});

// Create relations
// Relations
export const postingsRelations = relations(postings, ({ one, many }) => ({
    company: one(companies, {
        fields: [postings.company_id],
        references: [companies.company_id],
    }),
    job_industries: many(job_industries),
    job_skills: many(job_skills),
    salaries: many(salaries),
    benefits: one(benefits, {
        fields: [postings.job_id],
        references: [benefits.job_id],
    }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
    postings: many(postings),
    company_industries: many(company_industries),
    company_specialties: many(company_specialties),
    employee_counts: many(employee_counts),
}));

export const industriesRelations = relations(industries, ({ many }) => ({
    company_industries: many(company_industries),
    job_industries: many(job_industries),
}));

export const skillsRelations = relations(skills, ({ many }) => ({
    job_skills: many(job_skills),
}));

export const jobIndustriesRelations = relations(job_industries, ({ one }) => ({
    posting: one(postings, {
        fields: [job_industries.job_id],
        references: [postings.job_id],
    }),
    industry: one(industries, {
        fields: [job_industries.industry_id],
        references: [industries.industry_id],
    }),
}));

export const jobSkillsRelations = relations(job_skills, ({ one }) => ({
    posting: one(postings, {
        fields: [job_skills.job_id],
        references: [postings.job_id],
    }),
    skill: one(skills, {
        fields: [job_skills.skill_abr],
        references: [skills.skill_abr],
    }),
}));

export const companyIndustriesRelations = relations(company_industries, ({ one }) => ({
    company: one(companies, {
        fields: [company_industries.company_id],
        references: [companies.company_id],
    }),
    industry: one(industries, {
        fields: [company_industries.industry],
        references: [industries.industry_id],
    }),
}));

export const companySpecialtiesRelations = relations(company_specialties, ({ one }) => ({
    company: one(companies, {
        fields: [company_specialties.company_id],
        references: [companies.company_id],
    }),
}));

export const employeeCountsRelations = relations(employee_counts, ({ one }) => ({
    company: one(companies, {
        fields: [employee_counts.company_id],
        references: [companies.company_id],
    }),
}));

export const roleAliases = pgTable('role_aliases', {
  id: serial('id').primaryKey(),
  canonical_name: text('canonical_name').notNull(),
  alias: text('alias').notNull(),
  job_count: integer('job_count').default(0),
}, (table) => ({
  aliasIdx: index('role_aliases_alias_idx').on(table.alias),
  canonicalIdx: index('role_aliases_canonical_idx').on(table.canonical_name),
}));

export const top_companies = pgTable('top_companies', {
    id: serial('id').primaryKey(),
    fortune_rank: integer('fortune_rank').notNull(),
    revenue_m: text('revenue_m').notNull(), // numeric in DB, use text for compatibility or use decimal if supported
    profit_m: text('profit_m').notNull(), // numeric in DB, use text for compatibility or use decimal if supported
    market_value_m: text('market_value_m').notNull(), // numeric in DB, use text for compatibility or use decimal if supported
    year: integer('year').notNull(),
    name: text('name').notNull(),
    hq_state: text('hq_state').notNull(),
    industry: text('industry').notNull(),
    sector: text('sector').notNull(),
    hq_city: text('hq_city').notNull(),
});