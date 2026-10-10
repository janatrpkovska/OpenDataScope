# OpenDataScope

**Comparing Government Open Data Ecosystems**

Jana Trpkovska · FINKI · Introduction to Data Science · 2026

## Project overview

OpenDataScope is a web application for analysing and comparing government open-data portals.

The main case study is North Macedonia's official open-data portal, **data.gov.mk**. The application analyses what data is available, how much data is published, who publishes it, which themes and formats are used, and selected indicators related to accessibility and reuse.

North Macedonia is compared with:

- United Kingdom — data.gov.uk
- United States — data.gov
- Germany — govdata.de
- France — data.gouv.fr
- Netherlands — data.overheid.nl
- Spain — datos.gob.es

The European Union portal, **data.europa.eu**, is shown separately because it is an aggregator of national and institutional catalogues.

Serbia is included only as regional context.

## Research question

**How does North Macedonia's open-data ecosystem compare with major European and international open-data portals?**

## What the application analyses

The application covers:

- catalogue size;
- publishers and organisations;
- available data themes;
- resource formats;
- machine-readable and open formats;
- licence metadata;
- metadata activity;
- API availability;
- metadata standards;
- EU discoverability;
- similarities and differences between portals;
- evidence-based opportunities for improving North Macedonia's open-data ecosystem.

Because different portals use different definitions and counting units, comparisons are marked as:

- **Direct** — sufficiently comparable;
- **Partial** — similar measure, but definitions or units differ;
- **Context only** — useful background, but not suitable for direct quantitative comparison.

## Research snapshot

Open-data portals change continuously, so OpenDataScope uses a fixed research snapshot collected on **8 October 2026, 22:21–23:03 UTC**.

Canonical analytical values come from this frozen snapshot. Later portal readings are kept only as validation evidence and do not replace the original snapshot values.

The main collection layers are:

- **S1** — API data from North Macedonia, the United Kingdom, the United States, France and the EU portal;
- **S2** — a full North Macedonia crawl, Netherlands and Serbia API data, and the timed official GovData dataset-count reading for Germany;
- **R1** — a timed official page reading for Spain, where no suitable API total was available.

The application uses frozen local data and does not query external portals while it is running.

## Main findings

- North Macedonia's portal contained **768 datasets** and **1,605 resources** in the research snapshot.
- **62 of 132 listed organisations** published at least one public dataset.
- **85.0%** of datasets had at least one theme.
- Government and economy were the largest themes.
- XLSX and XLS together represented **57.3%** of resources.
- Under the project definition, **90.78%** of resources were machine-readable.
- **33.52%** of resources used an open format.
- **22.3%** of North Macedonian datasets had an open-licence identifier.
- **33.6%** of North Macedonian records had metadata modified in the previous 12 months.
- No North Macedonian records appeared on data.europa.eu in the research snapshot.

Catalogue-size figures should not be interpreted as a ranking because portals count different units such as datasets, directory records, metadata records and register records.

## Application pages

### Overview

Provides the research question, key facts, cross-portal overview, main findings and overall conclusion.

### North Macedonia

Provides detailed analysis of:

- catalogue size;
- publishers;
- themes;
- formats;
- machine readability;
- licensing;
- metadata activity;
- EU discoverability;
- opportunities supported by the collected evidence.

### Compare

Allows comparison of two to four national portals.

The EU aggregator and Serbia can optionally be added for additional context.

### Portal pages

Individual pages are available for:

- United Kingdom
- United States
- Germany
- France
- Netherlands
- Spain
- European Union
- Serbia

### Methodology

Documents:

- the Data Science process;
- data collection;
- research snapshot methodology;
- data cleaning;
- format normalisation;
- theme mapping;
- derived indicators;
- data limitations;
- validation readings;
- source register;
- downloadable data tables.

## Evidence and reproducibility

Values displayed in the application are connected to their underlying evidence.

The application includes:

- source records;
- retrieval times;
- snapshot layers;
- data definitions;
- derived-value formulas;
- downloadable CSV files;
- SHA-256 checksums for frozen research tables.

Project-defined indicators are clearly labelled and are not presented as official quality ratings.

## Technology

The application is built with:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Recharts

The data layer uses local CSV files validated during the build process.

## Run the project

Requirements:

- Node.js 20.9 or later

Install dependencies:

```bash
npm install
```

Run the development version:

```bash
npm run dev
```

Create and run a production build:

```bash
npm run build
npm start
```

Additional checks:

```bash
npm run data
npm test
npm run lint
npm run typecheck
npm run audit:numbers
```

## Limitations

- Open-data portal totals change over time.
- Different portals use different counting units and definitions.
- Some portals include restricted or non-public records.
- The EU portal is an aggregator and is therefore not ranked against national portals.
- Theme systems differ between countries, so themes are not forcefully mapped where a reliable crosswalk is unavailable.
- Missing information is not interpreted as zero.
- Metadata activity does not necessarily mean that the underlying dataset itself was updated.
- Project-defined indicators are analytical rules used by this project and are not official ratings.
- No composite score or overall country ranking is produced.
