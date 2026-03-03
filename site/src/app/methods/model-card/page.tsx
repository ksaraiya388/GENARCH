import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EvidenceLimitations } from "@/components/EvidenceLimitations";

export default function ModelCardPage() {
  return (
    <article className="space-y-10">
      <Breadcrumbs
        items={[
          { label: "Methods", href: "/methods" },
          { label: "Model Card" },
        ]}
      />

      <header>
        <h1 className="text-h1 text-genarch-text">
          Community Hotspot Model Card
        </h1>
        <p className="mt-2 text-genarch-subtext">
          GENARCH Community Hotspot Model v1.0
        </p>
      </header>

      <section>
        <h2 className="text-h2 text-genarch-text mb-3">Model Overview</h2>
        <div className="card">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-genarch-text">Model Type</dt>
              <dd className="text-genarch-subtext">Gradient Boosting (XGBoost)</dd>
            </div>
            <div>
              <dt className="font-medium text-genarch-text">Version</dt>
              <dd className="text-genarch-subtext">1.0</dd>
            </div>
            <div>
              <dt className="font-medium text-genarch-text">Output</dt>
              <dd className="text-genarch-subtext">
                Hotspot score (0–1 normalized, relative burden estimate)
              </dd>
            </div>
            <div>
              <dt className="font-medium text-genarch-text">Update Cadence</dt>
              <dd className="text-genarch-subtext">Annual, with GENARCH report release</dd>
            </div>
          </dl>
        </div>
      </section>

      <section>
        <h2 className="text-h2 text-genarch-text mb-3">Intended Use</h2>
        <p className="text-sm text-genarch-text mb-3">
          The hotspot model estimates <em>relative</em> preventable disease
          burden at the county or census-tract level. It is designed exclusively
          for educational visualization and community-level awareness.
        </p>
        <div className="bg-red-50 border border-red-200 p-4 rounded-sm">
          <h3 className="text-h3 text-red-800 mb-2">Not Intended Use</h3>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            <li>Individual risk prediction or clinical decision support</li>
            <li>Resource allocation without human review and local context</li>
            <li>Labeling communities as &ldquo;diseased&rdquo; or &ldquo;high-risk&rdquo;</li>
            <li>Insurance or employment screening</li>
            <li>Replacement for epidemiological surveillance</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-h2 text-genarch-text mb-3">Training Data</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Source</th>
                <th className="text-left px-4 py-2 font-medium">Data Type</th>
                <th className="text-left px-4 py-2 font-medium">Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-2">EPA EJSCREEN</td>
                <td className="px-4 py-2">Environmental justice indicators</td>
                <td className="px-4 py-2">National, census-tract level</td>
              </tr>
              <tr>
                <td className="px-4 py-2">CDC WONDER</td>
                <td className="px-4 py-2">Disease incidence/mortality</td>
                <td className="px-4 py-2">National, county level</td>
              </tr>
              <tr>
                <td className="px-4 py-2">American Community Survey</td>
                <td className="px-4 py-2">Socioeconomic indicators</td>
                <td className="px-4 py-2">National, census-tract level</td>
              </tr>
              <tr>
                <td className="px-4 py-2">County Health Rankings</td>
                <td className="px-4 py-2">Community health metrics</td>
                <td className="px-4 py-2">National, county level</td>
              </tr>
              <tr>
                <td className="px-4 py-2">USDA Food Access Atlas</td>
                <td className="px-4 py-2">Food environment data</td>
                <td className="px-4 py-2">National, census-tract level</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-h2 text-genarch-text mb-3">Features</h2>
        <ul className="list-disc list-inside text-sm text-genarch-text space-y-1">
          <li>PM2.5 annual mean concentration (μg/m³)</li>
          <li>Ozone 8-hour seasonal average (ppb)</li>
          <li>Industrial proximity score (EJSCREEN)</li>
          <li>Food access score (USDA low-access designation)</li>
          <li>Social Vulnerability Index percentile (CDC SVI)</li>
          <li>Traffic proximity and volume (EJSCREEN)</li>
          <li>Superfund proximity (EJSCREEN)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-h2 text-genarch-text mb-3">Performance</h2>
        <p className="text-sm text-genarch-text mb-3">
          Evaluated on held-out geographic regions (20% of counties):
        </p>
        <div className="card">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium">R² (overall)</dt>
              <dd className="text-genarch-subtext">0.67</dd>
            </div>
            <div>
              <dt className="font-medium">MAE (overall)</dt>
              <dd className="text-genarch-subtext">0.08</dd>
            </div>
            <div>
              <dt className="font-medium">R² (urban counties)</dt>
              <dd className="text-genarch-subtext">0.72</dd>
            </div>
            <div>
              <dt className="font-medium">R² (rural counties)</dt>
              <dd className="text-genarch-subtext">0.54</dd>
            </div>
          </dl>
        </div>
      </section>

      <section>
        <h2 className="text-h2 text-genarch-text mb-3">
          Known Limitations and Biases
        </h2>
        <ul className="list-disc list-inside text-sm text-genarch-text space-y-2">
          <li>
            Model performance varies by region type; rural areas have lower R²
            due to sparser monitoring data.
          </li>
          <li>
            Exposure data may lag real-time conditions by 1–2 years depending on
            agency reporting cycles.
          </li>
          <li>
            The model does not capture individual-level variation, genetic
            susceptibility, or indoor exposures.
          </li>
          <li>
            Census-tract boundaries may not align with true exposure gradients or
            community boundaries.
          </li>
          <li>
            Socioeconomic features may encode structural inequities rather than
            causal environmental exposures.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-h2 text-genarch-text mb-3">
          SHAP Explanation Methodology
        </h2>
        <p className="text-sm text-genarch-text">
          Feature attributions are computed using TreeSHAP (Lundberg & Lee, 2017)
          applied to the XGBoost model. For each region, SHAP waterfall plots
          show the top 5 features contributing to the predicted hotspot score.
          SHAP values represent the marginal contribution of each feature to the
          prediction relative to the base rate.
        </p>
      </section>

      <EvidenceLimitations>
        <p className="mb-2">
          This model produces relative estimates for educational purposes only.
          Hotspot scores do not represent absolute disease counts, individual
          risk probabilities, or clinical recommendations.
        </p>
        <p>
          Model outputs should always be interpreted alongside the model card
          limitations and local expert knowledge.
        </p>
      </EvidenceLimitations>
    </article>
  );
}
