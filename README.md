# SignalScout

**Free, open-source local business search—with working browser search on the homepage and optional Python automation.**

[Search now](https://signalscout.wasner.app/) · [GitHub: EthanSoftware/SignalScout](https://github.com/EthanSoftware/SignalScout) · [Contact](mailto:ethansoftware@outlook.com)

## Use the website for free

Open <https://signalscout.wasner.app/>. The homepage contains the live search: enter a city or place, select a category, radius and result limit, then click **Search public listings**. It finds publicly mapped businesses with website tags and displays available public listing details and source links. Download results as JSON or CSV. No account, payment, Python install, or SignalScout backend is required.

Browser searches call Open-Meteo's public geocoding service and the OpenStreetMap Overpass API directly from your browser. Provider availability, fair-use limits, network rules and map coverage apply. Search data is not sent to or stored by a SignalScout server. Results reflect community-contributed map tags and are not independently verified. OpenStreetMap attribution: © OpenStreetMap contributors, ODbL.

## Optional Python automation

Python 3.10+; standard library only.

```bash
python scanner.py --area "San Jose, California, USA" --category restaurant --limit 30
python batch_scan.py --areas "Austin, Texas, USA;Portland, Oregon, USA;London, United Kingdom" --category restaurant --limit 30
```

`batch_scan.py` runs spaced searches over up to 20 places, prioritizes website-listed results, and writes JSON and CSV files. Keep the delay respectful of public providers. The single-location scanner can optionally use Google PageSpeed Insights with your own `PAGESPEED_API_KEY`. Avoid sharing generated files unintentionally.

To preview locally, run `python -m http.server 8000` and visit <http://localhost:8000/>.

## Project pages

- [Homepage live search](https://signalscout.wasner.app/)
- [Methodology](methodology.html) and [public data sources](api.html)
- [Python guide](guide.html), [FAQ](faq.html), [About](about.html), and [Contributing](CONTRIBUTING.md)
- [Terms](terms.html) and [Privacy](privacy.html)

## Responsible use

Use public data lawfully and respectfully. Respect provider terms, quotas, attribution and licensing. Do not overload endpoints, collect sensitive personal information, or automate unsolicited outreach. Verify findings independently; a missing map listing does not prove a business or website does not exist.

## License

See [LICENCE](LICENCE).