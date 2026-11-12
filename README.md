# SignalScout

**Open-source local business discovery and website research — available as a Python CLI and a lightweight multi-page website.**

Website: [signalscout.wasner.app](https://signalscout.wasner.app) · Contact: [ethansoftware@outlook.com](mailto:ethansoftware@outlook.com)

SignalScout helps you explore publicly listed local businesses and review publicly available website quality signals. It is a research aid, not a lead-verification or outreach tool. The Python scanner uses OpenStreetMap's Nominatim and Overpass services for location and business discovery, and Google PageSpeed Insights for optional website audits. The website can display JSON results produced by the Python scanner.

## Features

- Python command-line scanner and browser-based, multi-page site.
- Location and category filters for public business listings.
- Optional mobile Lighthouse performance, SEO, and accessibility metrics.
- JSON and CSV exports; browser results dashboard.
- API directory documenting 15 public APIs and data services, with active integrations clearly identified.
- Documentation, Terms of Use, Privacy Notice, sitemap, and crawler guidance.
- No account collection, private data collection, or automated outreach.

## Run with Python

Requires Python 3.10 or newer. No third-party Python packages are needed.

```bash
python scanner.py --area "San Jose, California, USA"
python scanner.py --area "San Jose, California, USA" --category restaurant --limit 30
```

Optional: set `PAGESPEED_API_KEY` in your environment to use your own Google PageSpeed Insights quota. The scanner writes `leads.json` and `leads.csv` beside `scanner.py`; do not publish those files if you do not intend to make your search results public.

## Run the website locally

Serve the repository root (rather than opening files directly) so browser `fetch()` can load results:

```bash
python -m http.server 8000
```

Visit <http://localhost:8000>. The scanner page provides a copyable Python command. Run it in a terminal, then refresh the page to view the generated `leads.json`.

## Public API directory

See [APIs and data sources](api.html) for 15 publicly documented services. SignalScout currently calls Nominatim, Overpass API, and Google PageSpeed Insights from Python; the remaining entries are optional sources, not claims of live integrations. Third-party quotas, credentials, terms, and availability are controlled by their respective providers. The browser does not proxy requests through a SignalScout server.

## Responsible use and attribution

Use public data only for lawful, respectful research. Respect each provider's terms, attribution requirements, rate limits, and caching policies. Verify findings independently; directory omissions do not mean a business lacks a website, and automated scores are not search rankings. Do not use the project to collect sensitive personal information, evade access controls, or automate unsolicited contact. OpenStreetMap data is © OpenStreetMap contributors and available under the Open Database License (ODbL).

Read the [Terms of Use](terms.html) and [Privacy Notice](privacy.html). Questions: [ethansoftware@outlook.com](mailto:ethansoftware@outlook.com).

## License

See [LICENCE](LICENCE).