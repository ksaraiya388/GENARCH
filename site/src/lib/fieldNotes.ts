// Field Notes: first-person founder entries, distinct from the versioned
// changelog in data/reports/releases.json. Reverse-chronological.
// Each entry is grounded in real project history — no invented events.

export interface FieldNote {
  slug: string;
  title: string;
  date: string; // ISO yyyy-mm-dd
  body: string[]; // paragraphs
}

export const FIELD_NOTES: FieldNote[] = [
  {
    slug: "picking-one-map",
    title: "Picking one map",
    date: "2026-07-09",
    body: [
      "The site had been saying two different things. The homepage read “Northern Virginia.” The about page and footer said “Loudoun County.” I made that homepage change myself back in the spring, reaching for a bigger frame before the data had earned it.",
      "Fixed it today. One line everywhere: built for Loudoun County, expanding across Northern Virginia. Loudoun is what the atlas actually covers in depth. Northern Virginia is where it is headed, and saying so is a promise, not a description.",
      "It is a small copy change. But claiming a reach the project does not have yet is its own kind of quiet untruth, and I would rather the words match the work.",
    ],
  },
  {
    slug: "writing-the-no2-brief",
    title: "Writing the NO2 brief without overclaiming",
    date: "2026-07-01",
    body: [
      "Added a mechanism brief on traffic-related NO2 along the Route 28 and Dulles corridor and childhood asthma. The hard part was not the biology. It was staying honest about what a corridor-level exposure can and cannot say about any individual child.",
      "NO2 tracks closely with traffic, which makes it a decent marker for the mix of pollutants near busy roads. That same closeness makes it hard to pin an effect on NO2 alone. I tried to say so plainly in the brief rather than bury it.",
      "I am still not sure I struck the right balance between useful and cautious. The corridor is real and the asthma signal is real. Turning that into a page that informs without scaring took more rewriting than the science did.",
    ],
  },
  {
    slug: "getting-the-shap-panel-to-tell-the-truth",
    title: "Getting the SHAP panel to tell the truth",
    date: "2026-07-01",
    body: [
      "Spent a while on the SHAP driver panel, trying to get it to say something actually true. The data was right. Traffic proximity and PM2.5 push modeled burden up. But the colors had it backwards, coding the harmful factors green and the protective ones red.",
      "Easy to miss. Embarrassing once you see it. I fixed the mapping so risk-increasing is red everywhere, matching the rest of the site.",
      "Small change, and it bugged me more than its size deserved. The whole point of this project is to not quietly tell people the wrong thing, and a green bar next to “pollution raises burden” does exactly that.",
    ],
  },
];
