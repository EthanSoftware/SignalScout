
# SignalScout

An open-source local business opportunity discovery platform.

Owned by Ethan Software.

## Features

- Public business discovery.
- Location-based research.
- Business category filters.
- Public website identification.
- Google PageSpeed mobile analysis.
- Lighthouse SEO analysis.
- Accessibility analysis.
- JSON export.
- CSV export.
- Three-page dashboard.
- No automated outreach.

## Requirements

Python 3.10 or newer.

## Installation

Clone or download the project.

Run:

```bash
python scanner.py --area "San Jose, California, USA"
```

Choose a business category:

```bash
python scanner.py --area "San Jose, California, USA" --category restaurant
```

Limit results:

```bash
python scanner.py --area "San Jose, California, USA" --limit 30
```

## Start website

```bash
python -m http.server 8000
```

Open:

http://localhost:8000

## Public APIs

- OpenStreetMap
- Nominatim
- Overpass API
- Google PageSpeed Insights

## License

MIT
