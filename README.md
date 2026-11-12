# SignalScout

**Free, open-source local business discovery with browser search on the site and optional Python automation.**

[Open the free map search](https://signalscout.wasner.app/scanner.html) · [GitHub: EthanSoftware/SignalScout](https://github.com/EthanSoftware/SignalScout) · [Contact](mailto:ethansoftware@outlook.com)

## Search on the website—no Python required

Open <https://signalscout.wasner.app/> or the [map explorer](https://signalscout.wasner.app/scanner.html). Enter a place, choose category, radius, and result count, then search. Browse listings on the map, open their public source and listed website, and download JSON or CSV. Browser search is free and does not require an account. Search requests go directly from your browser to Open-Meteo and OpenStreetMap services; availability and fair-use limits are controlled by those providers. SignalScout does not receive or store the search request.

The explorer focuses on public OpenStreetMap business records with a website tag and shows additional community-submitted fields when available. Coverage and accuracy vary, so verify results independently. OSM attribution: © OpenStreetMap contributors, ODbL.

## Optional Python tools

Python 3.10+ and standard library only. Use Python if you want local automation or repeatable batch jobs; it is not needed to use the website.

```bash
python scanner.py --area "San Jose, California, USA" --category restaurant --limit 30
python batch_scan.py --areas "Austin, Texas, USA;Portland, Oregon, USA;London, United Kingdom" --category restaurant --limit 30
```

Batch scans support up to 20 locations per run and include pauses to respect public services. The single-location scanner can optionally use Google PageSpeed Insights with your own `PAGESPEED_API_KEY`. Generated JSON and CSV are saved locally; avoid publishing private exports unintentionally.

## Run locally

```bash
python -m http.server 8000
```

Visit <http://localhost:8000/>. Open the **Explore** page to search from the browser.

## More

- [Methodology](methodology.html) · [Public data sources](api.html) · [FAQ](faq.html)
- [About](about.html) · [Contributing](CONTRIBUTING.md) · [Terms](terms.html) · [Privacy](privacy.html)
- Source: [github.com/EthanSoftware/SignalScout](https://github.com/EthanSoftware/SignalScout)

## Responsible use

Use public data lawfully and respectfully. Respect provider terms, quotas, attribution, and licenses. Do not overload endpoints, collect sensitive personal information, or automate unsolicited outreach. A missing map listing does not prove a business or website does not exist.

## License

See [LICENCE](LICENCE).
