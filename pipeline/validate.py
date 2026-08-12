"""Schema validation, cross-link validation, and citation validation."""

from __future__ import annotations

import csv
import datetime
import json
import re
import sys
from pathlib import Path

from pipeline.schemas import (
    CommunitySchema,
    DiseaseSchema,
    ExposureSchema,
    GeneSchema,
    GraphSchema,
    PathwaySchema,
)


def _resolve_data_dir() -> Path:
    """Resolve data directory relative to repo root."""
    root = Path(__file__).resolve().parent.parent
    return root / "data"


def _collect_json_files(data_dir: Path) -> dict[str, list[Path]]:
    """Collect JSON files by entity type (directory name)."""
    by_type: dict[str, list[Path]] = {}
    dirs = ["diseases", "exposures", "genes", "pathways", "community", "graph", "briefs", "reports"]
    for subdir in dirs:
        path = data_dir / subdir
        if path.exists():
            by_type[subdir] = sorted(path.rglob("*.json"))
    return by_type


def _schema_for_type(entity_type: str):
    """Return Pydantic schema for entity type."""
    schemas = {
        "diseases": DiseaseSchema,
        "exposures": ExposureSchema,
        "genes": GeneSchema,
        "pathways": PathwaySchema,
        "community": CommunitySchema,
        "graph": GraphSchema,
    }
    return schemas.get(entity_type)


def _validate_schema(
    entity_type: str,
    filepath: Path,
    raw: dict,
    errors: list[str],
) -> dict | None:
    """Validate JSON against Pydantic schema. Returns parsed model or None."""
    schema_cls = _schema_for_type(entity_type)
    if schema_cls is None:
        return raw  # briefs, reports - no strict schema
    try:
        return schema_cls.model_validate(raw).model_dump()
    except Exception as e:
        errors.append(f"{filepath}: Schema validation failed: {e}")
        return None


def _collect_slugs(data_dir: Path) -> dict[str, set[str]]:
    """Collect all slugs by entity type from JSON files."""
    slugs: dict[str, set[str]] = {
        "disease": set(),
        "exposure": set(),
        "gene": set(),
        "pathway": set(),
    }
    for subdir, slug_key in [
        ("diseases", "disease"),
        ("exposures", "exposure"),
        ("genes", "gene"),
        ("pathways", "pathway"),
    ]:
        path = data_dir / subdir
        if not path.exists():
            continue
        for f in path.rglob("*.json"):
            try:
                raw = json.loads(f.read_text(encoding="utf-8"))
                s = raw.get("slug") or raw.get("region_id")
                if s:
                    slugs[slug_key].add(s)
            except Exception:
                pass
    return slugs


def _collect_citation_ids(data_dir: Path) -> set[str]:
    """Collect all reference IDs from entity JSON files."""
    ref_ids: set[str] = set()
    for subdir in ["diseases", "exposures", "genes", "pathways", "community", "briefs"]:
        path = data_dir / subdir
        if not path.exists():
            continue
        for f in path.rglob("*.json"):
            try:
                raw = json.loads(f.read_text(encoding="utf-8"))
                for ref in raw.get("references", []):
                    if isinstance(ref, dict) and ref.get("id"):
                        ref_ids.add(str(ref["id"]))
            except Exception:
                pass
    return ref_ids


