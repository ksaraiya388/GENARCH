# Content constraints

The rules every user-visible string on this site must satisfy. They apply to headings, body
copy, chart titles, axis labels, tooltips, table headers, alt text, `aria-label`, meta
descriptions, and the display fields of JSON data (`summary`, `description`, `notes`,
`limitations`, and the rest of the set enumerated in `scripts/check-constraints.mjs`).

Enforcement is automated: `npm run check:constraints` fails the build on a violation. See
`docs/lint-baseline.json` for pre-existing debt and `docs/constraint-exemptions.json` for
reviewed carve-outs.

---

## 1. No causal claims

GENARCH describes co-location and biological mechanism. It does not establish that any
exposure caused any outcome in any population.

| Instead of | Write |
|---|---|
| environmental drivers | environmental modifiers |
| Model Drivers (SHAP) | Model Feature Attributions (SHAP) |
| PM2.5 drives asthma | PM2.5 exposure is associated with asthma at the population level |
| the effect of X on Y | the reported association between X and Y |
| leads to inflammation | is understood to precede inflammation in this pathway |
| top drivers | highest-attribution features |

`associated with` is permitted. `linked to` is banned in headings, chart titles, and captions;
permitted in body prose when immediately followed by the evidence type.

### Intra-organism carve-out

Rule 1 governs causal claims linking **environmental exposure** to **population health
outcome**. It does not govern established intra-organism pathophysiology. A carve-out requires
all three of:

1. both subject and object are anatomical, cellular, or molecular;
2. neither is a population, a person, or an environmental exposure;
3. a citation is attached, or the claim is textbook physiology.

Carve-outs are per-string and must state a reason. In `.tsx` and `.mdx`, use an inline
`// constraint-ok: intra-organism mechanism` comment. **JSON cannot carry comments**, so JSON
carve-outs are recorded in `docs/constraint-exemptions.json` with `file`, `json_path`,
`matched_string`, `constraint`, `reason`, `date`, and `approver`. No blanket exemption exists;
each one forces a human decision and leaves an audit trail.

## 2. Terminology: "modifier" is a reserved word

**`modifier` is reserved for entities in the exposure ontology that carry a direction and an
evidence grade.** It is not a general-purpose synonym for "factor", "influence", or "thing the
model does not capture".

Land-use change, demographic change, and development patterns are **not** modifiers. Write
**`conditions`**, or name the specific thing.

| Context | Correct | Incorrect |
|---|---|---|
| An exposure with `direction` and `confidence` in `data/exposures/` | environmental **modifier** | — |
| Suburbanization, data center development, transit buildout | local **conditions** | local modifiers |
| Anything without an evidence grade | name it specifically | modifier |

Using `modifier` for an ungraded entity asserts a classification the data does not support.
This is why `data/community/*.json` reads "may not fully capture Loudoun-specific
**conditions** (e.g., rapid suburbanization, data center development)".

## 3. No facility-level attribution

No company name, data center operator name, campus name, or facility address may appear in any
string. A company name may appear only inside a formatted citation, and never in a sentence
whose object is a health outcome, a symptom, a school, or a child.

Describe the corridor, not the company: "eastern Loudoun", "the data center corridor", "the
Route 28 corridor", "the monitored area".

## 4. School siting — narrow frame

Render all schools as a single uniform map layer with identical styling. Never highlight,
colour, size, or annotate an individual school.

Never place a school name and a health outcome, symptom, reading value, or elevated-reading
event in the same sentence, table row, tooltip, or chart annotation. Where source data carries
a school name in a sensor label, render the sensor by its DEQ sensor ID and general locality.

The lint checks for a school name within 200 characters of a health or reading term. **The
pattern must cover abbreviations** — `Broad Run HS` is a school name and the unextended
pattern misses it. See `docs/PROMPT_AMENDMENTS.md` A2.

## 5. No individual risk language

All visualisations are population-level. Never write "at risk", "high risk", or "predisposed"
with a person or group as the subject.

`high-risk allele`, `high-risk variant`, `high-risk genotype`, `high-risk haplotype`, and
`confer(s) high risk of` are permitted: the subject is genetic, not human.

Never use second person about biology — not "your genes", "your environment", "your risk".
Write "genetic variation", "the environment", "population-level risk".

## 6. Ecological fallacy must be disclosed

Aggregated exposure paired with aggregated prevalence cannot establish that exposed individuals
within a unit are the affected individuals. This is distinct from Rule 5 and must be disclosed
separately, in the **template** rather than per-region data so it cannot be omitted for one
region.

## 7. No policy position

Banned: `alarming`, `unchecked` (of growth, development, or expansion), `sprawl`, `sacrificed`,
`deserve`, `must act`, `should be required`, `at what cost`, `Big Tech`, `crisis`. No reference
to rezoning, moratoria, board votes, permits, legislation, or any pending decision. No question
framed as a policy question.

`unchecked` in the biochemical sense — "degrade lung elastin unchecked" — is permitted; the ban
targets "unchecked data center growth", not enzymology.

## 8. Never lint a citation

Nothing inside a `references[]` array is scanned, and `title`, `authors`, `journal`, `source`,
`doi`, and `url` are excluded wherever they appear.

A published paper's title is quoted material. `HHIP haploinsufficiency causes emphysema` is a
real title and must stay exactly as published. Enforcing the lexicon on a citation would
pressure an author to **falsify** it, which inverts the purpose of the entire constraint
system.

## 9. Claims about the atlas itself

Do not assert a capability the atlas does not have. `all data points are cited`,
`every claim is cited`, `cites its sources`, and `fully cited` are banned until the citation
gap manifest (`docs/CITATION_GAPS.csv`) is empty.

The current, supportable claim is: *"All data points are scored and traceable to their source
class, with citation records under active backfill — see Methods."*
