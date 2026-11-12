
#!/usr/bin/env python3

import argparse
import csv
import json
import os
import socket
import ipaddress
import time

from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

BASE_DIR = Path(__file__).resolve().parent

NOMINATIM = "https://nominatim.openstreetmap.org/search"
OVERPASS = "https://overpass-api.de/api/interpreter"
PAGESPEED = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"

HEADERS = {
    "User-Agent": "SignalScout/1.0 (public business research tool)",
    "Accept": "application/json"
}

CATEGORIES = {
    "all": [
        '["shop"]',
        '["office"]',
        '["amenity"~"restaurant|cafe|fast_food"]',
        '["leisure"~"fitness_centre|sports_centre"]',
        '["shop"="car_repair"]'
    ],
    "restaurant": [
        '["amenity"~"restaurant|cafe|fast_food"]'
    ],
    "retail": [
        '["shop"]'
    ],
    "beauty": [
        '["shop"~"hairdresser|beauty|massage"]'
    ],
    "professional": [
        '["office"]'
    ],
    "fitness": [
        '["leisure"~"fitness_centre|sports_centre"]'
    ],
    "automotive": [
        '["shop"="car_repair"]'
    ]
}


def request_json(url, data=None, timeout=35):

    request = Request(
        url,
        data=data,
        headers=HEADERS
    )

    with urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def locate_area(area):

    params = urlencode({
        "q": area,
        "format": "jsonv2",
        "limit": 1
    })

    results = request_json(
        NOMINATIM + "?" + params
    )

    if not results:
        raise ValueError("Location could not be found.")

    result = results[0]

    return (
        float(result["south"]),
        float(result["west"]),
        float(result["north"]),
        float(result["east"])
    )


def discover_businesses(bounds, category):

    south, west, north, east = bounds

    clauses = []

    for category_filter in CATEGORIES[category]:

        clauses.append(
            f'nwr{category_filter}({south},{west},{north},{east});'
        )

    query = (
        "[out:json][timeout:35];"
        "(" + "".join(clauses) + ");"
        "out center tags;"
    )

    body = urlencode({"data": query}).encode()

    request = Request(
        OVERPASS,
        data=body,
        headers={
            **HEADERS,
            "Content-Type": "application/x-www-form-urlencoded"
        }
    )

    with urlopen(request, timeout=45) as response:
        return json.loads(
            response.read().decode("utf-8")
        ).get("elements", [])


def safe_website(value):

    if not value:
        return None

    value = value.strip()

    if not value.startswith(("http://", "https://")):
        value = "https://" + value

    try:

        parsed = urlparse(value)

        if parsed.scheme not in ("http", "https"):
            return None

        if not parsed.hostname:
            return None

        if parsed.username or parsed.password:
            return None

        host = parsed.hostname.lower()

        if host == "localhost" or host.endswith(
            (".local", ".internal")
        ):
            return None

        try:
            address = ipaddress.ip_address(host)

            if not address.is_global:
                return None

        except ValueError:

            addresses = socket.getaddrinfo(
                host,
                parsed.port or 443
            )

            for address in addresses:

                ip = ipaddress.ip_address(
                    address[4][0]
                )

                if not ip.is_global:
                    return None

        return value

    except Exception:
        return None


def analyze_website(website):

    parameters = {
        "url": website,
        "strategy": "mobile",
        "category": [
            "performance",
            "seo",
            "accessibility"
        ]
    }

    api_key = os.environ.get("PAGESPEED_API_KEY")

    if api_key:
        parameters["key"] = api_key

    query = urlencode(parameters, doseq=True)

    result = request_json(
        PAGESPEED + "?" + query,
        timeout=90
    )

    categories = result.get(
        "lighthouseResult", {}
    ).get("categories", {})

    def get_score(name):

        score = categories.get(
            name, {}
        ).get("score")

        if isinstance(score, (int, float)):
            return round(score * 100)

        return None

    return {
        "performance_score": get_score("performance"),
        "seo_score": get_score("seo"),
        "accessibility_score": get_score("accessibility")
    }


