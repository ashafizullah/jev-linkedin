# Jev Job Match

[![CI](https://github.com/ashafizullah/jev-linkedin/actions/workflows/ci.yml/badge.svg)](https://github.com/ashafizullah/jev-linkedin/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**English** · [Bahasa Indonesia](README.id.md)

A Chrome extension that scores **how well a LinkedIn job matches your CV**, and **how likely your
application is to get through screening** — using the **Jev** decision model.

Jev is not a chat LLM. It is a "System One" model that takes a `state` plus typed questions and
answers with **calibrated probabilities** instead of prose. So the match number here is not a
guess parsed out of a sentence — it really is the probability distribution the model returned.

## How it works

A single `POST /v1/systemone` call sends a structured state:

```
candidate  -> profile summary + CV text
job        -> title, company, location, work mode, description
```

and then asks 10 questions at once (Jev evaluates them in parallel, so adding questions barely
adds latency):

| Question | Type | Used for |
| --- | --- | --- |
| `fit_overall` | choice (5 levels) | **match %** |
| `outcome` | choice (5 funnel stages) | **estimated odds of getting through** |
| `biggest_gap` | choice (9 categories) | most likely reason for rejection |
| `worth_applying` | noul | the "worth applying or not" call |
| `meets_experience`, `meets_location`, `meets_language`, `has_domain_experience`, `has_required_tech` | noul | requirement checklist |
| `seniority_fit` | score (5 levels) | seniority fit |

### Evidence signals from the page

CV text versus job description is not enough on its own: in reality you compete with **other
applicants**, not with the description. So the extension also reads signals already present on the
page and sends them as part of `state`:

| Signal | Example on the page |
| --- | --- |
| Applicant count | "39 orang mengklik Lamar" / "39 people clicked apply" |
| Posting age | "Diposting1 hari yang lalu" → 1 day; "2 minggu yang lalu" → 14 days |
| Connections at the company | "1 koneksi bekerja di sini" / "1 connection works here" |
| Early applicant | "Jadilah pelamar awal" / "Be an early applicant" |
| Recruiter activity | "Meninjau pelamar secara aktif" / "Actively reviewing applicants" |
| Application route | "Melamar Mudah" / "Easy Apply" |
| Promoted | "Dipromosikan oleh pembuka lowongan" / "Promoted by the poster" |

LinkedIn labels follow the site's own interface language, so every pattern exists in both
Indonesian and English. Two guardrails:

- When a signal cannot be read, the `opportunity_signals` section is **not sent at all** — the
  model is never given the chance to make something up.
- The bare posting-age form ("1 hari yang lalu" without the word "Diposting") is only searched on
  metadata lines that contain the `·` separator, so description sentences like *"we launched 3
  years ago"* cannot be mistaken for the posting age.

Whatever evidence was used is always shown in the panel under **Evidence used**, so you can check
for yourself what went into the score.

### Formulas

Every number is computed in code from the probability distribution, not taken raw from the model:

```
match %            = Σ (level_index × level_probability) / 4 × 100
% pass screening   = P(technical interview) + P(final interview) + P(offer)
% offer            = P(offer)
```

Final verdict:

| Condition | Label |
| --- | --- |
| `worth_applying ≥ 0.6` and pass screening ≥ 50% | Prioritise |
| `worth_applying ≥ 0.6` | Worth applying |
| `worth_applying ≥ 0.4` | Moderate odds, worth a try |
| otherwise | Better to skip |

> **Important:** the "odds" numbers are the **model's judgement** of your CV text and the job
> description, not real-world probabilities. The model does not know who else applied, how full
> the role is, or the company's internal policies. Treat them as an early signal, not a decision.

## Language

The whole extension ships in **Indonesian and English**: the panel, the Settings page, the popup,
the README, and the questions sent to Jev.

- **Settings → Interface language** switches between *Follow browser language*, *Bahasa Indonesia*
  and *English*.
- The default is *Follow browser language*: Indonesian browsers get Indonesian, everything else
  falls back to English.
- Switching applies immediately, including to results already cached — the stored report keeps
  keys and raw numbers, and every label is translated at render time.
- Changing the language also changes the language of the questions Jev receives, so a
  non-Indonesian CV and job description are judged with English rubrics.

## Install

```bash
npm install
npm run vendor     # copies pdf.js + mammoth into vendor/
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select this repository folder
4. Click the extension icon → **Open settings**

## Setup

**1. Model connection**

- **Base URL** — an endpoint that serves `jev-latest`. Defaults to `https://api.typesafe.ai/v1`
  (TypeSafe's own API). The extension calls `<baseUrl>/systemone`.
  OpenAI-compatible gateways such as `https://api.experientiallabs.ai/v1` also work — their
  `/v1/systemone` endpoint accepts the same request shape, it is just much slower.
  If you use a different host, Chrome will ask for access permission when you save.
- **API key** — stored in `chrome.storage.local` on your machine and sent only to that base URL.
- **Model** — defaults to `jev-latest`. The **Load list** button fetches the model list from the
  endpoint; both response shapes (`{data:[{id}]}` and `{models:[{name}]}`) are handled.
- **Test connection** verifies the key works and that the selected model is actually available.

> The `jev-latest` alias is resolved server-side to a concrete version (e.g. `jev-1.13.0`). That
> version is what the panel footer shows, so you know exactly which model judged you.

**2. Your CV**

Drag a **PDF / DOCX / TXT** file onto the drop zone, or paste the text straight into the box. The
text is extracted locally in your browser (it is not uploaded anywhere) and you can tidy it up by
hand. Analysis needs at least 100 characters.

> A scanned/image PDF has no text layer, so it needs OCR first. The extension tells you when too
> little text was readable.

Below the text, six details are filled in automatically from it — role summary, total experience,
location, education, languages and core skills. Extraction is plain keyword and pattern matching,
run locally: no second endpoint, no extra cost, predictable results. **Fill from CV** re-runs it,
and it only ever writes into **empty** fields, so it never overwrites something you typed by hand.

**There is no application-preferences section, on purpose.** It used to ask for work
authorisation, expected salary, work mode and notes. We removed it after measuring that it did not
change any decision: on one real posting (BJAK, requiring Singapore residency, candidate in
Batam), four runs per variant produced the same verdict and the same dominant reason whether the
profile was CV-only or fully filled. It also turned out `expectedSalary` was never consumed by any
of the ten questions — dead weight from the start. What did move was the tech-stack check
(68.5% → 79.3%) once the skills list was explicit, and that is exactly why the extracted details
stayed while the preference fields went.

Empty fields are simply omitted from what is sent to Jev, so the analysis runs on CV text alone.

## Usage

Open a job detail page on LinkedIn. A panel appears in the bottom right:

- If the job was analysed before, the result shows immediately from cache.
- If not, click **Analyze this job**.

Against the TypeSafe API directly, the analysis finishes in **1–2 seconds** (every question is
evaluated in parallel). Through an intermediary gateway it can take 20–60 seconds — the panel
shows a running timer so you know it is alive, and the extension sends a heartbeat so the MV3
service worker is not shut down mid-request. Results are cached per job ID, so returning is
instant. **Re-analyze** forces a fresh judgement.

Results can be re-read any time under **Settings → Analysis history**.

## Bulk analysis

Instead of scoring jobs one at a time, you can let the extension walk a whole search page for you.

1. Open a LinkedIn **job search results** page.
2. In the panel, pick a batch size (5 / 10 / 25 / 50) and click **Analyze N jobs on this page**.
3. The extension opens each job in turn in the same tab, scores it, and moves on by itself.
   It ends with a summary and a link to the dashboard.

The queue lives in `chrome.storage`, so progress survives every page load. When the page's
jobs run out but the target is not reached yet, it paginates the search itself (`&start=25`,
up to 6 pages) and keeps going. **Stop** in the panel (or in the dashboard) ends it.

There is an optional checkbox, **Re-analyze jobs already scored**, for when you have changed your
CV and want fresh numbers everywhere:

- **Unticked (default)** — jobs already in the cache are skipped, they do not count toward the
  target, and the panel reports how many were skipped.
- **Ticked** — they are scored again, they do count toward the target, and the previous result is
  overwritten.

So a batch of 10 always means "10 jobs scored in this run", whichever way you set it.

Two things worth knowing about how it navigates:

- **It never clicks anything on LinkedIn.** Job IDs are read from the
  `componentkey="job-card-component-ref-<id>"` attribute on the cards, and each job is opened
  by URL. That matters: the only button inside a card is **"Dismiss job"** — clicking the card
  itself does nothing, and clicking its button removes the listing from your feed.
- There is a randomised 1.5–3s gap between jobs. Even so, this drives your real logged-in
  session, so LinkedIn may rate-limit or show a CAPTCHA if you run several large batches back
  to back. Start small.

## Dashboard

**The extension icon → Open dashboard** (or the button under Settings, or the one at the end of a
batch) opens a full page with every job scored so far: **ordered by most recently analyzed by
default**, sortable by match, recency or company, filterable by verdict, searchable by title or
company, and linked back to each posting. It shows the running batch, lets you stop it, and
refreshes itself while a batch is in progress.

## Structure

```
manifest.json              MV3, host permissions for LinkedIn + the model endpoint
src/
  background.js            service worker: message routing, Jev calls, caching
  shared/
    messages.js            ID + EN dictionary, t() with interpolation, locale detection
    signals.js             page-signal parsing + localised formatting
  lib/
    i18n.js                ESM wrapper around the dictionary
    jev.js                 /v1/systemone + /models client (retry 429/529, timeout, abort)
    questions.js           builds the state + typed questions from job and profile
    score.js               turns Jev answers into percentages, verdict, gap list
    analyze.js             orchestrates state -> questions -> Jev -> report
    batch.js               bulk-analysis state machine (pure, no DOM or chrome.*)
    settings.js            config schema + chrome.storage
    profile.js             PDF (pdf.js) and DOCX (mammoth) text extraction
    cvProfile.js           deterministic CV -> profile field extraction
  content/
    extract.js             LinkedIn DOM reading, split out so it can be tested
    linkedin.js            panel UI + lifecycle
    panel.css
  options/                 Settings page
  popup/                   status popup
  dashboard/               full-page results table
scripts/
  vendor-deps.mjs          copy dependencies into vendor/
  make-icons.py            generate icons
test/                      unit tests + integration test against the live API
```

## Tests

```bash
npm test                                  # unit tests only
JEV_API_KEY=... npm test                  # also runs the integration test
```

The integration test asks Jev about a BJAK posting that requires Singapore residency while the
candidate is in Batam, then asserts the model flags the location requirement as unmet.

Two test files exist purely to keep translations honest: `messages.test.js` asserts that both
locales have exactly the same keys, that no value is empty or identical to its key, and that
every key referenced in the source actually exists in the dictionary.

## Development

After changing **service worker** code (`src/background.js` and `src/lib/*`), open
`chrome://extensions` and click **Reload** on the extension. Restarting the browser is not
enough: Chrome caches the service worker script in the profile directory, so the old version
keeps running even though the file on disk changed.

The symptom is subtle and cost real debugging time while building the signals feature — the panel
looked like it was running new code (content scripts are always read fresh from disk) while the
analysis numbers still came from the old code. If a change seems to have no effect, reload the
extension before hunting for a bug.

`src/content/*` does not need an extension reload; just refresh the LinkedIn page.

## Limitations

- **The job title must be readable.** LinkedIn's job list page now renders as `div`s with no
  job-id attribute and no per-card link. That is why there is no percentage badge in the list —
  results only appear once you open a job's detail. The history in Settings shows everything you
  have already scored.
- **LinkedIn selectors are fragile.** A layout change can break extraction. `extract.js` uses a
  fallback chain (stable selectors → the Apply button as an anchor → `<main>`), and when the
  description cannot be read confidently the extension refuses to analyse rather than sending
  garbage text to the model.
- **A LinkedIn login is required.** The content script only runs on pages you can open.
- **Evidence signals depend on what LinkedIn shows.** Applicant count, posting age and connections
  only feed the score when they are actually on the page. When they are missing, scoring falls
  back to CV text versus description alone — and the panel honestly omits the evidence section.
- **One job per analysis** when you run it by hand. The bulk mode walks a search page for you,
  but it is capped at 50 jobs and 6 pages per batch, and it stops if LinkedIn changes the card
  attribute it relies on.
- **Bulk analysis drives your own logged-in session.** It opens each job by URL with a 1.5–3s
  gap, but LinkedIn can still rate-limit or challenge an account that runs several large batches
  in a row. Scored results also accumulate in `chrome.storage.local`, which Chrome caps at 10 MB
  unless the extension asks for `unlimitedStorage` — that is a few thousand reports, so not a
  practical limit yet.
- **CV auto-fill is best effort.** It matches patterns that are common in CVs (known skill names,
  degree words, `City, Country` lines, year ranges). An unusually formatted CV can yield nothing,
  in which case it says so instead of guessing.