def _collect_referenced_slugs(data_dir: Path) -> dict[str, list[tuple[Path, str]]]:
    """Collect referenced slugs with (filepath, slug) for cross-link check."""
    refs: dict[str, list[tuple[Path, str]]] = {
        "disease": [],
        "exposure": [],
        "gene": [],
        "pathway": [],
    }

    def add_ref(typ: str, fp: Path, slug: str) -> None:
        if slug:
            refs[typ].append((fp, slug))

    for subdir in ["diseases", "exposures", "genes", "pathways", "community", "briefs"]:
        path = data_dir / subdir
        if not path.exists():
            continue
        for f in path.rglob("*.json"):
            try:
                raw = json.loads(f.read_text(encoding="utf-8"))
                for em in raw.get("exposure_modifiers", []):
                    add_ref("exposure", f, em.get("exposure_slug", ""))
                for gh in raw.get("gxe_highlights", []):
                    add_ref("gene", f, gh.get("gene_slug", ""))
                    add_ref("disease", f, gh.get("disease_slug", ""))
                for ld in raw.get("linked_diseases", []):
                    add_ref("disease", f, ld.get("disease_slug", ""))
                for le in raw.get("linked_exposures", []):
                    add_ref("exposure", f, le.get("exposure_slug", ""))
                for et in raw.get("environmental_triggers", []):
                    add_ref("exposure", f, et.get("exposure_slug", ""))
                for kg in raw.get("key_genes", []):
                    add_ref("gene", f, kg.get("gene_slug", ""))
                for hs in raw.get("health_stats", []):
                    add_ref("disease", f, hs.get("disease_slug", ""))
                for rpg in raw.get("related_genes", []):
                    add_ref("gene", f, rpg)
                if raw.get("related_disease"):
                    add_ref("disease", f, raw["related_disease"])
                if raw.get("related_exposure"):
                    add_ref("exposure", f, raw["related_exposure"])
                for rp in raw.get("related_pathways", []):
                    add_ref("pathway", f, rp)
                for pw in raw.get("pathways", []):
                    add_ref("pathway", f, pw)
            except Exception:
                pass
    return refs


def _collect_citation_refs(data_dir: Path) -> list[tuple[Path, str]]:
    """Collect all citation ID references (filepath, citation_id)."""
    refs: list[tuple[Path, str]] = []
    for subdir in ["diseases", "exposures", "genes", "pathways", "community", "briefs"]:
        path = data_dir / subdir
        if not path.exists():
            continue
        for f in path.rglob("*.json"):
            try:
                raw = json.loads(f.read_text(encoding="utf-8"))

                def collect_citations(obj: object) -> None:
                    if isinstance(obj, dict):
                        if "citations" in obj and isinstance(obj["citations"], list):
                            for c in obj["citations"]:
                                if isinstance(c, str) and c:
                                    refs.append((f, c))
                        for v in obj.values():
                            collect_citations(v)
                    elif isinstance(obj, list):
                        for v in obj:
                            collect_citations(v)

                collect_citations(raw)
            except Exception:
                pass
    return refs


def _iso_date_ok(value: object) -> bool:
    """True if value is a non-empty ISO date or datetime string."""
    if not isinstance(value, str) or not value:
        return False
    try:
        datetime.date.fromisoformat(value)
        return True
    except ValueError:
        try:
            datetime.datetime.fromisoformat(value)
            return True
        except ValueError:
            return False


def _validate_briefs(data_dir: Path, errors: list[str]) -> None:
    """Enforce the brief publication gate.

    Every brief must carry a boolean ``published``. A published brief must have a
    valid ISO ``published_at`` date; an unpublished brief must have
    ``published_at`` set to null. This makes publishing a data flag rather than a
    merge-time decision.
    """
    briefs_dir = data_dir / "briefs"
    if not briefs_dir.exists():
        return
    for fp in sorted(briefs_dir.rglob("*.json")):
        try:
            raw = json.loads(fp.read_text(encoding="utf-8"))
        except Exception as e:  # noqa: BLE001 - reported as a validation error
            errors.append(f"{fp}: Invalid JSON: {e}")
            continue
        published = raw.get("published")
        if not isinstance(published, bool):
            errors.append(f"{fp}: brief must have a boolean 'published' flag")
            continue
        published_at = raw.get("published_at")
        if published:
            if not _iso_date_ok(published_at):
                errors.append(
                    f"{fp}: published brief must have a valid ISO 'published_at' date"
                )
        elif published_at is not None:
            errors.append(f"{fp}: unpublished brief must have 'published_at': null")


_PLACEHOLDER_RE = re.compile(r"^ref\d+$")

# Surfaces created by this work package. Citation defects here are hard errors: the new
# pages may not ship with a placeholder citation under any circumstance. Pre-existing entity
# files warn instead, because a hard failure there would block every other fix in the package
# from shipping (and those files are read-only in this work package).
_NEW_SURFACES = ("community/data-center-alley.json", "sensors/")


