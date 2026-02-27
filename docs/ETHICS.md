# GENARCH Ethics

This document outlines the ethical commitments, safety constraints, and design choices that guide the GENARCH atlas. It addresses harm mitigation, ancestry equity, environmental justice, data sovereignty, and privacy.

---

## 1. Why GENARCH Does Not Offer Individual Risk Scores

GENARCH deliberately avoids providing individual-level genetic risk scores. Reasons include:

### Harm Analysis
- **Misinterpretation**: Lay users may conflate population-level associations with personal fate, leading to unnecessary anxiety or false reassurance.
- **Clinical misuse**: Polygenic risk scores (PRSs) require validated thresholds, ancestry-specific calibration, and clinical context; none of which GENARCH provides or intends to support.
- **Discrimination risk**: Individual risk information could be misused for insurance, employment, or other discriminatory purposes.
- **Lack of clinical validation**: GENARCH content is educational and aggregate; it is not validated for diagnostic or prognostic use in any individual.

By restricting outputs to population and community-level information, GENARCH minimizes these harms while still supporting public understanding of genetic and environmental health.

---

## 2. GWAS Ancestry Representation Problem

Per Sirugo et al. (2019), approximately **79% of participants in GWAS are of European ancestry**. This severe imbalance has consequences:

- **Transferability**: Effect sizes and variant associations discovered in European cohorts may not generalize to other populations.
- **Missing variants**: Population-specific or rare variants in understudied groups are underrepresented.
- **Equity**: Research benefits are unequally distributed; non-European populations receive less direct benefit from genetic research.

GENARCH mitigates this by:
- Documenting ancestry composition for each genetic association where available
- Flagging transferability and data gaps in `population_equity` sections
- Avoiding PRS or risk prediction that would disproportionately misrepresent non-European users
- Emphasizing community-level and environmental determinants, which are more universally interpretable

---

## 3. Environmental Justice Framing

The Community module is designed with environmental justice (EJ) principles in mind:

### Design Choices
- **Neutral language**: We avoid terms like "diseased neighborhoods" or "high-risk communities." Instead we use "elevated burden," "disproportionate exposure," or "areas with higher preventable morbidity."
- **Structural lens**: Disparities are framed as outcomes of structural factors (policy, zoning, infrastructure) rather than individual or cultural deficits.
- **Community agency**: Content supports community advocacy and informed engagement with local data; it does not stigmatize residents.
- **No ranking for punishment**: Hotspot scores are for educational and advocacy purposes, not for punitive resource allocation or blame.

### No Resource Allocation Without Human Review
Hotspot or burden estimates must never be used as the sole basis for funding, regulation, or punitive action. Human expertise and local context are essential.

---

## 4. Data Sovereignty

GENARCH uses **only public aggregate data**. We do not:

- Collect or store individual-level health, genetic, or demographic data
- Use commercial health data, consumer genetics, or social media data
- Require user accounts or login
- Track users across sessions for profiling

This ensures:
- **Sovereignty**: Communities and individuals are not subject to data extraction or surveillance
- **Transparency**: All sources are documented and auditable
- **Minimal footprint**: No PII is collected or retained

---

## 5. Plain-Language Commitment

GENARCH content is written for a broad audience, including educators, advocates, and interested members of the public. We commit to:

- Avoiding unnecessary jargon; defining technical terms when used
- Providing summaries and takeaway messages in addition to technical detail
- Making methodology and limitations accessible so users can assess reliability
- Supporting interpretation with contextual guidance, not just raw numbers

---

## 6. Medical Safety Constraints

GENARCH is **not** a medical tool. We explicitly do not:

- **Diagnose** any disease or condition
- **Recommend** screening, testing, or treatment
- **Provide** clinical advice, including genetic counseling
- **Replace** consultation with healthcare providers

All content is presented with disclaimers that it is for educational purposes only. Users with health concerns are directed to seek professional medical advice.

---

## 7. Privacy Protections

### No Accounts
Users can browse the atlas without creating an account. No email, name, or identity is required.

### No PII
We do not collect, store, or process personally identifiable information. Site analytics, if used, should be aggregate-only and privacy-preserving.

### Stateless Passport
The "Passport" feature generates a document summarizing user-selected content. It is generated client-side or via ephemeral processing; no selections are persisted or linked to identities.

---

## 8. Community Module Ethical Guidelines

When developing or curating Community module content:

1. **Neutral language**: Avoid stigmatizing terms; use "areas with elevated burden" not "diseased neighborhoods."
2. **Structural framing**: Emphasize systemic drivers of health disparities.
3. **Transparency**: Document data sources, years, and limitations for each metric.
4. **No individual inference**: Community-level statistics must never be used to infer individual risk or status.
5. **Empowering tone**: Content should support advocacy and informed decision-making, not induce helplessness or blame.

---

## References

- Sirugo, G., Williams, S. M., & Tishkoff, S. A. (2019). The missing diversity in human genetic studies. *Cell*, 177(1), 26–31. https://doi.org/10.1016/j.cell.2019.02.048
