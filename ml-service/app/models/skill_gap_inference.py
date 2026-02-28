import re

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from scipy.sparse import spmatrix

from app.schemas.skill_gap import SkillGapRequest, SkillGapResponse, SkillDetail


def _slugify(name: str) -> str:
    """Convert role name to URL slug."""
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"[\s-]+", "-", s)
    return s.strip("-")


def _find_role(target: str, role_index: list[str]) -> str | None:
    """Find a role by name or slug."""
    target_lower = target.lower().strip()
    target_slug = _slugify(target)
    for role in role_index:
        if role.lower() == target_lower or _slugify(role) == target_slug:
            return role
    return None


def _fuzzy_match(user_skill: str, tfidf_term: str) -> bool:
    """Check if user skill matches a TF-IDF term via containment."""
    user_lower = user_skill.lower().strip()
    term_lower = tfidf_term.lower().strip()
    return user_lower == term_lower or user_lower in term_lower or term_lower in user_lower


def analyze_skill_gap(
    req: SkillGapRequest,
    vectorizer: TfidfVectorizer,
    tfidf_matrix: spmatrix,
    role_index: list[str],
) -> SkillGapResponse:
    role_name = _find_role(req.target_role, role_index)
    if role_name is None:
        # Fall back to closest match
        role_name = role_index[0] if role_index else "Unknown"

    role_idx = role_index.index(role_name)
    feature_names = vectorizer.get_feature_names_out()

    # Get TF-IDF scores for this role
    row = tfidf_matrix[role_idx].toarray().flatten()
    top_indices = np.argsort(row)[::-1][:30]

    top_terms = [(feature_names[i], float(row[i])) for i in top_indices if row[i] > 0]

    if not top_terms:
        return SkillGapResponse(
            canonical_role=role_name,
            match_percentage=0.0,
            skills=[],
            learning_priority=[],
        )

    # Normalize importance scores to 0-1
    max_score = top_terms[0][1] if top_terms else 1.0

    # Classify each top term
    skills_result: list[SkillDetail] = []
    matched_count = 0
    gap_skills: list[tuple[str, float]] = []

    for term, score in top_terms:
        importance = round(score / max_score, 3)
        is_matched = any(_fuzzy_match(us, term) for us in req.current_skills)
        if is_matched:
            matched_count += 1
            status = "matched"
        else:
            status = "gap"
            gap_skills.append((term, importance))

        skills_result.append(SkillDetail(skill=term, importance=importance, status=status))

    # Check for bonus skills (user has but role doesn't emphasize)
    for us in req.current_skills:
        already_listed = any(_fuzzy_match(us, s.skill) for s in skills_result)
        if not already_listed:
            skills_result.append(SkillDetail(skill=us, importance=0.0, status="bonus"))

    match_pct = round((matched_count / len(top_terms)) * 100, 1) if top_terms else 0.0

    # Learning priority: gap skills sorted by importance descending
    learning_priority = [s for s, _ in sorted(gap_skills, key=lambda x: -x[1])]

    return SkillGapResponse(
        canonical_role=role_name,
        match_percentage=match_pct,
        skills=skills_result,
        learning_priority=learning_priority,
    )


def get_available_roles(role_index: list[str]) -> list[str]:
    return sorted(role_index)