def _is_new_surface(fp: Path) -> bool:
    posix = fp.as_posix()
    return any(marker in posix for marker in _NEW_SURFACES)


def _page_url_for(entity_type: str, slug: str) -> str:
    return {
        "disease": f"/atlas/diseases/{slug}",
        "exposure": f"/atlas/exposures/{slug}",
        "gene": f"/atlas/genes/{slug}",
        "pathway": f"/atlas/pathways/{slug}",
        "community": f"/community/{slug}",
        "brief": f"/mechanism-briefs/{slug}",
        "graph_edge": "/graph",
    }.get(entity_type, "/")


# Ordered so the highest-traffic pages come first: this file is a human work queue.
_TRAFFIC_ORDER = ["graph_edge", "community", "disease", "brief", "gene", "exposure", "pathway"]


def _collect_citation_gaps(data_dir: Path) -> list[dict[str, str]]:
    """Enumerate every uncited or under-cited assertion.

    gap_class:
      UNNAMESPACED_ID  file-local ^ref\\d+$ tokens that DO resolve to a real reference record
                       in the owning file. The defect is the missing namespace, not a missing
                       citation: `ref1` names a different paper in every file, so the token is
                       ambiguous the moment it leaves that file.
      PLACEHOLDER      resolves to a record carrying no DOI, no URL and no journal - an
                       unciteable stub. This is a genuine citation gap.
      EMPTY            sources absent or empty
      UNRESOLVED       sources reference an ID with no entry in the OWNING file's references
      ORPHAN           a references entry exists that no assertion in its file cites

    The UNNAMESPACED_ID / PLACEHOLDER split is load-bearing: the first is a mechanical rename,
    the second needs a human to go find a source. Collapsing them makes a nearly-complete
    citation set look like a wholesale gap, and misprices the remaining work.

    reference_grade records what the WEAKEST record an assertion cites actually carries:
      has_doi | url_only | journal_only | none | unnamespaced (owning file not derivable)
    """
    rows: list[dict[str, str]] = []

    def add(entity_type, slug, assertion_id, claim, ev, sources, gap_class, grade=""):
        rows.append({
            "entity_type": entity_type,
            "entity_slug": slug,
            "assertion_id": assertion_id,
            "claim_text": " ".join((claim or "").split())[:200],
            "evidence_type": ev or "",
            "current_sources": "|".join(sources or []),
            "gap_class": gap_class,
            "reference_grade": grade,
            "page_url": _page_url_for(entity_type, slug),
        })

    _GRADE_ORDER = ["none", "journal_only", "url_only", "has_doi"]

    def grade_of(sources: list[str], refs: dict) -> str:
        """Grade an assertion by the weakest record it cites."""
        grades = []
        for c in sources:
            r = refs.get(c)
            if r is None:
                return "none"
            if r.get("doi"):
                grades.append("has_doi")
            elif r.get("url"):
                grades.append("url_only")
            elif r.get("journal"):
                grades.append("journal_only")
            else:
                grades.append("none")
        return min(grades, key=_GRADE_ORDER.index) if grades else "none"

    def classify(sources: list[str], local_ids: set[str]) -> str | None:
        """UNRESOLVED outranks PLACEHOLDER.

        A token is resolved against its OWNING file, not a global pool. `ref3` cited in a file
        whose references stop at `ref2` is dangling, which is strictly worse than a
        placeholder that at least points at a real local record -- and the global-pool check
        used elsewhere in this validator cannot see it, because `ref3` exists in 50 other
        files meaning 50 different papers.
        """
        if not sources:
            return "EMPTY"
        external = ("PMID:", "doi:", "http")
        if any(
            s not in local_ids and not s.startswith(external)
            for s in sources
        ):
            return "UNRESOLVED"
        if all(_PLACEHOLDER_RE.match(s.strip()) for s in sources):
            # Resolves locally. Genuine PLACEHOLDER only if the record it resolves to is
            # itself unciteable; otherwise the defect is the missing namespace.
            return "UNNAMESPACED_ID"
        return None

    # --- graph edges ---
    graph_path = data_dir / "graph" / "graph.json"
    if graph_path.exists():
        graph = json.loads(graph_path.read_text(encoding="utf-8"))
        for e in graph.get("edges", []):
            attrs = e.get("attrs", {}) or {}
            srcs = attrs.get("sources") or []
            # Edge sources are file-local IDs copied without a namespace, so they cannot be
            # resolved against any single file. Only EMPTY and PLACEHOLDER are decidable.
            gap = "EMPTY" if not srcs else (
                "UNNAMESPACED_ID"
                if all(_PLACEHOLDER_RE.match(s.strip()) for s in srcs) else None
            )
            if gap:
                # An edge token cannot be graded: the committed artifact does not record
                # which file the citation was copied from, which is the whole defect.
                add("graph_edge", e.get("id", ""),
                    f'{e.get("source","")}->{e.get("target","")}',
                    f'{e.get("source","")} {e.get("type","")} {e.get("target","")}',
                    attrs.get("evidence_type", ""), srcs, gap,
                    "unnamespaced" if gap == "UNNAMESPACED_ID" else "")

    # --- entity files ---
    for subdir, etype in [("diseases", "disease"), ("exposures", "exposure"),
                          ("genes", "gene"), ("pathways", "pathway"),
                          ("community", "community"), ("briefs", "brief")]:
        path = data_dir / subdir
        if not path.exists():
            continue
        for fp in sorted(path.rglob("*.json")):
            try:
                raw = json.loads(fp.read_text(encoding="utf-8"))
            except Exception:  # noqa: BLE001 - reported elsewhere
                continue
            slug = raw.get("slug") or raw.get("region_id") or fp.stem
            local_ids = {r["id"] for r in raw.get("references", [])
                         if isinstance(r, dict) and r.get("id")}
            cited: set[str] = set()
            found: list[tuple[str, list[str], str, str]] = []

            def collect(obj, trail="$"):
                if isinstance(obj, dict):
                    if isinstance(obj.get("citations"), list):
                        cites = [c for c in obj["citations"] if isinstance(c, str)]
                        cited.update(cites)
                        label = (obj.get("mechanism_hypothesis") or obj.get("hypothesis")
                                 or obj.get("evidence") or obj.get("mechanism_summary")
                                 or obj.get("name") or obj.get("gene") or trail)
                        found.append((trail, cites, str(label),
                                      str(obj.get("evidence_type") or obj.get("evidence") or "")))
                    for k, v in obj.items():
                        collect(v, f"{trail}.{k}")
                elif isinstance(obj, list):
                    for i, v in enumerate(obj):
                        collect(v, f"{trail}[{i}]")

            collect(raw)
            refs_by_id = {r["id"]: r for r in raw.get("references", [])
                          if isinstance(r, dict) and r.get("id")}
            for trail, cites, label, ev in found:
                gap = classify(cites, local_ids)
                if not gap:
                    continue
                grade = grade_of(cites, refs_by_id)
                # A locally-resolving token whose record is an unciteable stub is a genuine
                # PLACEHOLDER, not merely an unnamespaced id.
                if gap == "UNNAMESPACED_ID" and grade == "none":
                    gap = "PLACEHOLDER"
                add(etype, slug, trail, label, ev, cites, gap, grade)
            for rid in sorted(local_ids - cited):
                ref = refs_by_id.get(rid, {})
                add(etype, slug, rid, ref.get("title", ""), "", [rid], "ORPHAN",
                    grade_of([rid], refs_by_id))

    rows.sort(key=lambda r: (
        _TRAFFIC_ORDER.index(r["entity_type"]) if r["entity_type"] in _TRAFFIC_ORDER else 99,
        r["entity_slug"], r["gap_class"], r["assertion_id"],
    ))
    return rows


