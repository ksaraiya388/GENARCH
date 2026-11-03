"""The data freeze: the only files the report may read.

`data/reports/2026/FREEZE.json` pins every input by SHA-256. Nothing is read
unless it is listed there and its hash still matches; a mismatch aborts the run
rather than producing a number from a file that moved under us.

Measurement inputs and configuration inputs are both copied under
`pipeline/sources/freeze-2026/`. A `config_inputs` entry carries `path`, the live
file the copy was taken from, and `frozen_path`, the copy the report actually
reads and hashes, so a weekly DEQ ingest can keep editing the live manifest, site
history and site-code lookup without moving a number in the 2026 report
(DECISIONS.md D28).
"""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

# The atlas half of the report is gated on three conditions, all of which must hold
# before `--add-atlas-inputs` will pin anything (DECISIONS.md D24/D25 round):
#
#   1. HEAD contains the Prompt A encoding-repair commit, so the graph on disk is the
#      repaired one rather than a pre-repair checkout.
#   2. `data/graph/graph.json` passes `scripts/check_mojibake.py` outright.
#   3. AUDIT.md carries the 2026-10-24 entry recording that the published graph is not
#      reproducible from the current pipeline, so the non-reproducibility the atlas
#      inventory has to disclose is on the record before the counts are frozen (D25).
#
# `metadata.generated_at` is deliberately NOT a condition. The published graph was
# generated 2026-03-07 and stays at that date: D25 keeps it at 97 nodes and 165 edges
# and repairs it in place rather than regenerating it, so a date floor would gate the
# atlas on a rebuild that D25 ruled out and scheduled instead.
ATLAS_PROMPT_A_COMMIT = "03763e8"
GRAPH_PATH = "data/graph/graph.json"
MOJIBAKE_CHECKER = "scripts/check_mojibake.py"
AUDIT_PATH = "docs/report-2026/AUDIT.md"
ATLAS_AUDIT_ENTRY_PREFIX = "2026-10-24: data/graph/graph.json"
ATLAS_AUDIT_ENTRY_MARKER = "is not reproducible from the current pipeline"

# The atlas modules the inventory counts, in report order. Every record file in each
# directory is pinned by SHA-256, so the inventory counts cannot move under the report
# without the run failing. The knowledge graph is one file and is listed as its own
# module because its status differs from every other module's (D25).
ATLAS_MODULES = (
    ("diseases", "data/diseases"),
    ("exposures", "data/exposures"),
    ("genes", "data/genes"),
    ("pathways", "data/pathways"),
    ("mechanism_briefs", "data/briefs"),
    ("community_regions", "data/community"),
    ("ancestry_modules", "data/ancestry"),
    ("knowledge_graph", "data/graph"),
)

# Inputs the DEQ analysis needs that are configuration rather than measurement.
# Keyed by the live path each was taken from; read at its frozen copy.
CONFIG_INPUTS = (
    "pipeline/sources/deq_sensor_site_history.csv",
    "pipeline/lookups/site_codes.json",
    "pipeline/sources/manifest.json",
)
CONFIG_FROZEN_DIR = "pipeline/sources/freeze-2026/config"

_CHUNK = 1048576


class FreezeError(RuntimeError):
    """A freeze contract failure. Nothing is emitted when this is raised."""


@dataclass(frozen=True)
class FrozenFile:
    path: Path
    rel_path: str
    sha256: str
    export_date: str | None
    data_cutoff: str | None
    site_id: str | None = None
    role: str | None = None


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        while True:
            chunk = handle.read(_CHUNK)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


