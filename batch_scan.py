#!/usr/bin/env python3
"""Run repeatable SignalScout searches across multiple public locations."""

import argparse
import csv
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import scanner


def main():
    parser = argparse.ArgumentParser(description="Batch-search public business listings across multiple locations.")
    parser.add_argument("--areas", required=True, help='Semicolon-separated locations, e.g. "Austin, TX;Portland, OR;London, UK"')
    parser.add_argument("--category", choices=scanner.CATEGORIES, default="all")
    parser.add_argument("--limit", type=int, default=30, help="Maximum listings per location (1–100).")
    parser.add_argument("--delay", type=float, default=2.0, help="Pause in seconds between location searches (minimum 1).")
    parser.add_argument("--output", default="signalscout-batch", help="Output filename prefix (JSON and CSV).")
    args = parser.parse_args()

    areas = [area.strip() for area in args.areas.split(";") if area.strip()]
    if not areas:
        parser.error("Provide at least one location separated by semicolons.")
    if len(areas) > 20:
        parser.error("A batch is limited to 20 locations per run; split larger jobs and respect provider policies.")
    if not 1 <= args.limit <= 100:
        parser.error("Limit must be between 1 and 100.")
    if args.delay < 1:
        parser.error("Delay must be at least one second to avoid overloading public services.")

    results = []
    for index, area in enumerate(areas, start=1):
        print(f"[{index}/{len(areas)}] Searching {area} …")
        try:
            bounds = scanner.locate_area(area)
            elements = scanner.discover_businesses(bounds, args.category)
            # Keep listings with websites first, but include other named businesses as useful context.
            leads = scanner.build_leads(elements, area, args.limit)
            leads.sort(key=lambda lead: (not bool(lead.get("website")), (lead.get("name") or "").casefold()))
            for lead in leads:
                lead["search_area"] = area
            results.extend(leads)
            print(f"  Found {len(leads)} named public listings ({sum(bool(lead.get('website')) for lead in leads)} with a website tag).")
        except Exception as error:
            print(f"  Search failed: {type(error).__name__}. Continuing with the next location.")
        if index < len(areas):
            time.sleep(args.delay)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "category": args.category,
        "areas": areas,
        "attribution": "© OpenStreetMap contributors. Data available under ODbL.",
        "leads": results,
    }
    prefix = Path(args.output)
    json_path = prefix.with_suffix(".json")
    csv_path = prefix.with_suffix(".csv")
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    fields = ["search_area", "name", "category", "address", "website", "phone", "performance_score", "seo_score", "accessibility_score", "status", "osm_id"]
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(results)
    print(f"\nBatch complete: {len(results)} listings across {len(areas)} locations.")
    print(f"JSON: {json_path}\nCSV:  {csv_path}")


if __name__ == "__main__":
    main()
