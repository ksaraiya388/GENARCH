"""Compute strength and confidence using documented scoring rules."""

from __future__ import annotations

from typing import Any


# GWAS p-value tier scoring
GWAS_P_THRESHOLD_STRONG = 5e-8  # 0.4
GWAS_P_THRESHOLD_SUGGESTIVE = 1e-5  # 0.2
LITERATURE_ONLY = 0.1

# Bonuses (capped so total <= 1.0)
REPLICATION_BONUS = 0.2
EQTL_BONUS = 0.15
IN_VITRO_BONUS = 0.10
IN_VIVO_BONUS = 0.15
HUMAN_TISSUE_BONUS = 0.20
MULTI_ANCESTRY_BONUS = 0.10


def score_gwas_tier(gwas_p: float | None) -> float:
    """GWAS p-value tier: p < 5e-8 = 0.4; p < 1e-5 suggestive = 0.2; literature only = 0.1."""
    if gwas_p is None:
        return LITERATURE_ONLY
    try:
        p = float(gwas_p)
    except (TypeError, ValueError):
        return LITERATURE_ONLY
    if p < GWAS_P_THRESHOLD_STRONG:
        return 0.4
    if p < GWAS_P_THRESHOLD_SUGGESTIVE:
        return 0.2
    return LITERATURE_ONLY


def score_replication(replication_status: str | None) -> float:
    """Replication: replicated = +0.2."""
    if not replication_status:
        return 0.0
    s = str(replication_status).strip().lower()
    if "replicat" in s or s == "yes" or s == "true":
        return REPLICATION_BONUS
    return 0.0


def score_functional_validation(evidence: str | None, evidence_type: str | None) -> float:
    """Functional validation: eQTL = +0.15; in vitro = +0.10; in vivo = +0.15; human tissue = +0.20."""
    bonus = 0.0
    ev = (evidence or "") + " " + (evidence_type or "")
    ev_lower = ev.lower()
    if "eqtl" in ev_lower or "eqtl" == (evidence_type or "").lower():
        bonus = max(bonus, EQTL_BONUS)
    if "in vitro" in ev_lower or "invitro" in ev_lower:
        bonus = max(bonus, IN_VITRO_BONUS)
    if "in vivo" in ev_lower or "invivo" in ev_lower:
        bonus = max(bonus, IN_VIVO_BONUS)
    if "human tissue" in ev_lower or "human" in ev_lower and "tissue" in ev_lower:
        bonus = max(bonus, HUMAN_TISSUE_BONUS)
    return bonus


def score_multi_ancestry(ancestry_composition: str | None) -> float:
    """Multi-ancestry: non-European majority = +0.10."""
    if not ancestry_composition:
        return 0.0
    s = str(ancestry_composition).strip().lower()
    if "european" in s and "majority" not in s and "non" not in s:
        return 0.0
    if "multi" in s or "diverse" in s or "non-european" in s:
        return MULTI_ANCESTRY_BONUS
    return 0.0


def score_locus(locus: dict[str, Any]) -> float:
    """Compute strength for a single TopLocus. Cap at 1.0."""
    base = score_gwas_tier(locus.get("gwas_p"))
    base += score_replication(locus.get("replication_status"))
    base += score_functional_validation(
        locus.get("evidence"),
        locus.get("evidence"),
    )
    base += score_multi_ancestry(locus.get("ancestry_composition"))
    return min(1.0, round(base, 2))


def confidence_from_strength_and_evidence(
    strength: float,
    evidence_types: set[str],
) -> str:
    """
    Confidence rules:
    - HIGH: strength >= 0.7 AND >= 2 evidence types
    - MEDIUM: 0.4-0.69 OR only 1 evidence type at >= 0.7
    - LOW: < 0.4 OR single literature source
    """
    if strength >= 0.7 and len(evidence_types) >= 2:
        return "high"
    if strength >= 0.7 and len(evidence_types) == 1:
        return "medium"
    if 0.4 <= strength < 0.7:
        return "medium"
    if strength < 0.4:
        return "low"
    if evidence_types == {"literature"} or len(evidence_types) == 0:
        return "low"
    return "medium"


def score_locus_with_confidence(locus: dict[str, Any]) -> tuple[float, str]:
    """Compute strength and confidence for a locus."""
    strength = score_locus(locus)
    ev = str(locus.get("evidence", "literature")).strip()
    evidence_types = {ev} if ev else {"literature"}
    confidence = confidence_from_strength_and_evidence(strength, evidence_types)
    return strength, confidence


def apply_scores_to_locus(locus: dict[str, Any]) -> dict[str, Any]:
    """Apply computed strength to locus; optionally set confidence if not present."""
    out = dict(locus)
    strength, confidence = score_locus_with_confidence(locus)
    out["strength"] = strength
    if "confidence" not in out or not out["confidence"]:
        out["confidence"] = confidence
    return out


def apply_scores_to_exposure_modifier(mod: dict[str, Any]) -> dict[str, Any]:
    """Ensure exposure modifier has valid strength/confidence (use defaults if missing)."""
    out = dict(mod)
    s = out.get("strength")
    if s is None:
        out["strength"] = 0.5
    else:
        out["strength"] = max(0.0, min(1.0, float(s)))
    c = out.get("confidence")
    if not c or str(c).lower() not in ("low", "medium", "high"):
        out["confidence"] = "medium"
    return out


def score_all(annotated: dict[str, Any]) -> dict[str, Any]:
    """Apply scoring to all entities."""
    out: dict[str, Any] = {}
    out["diseases"] = []
    for d in annotated.get("diseases", []):
        nd = dict(d)
        arch = nd.get("genetic_architecture") or {}
        if isinstance(arch, dict):
            arch = dict(arch)
            loci = arch.get("top_loci") or []
            arch["top_loci"] = [
                apply_scores_to_locus(l) for l in loci if isinstance(l, dict)
            ]
            nd["genetic_architecture"] = arch
        mods = nd.get("exposure_modifiers") or []
        nd["exposure_modifiers"] = [
            apply_scores_to_exposure_modifier(m) for m in mods if isinstance(m, dict)
        ]
        out["diseases"].append(nd)

    out["exposures"] = annotated.get("exposures", [])
    out["genes"] = annotated.get("genes", [])
    out["pathways"] = annotated.get("pathways", [])
    out["variants"] = annotated.get("variants", [])
    out["tissues"] = annotated.get("tissues", [])
    out["citations"] = annotated.get("citations", [])

    return out