class Freeze:
    """A loaded FREEZE.json, with hash verification on every read."""

    def __init__(self, path: Path):
        self.path = path
        self.doc = json.loads(path.read_text(encoding="utf-8"))
        self._index: dict[str, FrozenFile] = {}
        for entry in self.doc.get("kunak_exports", []):
            self._add(entry, "frozen_path", entry.get("data_cutoff_local_hour_ending"))
        for entry in self.doc.get("regulatory_foia_26_4646", []):
            self._add(entry, "frozen_path", entry.get("data_cutoff_est_hour_beginning"))
        for entry in self.doc.get("deq_weekly_reports", []):
            self._add(entry, "frozen_path", None)
        for entry in self.doc.get("original_analysis_inputs", {}).get("files", []):
            self._add(entry, "frozen_path", entry.get("data_cutoff_local_hour_ending"))
        for entry in self.doc.get("config_inputs", []):
            # Indexed under the live path the entry names, resolved at the frozen
            # copy. The live file stays the report's historical source and stays in
            # every provenance stamp; the bytes read and hashed are the frozen ones.
            self._add(entry, "path", None, resolve_key="frozen_path")
        for entry in self.doc.get("atlas_inputs", {}).get("files", []):
            # Atlas records are pinned where they live. Unlike the configuration
            # inputs (D28) there is no frozen copy: the atlas half of the report is a
            # snapshot of the committed atlas, so an edit after the freeze must fail
            # the run rather than be absorbed. Retaking the freeze is the remedy.
            self._add(entry, "path", None)

    def _add(
        self,
        entry: dict,
        path_key: str,
        cutoff: str | None,
        resolve_key: str | None = None,
    ) -> None:
        rel = entry[path_key]
        self._index[rel] = FrozenFile(
            path=REPO_ROOT / entry[resolve_key or path_key],
            rel_path=rel,
            sha256=entry["sha256"],
            export_date=entry.get("export_date"),
            data_cutoff=cutoff,
            site_id=entry.get("site_id"),
            role=entry.get("role"),
        )

    # ------------------------------------------------------------------ reads

    def verified_path(self, rel_path: str) -> Path:
        """Resolve `rel_path` after checking it is frozen and its hash still matches."""
        entry = self._index.get(rel_path)
        if entry is None:
            raise FreezeError(
                f"{rel_path} is not listed in {self.path.name}; "
                "the report reads only frozen inputs"
            )
        if not entry.path.is_file():
            raise FreezeError(f"frozen input is missing from disk: {rel_path}")
        actual = sha256_of(entry.path)
        if actual != entry.sha256:
            raise FreezeError(
                f"SHA-256 mismatch on {rel_path}\n"
                f"  frozen:  {entry.sha256}\n"
                f"  on disk: {actual}"
            )
        return entry.path

    def verify_all(self) -> list[str]:
        """Hash-check every frozen input. Returns the relative paths checked, in order."""
        checked = sorted(self._index)
        for rel in checked:
            self.verified_path(rel)
        return checked

    # --------------------------------------------------------------- accessors

    @property
    def git_head(self) -> str:
        return self.doc["git_head"]

    @property
    def frozen_at_utc(self) -> str:
        return self.doc["frozen_at_utc"]

    def kunak_exports(self) -> list[FrozenFile]:
        return [self._index[e["frozen_path"]] for e in self.doc["kunak_exports"]]

    def original_analysis_inputs(self) -> list[FrozenFile]:
        files = self.doc["original_analysis_inputs"]["files"]
        return [self._index[e["frozen_path"]] for e in files]

    def regulatory(self) -> list[FrozenFile]:
        return [self._index[e["frozen_path"]] for e in self.doc["regulatory_foia_26_4646"]]

    def weekly_reports(self) -> list[FrozenFile]:
        return [self._index[e["frozen_path"]] for e in self.doc["deq_weekly_reports"]]

    def regulatory_named(self, filename: str) -> FrozenFile:
        for entry in self.regulatory():
            if entry.path.name == filename:
                return entry
        raise FreezeError(f"no frozen regulatory file named {filename}")

    def config_input(self, rel_path: str) -> FrozenFile:
        return self._index[rel_path]

    def config_path(self, rel_path: str) -> Path:
        """The frozen copy of one configuration input, hash-verified before the read.

        `rel_path` is the live path, which is what `CONFIG_INPUTS` and every
        provenance stamp name. What comes back is the copy under
        `CONFIG_FROZEN_DIR`.
        """
        if rel_path not in CONFIG_INPUTS:
            raise FreezeError(f"{rel_path} is not a configuration input")
        return self.verified_path(rel_path)

    def inputs_for(self, entries) -> list[dict]:
        """The provenance stamp recorded on every number."""
        return [{"path": e.rel_path, "sha256": e.sha256} for e in entries]

    def kunak_cutoff(self) -> str:
        return max(e.data_cutoff for e in self.kunak_exports() if e.data_cutoff)

    # ------------------------------------------------------------ config block

    def ensure_config_inputs(self) -> bool:
        """Pin the configuration inputs on first run; verify them on every later run.

        Pinning copies each live file into `CONFIG_FROZEN_DIR` and records both
        paths, because the live files keep changing after the freeze is taken.

        Returns True when the block was written by this call.
        """
        if self.doc.get("config_inputs"):
            for rel in CONFIG_INPUTS:
                self.verified_path(rel)
            return False
        block = []
        for rel in CONFIG_INPUTS:
            target = REPO_ROOT / rel
            if not target.is_file():
                raise FreezeError(f"configuration input is missing: {rel}")
            frozen_rel = f"{CONFIG_FROZEN_DIR}/{target.name}"
            frozen = REPO_ROOT / frozen_rel
            frozen.parent.mkdir(parents=True, exist_ok=True)
            if not frozen.is_file():
                shutil.copy2(target, frozen)
            block.append(
                {
                    "path": rel,
                    "frozen_path": frozen_rel,
                    "sha256": sha256_of(frozen),
                    "size_bytes": frozen.stat().st_size,
                    "role": "configuration read by pipeline.report; not measurement data",
                }
            )
        self.doc["config_inputs"] = block
        self.write_doc()
        for entry in block:
            self._add(entry, "path", None, resolve_key="frozen_path")
        return True

    def write_doc(self) -> None:
        """Rewrite FREEZE.json, keeping its existing key order.

        The freeze is an audit artefact. Sorting its keys would churn the whole file
        and bury the one block being added, so the order `json.load` saw is kept and
        a new key lands at the end.
        """
        with open(self.path, "w", encoding="utf-8", newline="\n") as handle:
            json.dump(self.doc, handle, ensure_ascii=False, indent=2)
            handle.write("\n")

    # ----------------------------------------------------------- atlas inputs

    def atlas_inputs(self) -> dict | None:
        """The pinned atlas block, or None while the atlas freeze has not been taken."""
        return self.doc.get("atlas_inputs")

    def atlas_frozen_at(self) -> str:
        """The atlas freeze date, which every inventory count is reported against."""
        block = self.atlas_inputs()
        if block is None:
            raise FreezeError("the atlas freeze has not been taken")
        return block["frozen_at"]

    def atlas_path(self, rel_path: str) -> Path:
        """One pinned atlas record, hash-verified before the read."""
        return self.verified_path(rel_path)

    def atlas_entry(self, rel_path: str) -> FrozenFile:
        """One pinned atlas record by its path, for a provenance stamp."""
        block = self.atlas_inputs()
        if block is None:
            raise FreezeError("the atlas freeze has not been taken")
        if rel_path not in {e["path"] for e in block["files"]}:
            raise FreezeError(f"{rel_path} is not a pinned atlas record")
        return self._index[rel_path]

    def atlas_files(self, module: str) -> list[FrozenFile]:
        """Every pinned record of one atlas module, in path order."""
        block = self.atlas_inputs()
        if block is None:
            raise FreezeError("the atlas freeze has not been taken")
        return [
            self._index[e["path"]] for e in block["files"] if e["module"] == module
        ]

    def take_atlas_inputs(self) -> dict:
        """Pin the atlas records in FREEZE.json. Refuses while the gate blocks.

        Returns the block written. Raises `FreezeError` if the gate blocks or the
        block is already present: re-pinning would silently move the counts the
        report states against a freeze date that no longer matches them.
        """
        blockers = self.atlas_gate_blockers()
        if blockers:
            raise FreezeError("the atlas gate blocks: " + "; ".join(blockers))
        if self.doc.get("atlas_inputs"):
            raise FreezeError(
                "atlas_inputs is already pinned in "
                f"{self.path.name}, frozen at {self.doc['atlas_inputs']['frozen_at']}"
            )

        files: list[dict] = []
        modules: list[dict] = []
        for module, rel_dir in ATLAS_MODULES:
            directory = REPO_ROOT / rel_dir
            if not directory.is_dir():
                raise FreezeError(f"atlas module directory is missing: {rel_dir}")
            records = sorted(directory.glob("*.json"), key=lambda q: q.name)
            if not records:
                raise FreezeError(f"atlas module directory holds no records: {rel_dir}")
            for record in records:
                files.append(
                    {
                        "module": module,
                        "path": f"{rel_dir}/{record.name}",
                        "sha256": sha256_of(record),
                        "size_bytes": record.stat().st_size,
                    }
                )
            modules.append({"module": module, "dir": rel_dir, "record_count": len(records)})

        block = {
            "frozen_at": date.today().isoformat(),
            "git_head": head_sha(),
            "gate": {
                "prompt_a_commit": ATLAS_PROMPT_A_COMMIT,
                "prompt_a_commit_in_head": True,
                "graph_mojibake_hits": 0,
                "audit_entry": (
                    f"{AUDIT_PATH}, 2026-10-24 graph reproducibility entry (D25)"
                ),
            },
            "graph_status": (
                "live; not reproducible from current pipeline (D25)"
            ),
            "modules": modules,
            "files": files,
        }
        self.doc["atlas_inputs"] = block
        self.write_doc()
        for entry in files:
            self._add(entry, "path", None)
        return block

    # ------------------------------------------------------------- atlas gate

    def atlas_gate_blockers(self) -> list[str]:
        """Why the atlas freeze may not be taken yet. An empty list means it may.

        All three conditions above have to hold. Each is reported on its own line so a
        refusal names what is missing rather than that something is.
        """
        blockers: list[str] = []

        if not head_contains(ATLAS_PROMPT_A_COMMIT):
            if commit_is_present(ATLAS_PROMPT_A_COMMIT):
                blockers.append(
                    f"HEAD does not contain the Prompt A commit "
                    f"{ATLAS_PROMPT_A_COMMIT}; the in-place encoding repair is not in "
                    "this checkout"
                )
            else:
                blockers.append(
                    f"the Prompt A commit {ATLAS_PROMPT_A_COMMIT} is not in this "
                    "repository at all, which a shallow clone causes; fetch the full "
                    "history before evaluating the atlas gate"
                )

        graph = REPO_ROOT / GRAPH_PATH
        if not graph.is_file():
            blockers.append(f"{GRAPH_PATH} is missing")
        else:
            hits = mojibake_hits_for(GRAPH_PATH)
            if hits:
                blockers.append(f"{GRAPH_PATH} fails {MOJIBAKE_CHECKER} with {hits} hit(s)")

        if not audit_records_graph_reproducibility():
            blockers.append(
                f"{AUDIT_PATH} carries no 2026-10-24 graph reproducibility entry; D25 "
                "requires the non-reproducibility on the record before the counts are frozen"
            )
        return blockers


