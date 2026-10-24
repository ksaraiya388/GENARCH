"""Report generation helpers for the GENARCH annual report.

Everything the report needs that `pipeline.reshape_deq` does not already provide.
Parsing, timestamp normalisation, occupancy, exclusion flags and the 18-of-24
completeness rule all come from `reshape_deq`; nothing here reimplements them.
"""

__all__ = [
    "collocation",
    "correlation",
    "daily",
    "figures",
    "freeze",
    "numbers",
    "palette",
    "reconciliation",
    "rounding",
    "rows",
    "site_codes",
    "tables",
    "verify",
]
