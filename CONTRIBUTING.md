# Contributing to SignalScout

Thanks for helping improve an open-source public-data research tool!

## Ways to contribute

- Reproduce a bug or suggest an enhancement in GitHub Issues.
- Improve accessibility, documentation, tests, or browser compatibility.
- Propose additional responsibly used public-data providers with clear attribution and policies.
- Submit focused pull requests with a description of behavior and manual test steps.

## Development

The site uses vanilla HTML, CSS, and JavaScript. The Python CLI uses Python 3.10+ standard library modules. No build step is required. Serve the root with `python -m http.server 8000` to test the pages. The live scanner calls Open-Meteo Geocoding and Overpass from your browser; verify behavior with a small, low-volume search.

Before submitting, check that links work, pages are usable on mobile, user-provided text is not inserted as HTML, and API keys or personal scan exports are not included. Do not add unsolicited outreach automation or private-data collection. Respect upstream API usage policies and licensing.

## Pull requests

Open a pull request against the default branch and explain what changed, why it is useful, which files are affected, and how you tested it. For larger changes, open an issue for discussion first.
