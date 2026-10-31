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
from datetime import date, datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

# The atlas half of the report is gated on the Prompt A graph rebuild.
ATLAS_GRAPH_MIN_GENERATED_AT = date(2026, 10, 22)
GRAPH_PATH = "data/graph/graph.json"
MOJIBAKE_CHECKER = "scripts/check_mojibake.py"

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

    # ------------------------------------------------------------- atlas gate

    def atlas_gate_blockers(self) -> list[str]:
        """Why the atlas freeze may not be taken yet. An empty list means it may."""
        blockers: list[str] = []
        graph = REPO_ROOT / GRAPH_PATH
        if not graph.is_file():
            return [f"{GRAPH_PATH} is missing"]

        metadata = json.loads(graph.read_text(encoding="utf-8")).get("metadata", {})
        generated = metadata.get("generated_at", "")
        try:
            generated_at = datetime.strptime(generated, "%Y-%m-%d").date()
        except ValueError:
            blockers.append(f"{GRAPH_PATH} metadata.generated_at is {generated!r}, not a date")
        else:
            if generated_at <= ATLAS_GRAPH_MIN_GENERATED_AT:
                blockers.append(
                    f"{GRAPH_PATH} metadata.generated_at = {generated_at.isoformat()}; the "
                    f"Prompt A regeneration (later than "
                    f"{ATLAS_GRAPH_MIN_GENERATED_AT.isoformat()}) is not in HEAD"
                )

        hits = mojibake_hits_for(GRAPH_PATH)
        if hits:
            blockers.append(f"{GRAPH_PATH} fails {MOJIBAKE_CHECKER} with {hits} hit(s)")
        return blockers


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
