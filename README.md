# SignalScout

**Open-source local business discovery, available as a live browser search and Python CLI.**

[Launch the browser scanner](https://signalscout.wasner.app/scanner.html) · [GitHub: EthanSoftware/SignalScout](https://github.com/EthanSoftware/SignalScout) · [Contact](mailto:ethansoftware@outlook.com)

SignalScout helps users research publicly listed local businesses. The browser scanner geocodes a place with Open-Meteo and directly queries OpenStreetMap through Overpass API. It prioritizes businesses whose community-maintained listing includes a website and displays other publicly listed details when present. Results are not independently verified. The optional Python CLI remains available for local scans and PageSpeed audits.

## Run in your browser

Open <https://signalscout.wasner.app/scanner.html>, enter a city, choose a category and radius, then select **Search public listings**. No account or Python installation is needed for browser search. The browser sends requests directly to Open-Meteo and Overpass; public API availability, browser CORS behavior, and provider limits may vary. A **Random** button selects a sample location, while popular-city shortcuts provide examples. Export results as JSON or CSV.

If browser API requests are unavailable, use the Python command-line scanner below.

## Run with Python

Requires Python 3.10+; no third-party packages are required.

```bash
git clone https://github.com/EthanSoftware/SignalScout.git
cd SignalScout
python scanner.py --area "San Jose, California, USA" --category restaurant --limit 30
```

The CLI writes `leads.json` and `leads.csv` in the project directory. Optionally set `PAGESPEED_API_KEY` to use your own Google PageSpeed Insights quota. Treat generated exports as your data; avoid publishing them unintentionally.

To preview the static pages locally, run `python -m http.server 8000` and open <http://localhost:8000>.

## Pages

- [Live scanner](https://signalscout.wasner.app/scanner.html): browser-side public-data search and exports.
- [Methodology](https://signalscout.wasner.app/methodology.html): data handling and limitations.
- [Data sources](https://signalscout.wasner.app/api.html): active integrations and optional APIs.
- [About](https://signalscout.wasner.app/about.html), [FAQ](https://signalscout.wasner.app/faq.html), and [Contributing](https://signalscout.wasner.app/contribute.html).
- [Terms](https://signalscout.wasner.app/terms.html) and [Privacy](https://signalscout.wasner.app/privacy.html).

## Sources and responsible use

Browser search uses Open-Meteo Geocoding API for place lookup and Overpass API to query OpenStreetMap. OSM businesses may have optional `website`, `phone`, `email`, and `opening_hours` tags; their presence and accuracy depend on community mapping. Public services have independent policies and can rate limit requests. Respect their usage terms. OpenStreetMap attribution: © OpenStreetMap contributors, data available under ODbL. SignalScout does not automate outreach and is not intended for sensitive personal-data collection.

Read the [Terms of Use](terms.html) and [Privacy Notice](privacy.html). Questions: ethansoftware@outlook.com.

## License

See [LICENCE](LICENCE). Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).