def build_leads(elements, area, limit):

    leads = []
    seen = set()

    for item in elements:

        tags = item.get("tags", {})
        name = tags.get("name")

        if not name:
            continue

        key = name.lower()

        if key in seen:
            continue

        seen.add(key)

        website = safe_website(
            tags.get("website")
            or tags.get("contact:website")
        )

        center = item.get("center", item)

        address_parts = [
            tags.get("addr:housenumber"),
            tags.get("addr:street"),
            tags.get("addr:city") or area
        ]

        address = ", ".join(
            part for part in address_parts if part
        )

        leads.append({
            "name": name,
            "category": tags.get(
                "shop",
                tags.get("office", tags.get("amenity", "Business"))
            ),
            "address": address,
            "website": website,
            "latitude": center.get("lat"),
            "longitude": center.get("lon"),
            "osm_id": item.get("id"),
            "performance_score": None,
            "seo_score": None,
            "accessibility_score": None,
            "status": (
                "no_website_listed"
                if not website else "unreviewed"
            ),
            "evidence_note": (
                "No website listed in OpenStreetMap. "
                "This does not prove the business has no website."
                if not website else
                "Website listed; awaiting performance analysis."
            )
        })

        if len(leads) >= limit:
            break

    return leads


def run_scan(args):

    print("Locating area:", args.area)

    bounds = locate_area(args.area)

    print("Discovering public business listings...")

    elements = discover_businesses(
        bounds,
        args.category
    )

    leads = build_leads(
        elements,
        args.area,
        args.limit
    )

    for index, lead in enumerate(leads, 1):

        if not lead["website"]:
            continue

        print(
            f"[{index}/{len(leads)}] "
            f"Analyzing {lead['name']}"
        )

        try:

            scores = analyze_website(
                lead["website"]
            )

            lead.update(scores)

            performance = scores["performance_score"]
            seo = scores["seo_score"]

            if (
                performance is not None
                and performance < 50
            ) or (
                seo is not None
                and seo < 70
            ):

                lead["status"] = "review"

            else:
                lead["status"] = "measured"

            lead["evidence_note"] = (
                "Mobile Lighthouse scores available. "
                "Manual review is recommended."
            )

        except Exception as error:

            print("Website check failed:", type(error).__name__)

            lead["status"] = "check_failed"

            lead["evidence_note"] = (
                "Website audit did not complete."
            )

        time.sleep(1.5)

    return leads


def save_results(leads, args):

    payload = {
        "generated_at": datetime.now(
            timezone.utc
        ).isoformat(),

        "area": args.area,
        "category": args.category,

        "attribution": (
            "© OpenStreetMap contributors. "
            "Data available under ODbL."
        ),

        "leads": leads
    }

    json_path = BASE_DIR / "leads.json"

    csv_path = BASE_DIR / "leads.csv"

    json_path.write_text(
        json.dumps(payload, indent=2),
        encoding="utf-8"
    )

    fields = [
        "name",
        "category",
        "address",
        "website",
        "performance_score",
        "seo_score",
        "accessibility_score",
        "status",
        "osm_id"
    ]

    with csv_path.open(
        "w",
        newline="",
        encoding="utf-8"
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fields
        )

        writer.writeheader()

        for lead in leads:
            writer.writerow({
                field: lead.get(field)
                for field in fields
            })

    print()
    print("Scan completed.")
    print("Businesses:", len(leads))
    print("JSON:", json_path)
    print("CSV:", csv_path)


def main():

    parser = argparse.ArgumentParser(
        description="SignalScout business opportunity scanner"
    )

    parser.add_argument(
        "--area",
        required=True
    )

    parser.add_argument(
        "--category",
        choices=CATEGORIES.keys(),
        default="all"
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=30
    )

    args = parser.parse_args()

    if not 1 <= args.limit <= 100:
        parser.error("Limit must be between 1 and 100.")

    leads = run_scan(args)

    save_results(leads, args)


if __name__ == "__main__":
    main()