def head_sha() -> str:
    """The full SHA of HEAD, recorded on the atlas block the way `git_head` is."""
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=str(REPO_ROOT),
        check=False,
    )
    if result.returncode != 0:
        raise FreezeError("could not read HEAD; the atlas freeze records the commit it pins")
    return result.stdout.strip()


def _git(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=str(REPO_ROOT),
        check=False,
    )


def commit_is_present(commit: str) -> bool:
    """Whether the repository holds the commit object at all.

    A shallow clone does not, and `merge-base --is-ancestor` then fails for a
    reason that has nothing to do with what HEAD contains. The gate reports the
    two cases differently so a refusal on a CI runner is not read as a tree that
    is missing the repair.
    """
    return _git("cat-file", "-e", f"{commit}^{{commit}}").returncode == 0


def head_contains(commit: str) -> bool:
    """Whether `commit` is an ancestor of HEAD, by `git merge-base --is-ancestor`."""
    return _git("merge-base", "--is-ancestor", commit, "HEAD").returncode == 0


def audit_records_graph_reproducibility() -> bool:
    """Whether AUDIT.md carries the 2026-10-24 graph reproducibility entry (D25)."""
    audit = REPO_ROOT / AUDIT_PATH
    if not audit.is_file():
        return False
    return any(
        line.startswith(ATLAS_AUDIT_ENTRY_PREFIX) and ATLAS_AUDIT_ENTRY_MARKER in line
        for line in audit.read_text(encoding="utf-8").splitlines()
    )


def mojibake_hits_for(rel_path: str) -> int:
    """How many hits `scripts/check_mojibake.py` reports against one file."""
    checker = REPO_ROOT / MOJIBAKE_CHECKER
    if not checker.is_file():
        raise FreezeError(f"{MOJIBAKE_CHECKER} is missing; the atlas gate cannot be evaluated")
    result = subprocess.run(
        [sys.executable, str(checker)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=str(REPO_ROOT),
        check=False,
    )
    needle = rel_path.replace("\\", "/")
    return sum(
        1
        for line in (result.stdout or "").splitlines()
        if line.startswith(needle + ":") or line.startswith("INFO " + needle + ":")
    )