def _write_citation_gaps(rows: list[dict[str, str]], out_path: Path) -> None:
    """Write the gap manifest deterministically. This file is a human work queue."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cols = ["entity_type", "entity_slug", "assertion_id", "claim_text",
            "evidence_type", "current_sources", "gap_class", "reference_grade", "page_url"]
    with out_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)


def _validate_citations(data_dir: Path, errors: list[str], warnings: list[str]) -> None:
    """Citation-integrity rules. Hard-fail on new surfaces, warn on pre-existing files."""
    rows = _collect_citation_gaps(data_dir)
    manifest = data_dir.parent / "docs" / "CITATION_GAPS.csv"
    _write_citation_gaps(rows, manifest)

    counts: dict[str, int] = {}
    for r in rows:
        counts[r["gap_class"]] = counts.get(r["gap_class"], 0) + 1

    # Rule 1: no placeholder token may ship on a surface created by this work package.
    for subdir in ["community", "sensors"]:
        path = data_dir / subdir
        if not path.exists():
            continue
        for fp in sorted(path.rglob("*.json")):
            if not _is_new_surface(fp):
                continue
            text = fp.read_text(encoding="utf-8")
            for tok in sorted(set(re.findall(r'"(ref\d+)"', text))):
                errors.append(
                    f"{fp}: placeholder citation '{tok}' on a surface created by this work "
                    f"package. New pages may not ship with placeholder citations."
                )

    # Rule 3: a reference record with no doi, no url and no journal cannot be looked up.
    for subdir in ["diseases", "exposures", "genes", "pathways", "community", "briefs"]:
        path = data_dir / subdir
        if not path.exists():
            continue
        for fp in sorted(path.rglob("*.json")):
            try:
                raw = json.loads(fp.read_text(encoding="utf-8"))
            except Exception:  # noqa: BLE001
                continue
            for ref in raw.get("references", []):
                if not isinstance(ref, dict):
                    continue
                if not ref.get("doi") and not ref.get("url") and not ref.get("journal"):
                    msg = (f"{fp}: reference '{ref.get('id')}' has no doi, no url and no "
                           f"journal - it cannot be looked up")
                    (errors if _is_new_surface(fp) else warnings).append(msg)

    # Rule 4: high/medium confidence with empty or placeholder-only sources.
    graph_path = data_dir / "graph" / "graph.json"
    if graph_path.exists():
        graph = json.loads(graph_path.read_text(encoding="utf-8"))
        bad = 0
        for e in graph.get("edges", []):
            attrs = e.get("attrs", {}) or {}
            if attrs.get("confidence") not in {"high", "medium"}:
                continue
            srcs = attrs.get("sources") or []
            if not srcs or all(_PLACEHOLDER_RE.match(s.strip()) for s in srcs):
                bad += 1
        if bad:
            warnings.append(
                f"graph.json: {bad} edge(s) assert high/medium confidence with empty or "
                f"placeholder-only sources. High confidence with no resolvable source is the "
                f"most damaging combination; see {manifest.name}"
            )

    summary = ", ".join(f"{k}={v}" for k, v in sorted(counts.items()))
    warnings.append(
        f"Citation gap manifest written to docs/{manifest.name} "
        f"({len(rows)} rows; {summary or 'none'})"
    )
    grades: dict[str, int] = {}
    for r in rows:
        if r["gap_class"] in {"UNNAMESPACED_ID", "PLACEHOLDER"}:
            grades[r["reference_grade"] or "(none)"] = (
                grades.get(r["reference_grade"] or "(none)", 0) + 1
            )
    if grades:
        warnings.append(
            "Reference grade of unnamespaced/placeholder assertions: "
            + ", ".join(f"{k}={v}" for k, v in sorted(grades.items()))
        )


def validate() -> int:
    """Run all validations. Returns 0 on success, 1 on any error."""
    data_dir = _resolve_data_dir()
    errors: list[str] = []

    if not data_dir.exists():
        errors.append(f"Data directory does not exist: {data_dir}")
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
        return 1

    # 1. Schema validation
    by_type = _collect_json_files(data_dir)
    parsed: dict[str, list[dict]] = {
        "diseases": [],
        "exposures": [],
        "genes": [],
        "pathways": [],
        "community": [],
        "graph": [],
    }

    for entity_type, files in by_type.items():
        for fp in files:
            try:
                raw = json.loads(fp.read_text(encoding="utf-8"))
            except json.JSONDecodeError as e:
                errors.append(f"{fp}: Invalid JSON: {e}")
                continue
            result = _validate_schema(entity_type, fp, raw, errors)
            if result is not None and entity_type in parsed:
                parsed[entity_type].append(result)

    # 2. Cross-link validation
    slugs = _collect_slugs(data_dir)
    ref_slugs = _collect_referenced_slugs(data_dir)

    warnings: list[str] = []
    for typ, ref_list in ref_slugs.items():
        valid = slugs.get(typ, set())
        for fp, slug in ref_list:
            if slug and slug not in valid:
                # Gene references from pathway key_genes are warnings (pathways may reference
                # genes that don't have standalone data files yet)
                if typ == "gene" and "pathways" in str(fp):
                    warnings.append(f"{fp}: Referenced {typ} slug '{slug}' has no data file (warning)")
                else:
                    errors.append(f"{fp}: Referenced {typ} slug '{slug}' does not exist")

    for w in warnings:
        print(f"WARNING: {w}", file=sys.stderr)

    # 3. Citation validation
    citation_ids = _collect_citation_ids(data_dir)
    citation_refs = _collect_citation_refs(data_dir)

    for fp, cid in citation_refs:
        if cid and cid not in citation_ids:
            # Allow PMID/DOI-style references
            if not (cid.startswith("PMID:") or cid.startswith("doi:") or cid.startswith("http")):
                errors.append(f"{fp}: Citation ID '{cid}' does not exist in references")

    # 4. Graph integrity: edge endpoints must exist as node IDs
    graph_path = data_dir / "graph" / "graph.json"
    if graph_path.exists():
        try:
            graph_raw = json.loads(graph_path.read_text(encoding="utf-8"))
            node_ids = {n["id"] for n in graph_raw.get("nodes", []) if isinstance(n, dict)}
            for edge in graph_raw.get("edges", []):
                if not isinstance(edge, dict):
                    continue
                src = edge.get("source", "")
                tgt = edge.get("target", "")
                if src and src not in node_ids:
                    errors.append(f"graph.json: Edge source '{src}' not found in nodes")
                if tgt and tgt not in node_ids:
                    errors.append(f"graph.json: Edge target '{tgt}' not found in nodes")
        except Exception as e:
            errors.append(f"graph.json: Failed to validate graph integrity: {e}")

    # 5. Slug-filename consistency
    for subdir in ["diseases", "exposures", "genes", "pathways", "community"]:
        path = data_dir / subdir
        if not path.exists():
            continue
        for fp in path.rglob("*.json"):
            try:
                raw = json.loads(fp.read_text(encoding="utf-8"))
                slug = raw.get("slug") or raw.get("region_id")
                expected = fp.stem
                if slug and slug != expected:
                    errors.append(f"{fp}: Slug '{slug}' does not match filename '{expected}'")
            except Exception:
                pass

    # 6. Disease completeness checks
    for fp in by_type.get("diseases", []):
        try:
            raw = json.loads(fp.read_text())
            if not raw.get("exposure_modifiers"):
                errors.append(f"{fp}: Disease has no exposure modifiers")
            if not raw.get("genetic_architecture", {}).get("top_loci"):
                errors.append(f"{fp}: Disease has no top loci")
            if not raw.get("tissues"):
                errors.append(f"{fp}: Disease has no tissues")
            pe = raw.get("population_equity", {})
            if not pe.get("gwas_ancestry_breakdown") and not pe.get("transferability_notes"):
                errors.append(f"{fp}: Disease missing population equity notes")
        except Exception:
            pass

    # 7. Brief publication gate
    _validate_briefs(data_dir, errors)

    # 8. Citation integrity + gap manifest
    citation_warnings: list[str] = []
    _validate_citations(data_dir, errors, citation_warnings)
    for w in citation_warnings:
        print(f"WARNING: {w}", file=sys.stderr)

    # Output
    if errors:
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
        return 1
    print("Validation passed: all schemas, cross-links, citations, graph integrity, and completeness OK.")
    return 0


if __name__ == "__main__":
    sys.exit(validate())
