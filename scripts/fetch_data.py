#!/usr/bin/env python3
"""
Fetch data from BCB/SICOR API for Paraná state.
Downloads rural credit data from all relevant endpoints.
"""

import os
import json
import time
import requests
from pathlib import Path
from datetime import datetime
from tqdm import tqdm

# Base URL for BCB/SICOR OData API
BASE_URL = "https://olinda.bcb.gov.br/olinda/servico/SICOR/versao/v2/odata"

# Endpoints to fetch
ENDPOINTS = [
    "CusteioMunicipioProduto",
    "InvestMunicipioProduto",
    "ComercRegiaoUFProduto",
    "CusteioRegiaoUFProduto",
    "InvestRegiaoUFProduto",
    "RegiaoUF",
    "RegiaoUFGenero",
    "ProgramaSubprograma",
    "ProgramaSubprogramaRegiaoUF",
    "Faixa",
    "FaixaUF",
    "FonteRecursos",
    "FonteRecursosIF",
    "SegmentoIF",
    "SegmentoIFRegiaoUF",
    "SegmentoTipoPessoa",
]

# Directories
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "data" / "raw"

# Request settings
MAX_RETRIES = 5
RETRY_DELAY = 5  # seconds
REQUEST_DELAY = 1  # seconds between requests
PAGE_SIZE = 10000


def ensure_directories():
    """Create necessary directories if they don't exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def fetch_endpoint(endpoint: str) -> list:
    """
    Fetch all data from a single endpoint with pagination.
    Filters for Paraná state (Uf eq 'PR').
    """
    all_data = []
    skip = 0

    # Build base URL with filter for Paraná
    base_params = f"?$format=json&$filter=Uf eq 'PR'&$top={PAGE_SIZE}"

    while True:
        url = f"{BASE_URL}/{endpoint}{base_params}&$skip={skip}"

        for attempt in range(MAX_RETRIES):
            try:
                response = requests.get(url, timeout=120)
                response.raise_for_status()

                data = response.json()
                records = data.get("value", [])

                if not records:
                    return all_data

                all_data.extend(records)

                print(f"  Fetched {len(all_data)} records from {endpoint}...")

                if len(records) < PAGE_SIZE:
                    return all_data

                skip += PAGE_SIZE
                time.sleep(REQUEST_DELAY)
                break

            except requests.exceptions.RequestException as e:
                print(f"  Attempt {attempt + 1}/{MAX_RETRIES} failed: {e}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY * (attempt + 1))
                else:
                    print(f"  Failed to fetch {endpoint} after {MAX_RETRIES} attempts")
                    return all_data

    return all_data


def fetch_endpoint_no_uf_filter(endpoint: str) -> list:
    """
    Fetch data from endpoints that don't have Uf field.
    These are typically aggregate/reference tables.
    """
    all_data = []
    skip = 0

    base_params = f"?$format=json&$top={PAGE_SIZE}"

    while True:
        url = f"{BASE_URL}/{endpoint}{base_params}&$skip={skip}"

        for attempt in range(MAX_RETRIES):
            try:
                response = requests.get(url, timeout=120)
                response.raise_for_status()

                data = response.json()
                records = data.get("value", [])

                if not records:
                    return all_data

                all_data.extend(records)

                print(f"  Fetched {len(all_data)} records from {endpoint}...")

                if len(records) < PAGE_SIZE:
                    return all_data

                skip += PAGE_SIZE
                time.sleep(REQUEST_DELAY)
                break

            except requests.exceptions.RequestException as e:
                print(f"  Attempt {attempt + 1}/{MAX_RETRIES} failed: {e}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY * (attempt + 1))
                else:
                    print(f"  Failed to fetch {endpoint} after {MAX_RETRIES} attempts")
                    return all_data

    return all_data


def save_data(endpoint: str, data: list):
    """Save fetched data to JSON file."""
    output_path = DATA_DIR / f"{endpoint}.json"

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"  Saved {len(data)} records to {output_path.name}")


def main():
    """Main function to fetch all data."""
    print("=" * 60)
    print("BCB/SICOR Data Fetcher - Paraná")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    ensure_directories()

    # Endpoints that have Uf field (can be filtered)
    uf_endpoints = [
        "CusteioMunicipioProduto",
        "InvestMunicipioProduto",
        "ComercRegiaoUFProduto",
        "CusteioRegiaoUFProduto",
        "InvestRegiaoUFProduto",
        "RegiaoUF",
        "RegiaoUFGenero",
        "ProgramaSubprogramaRegiaoUF",
        "FaixaUF",
        "SegmentoIFRegiaoUF",
    ]

    # Endpoints without Uf field (reference tables)
    no_uf_endpoints = [
        "ProgramaSubprograma",
        "Faixa",
        "FonteRecursos",
        "FonteRecursosIF",
        "SegmentoIF",
        "SegmentoTipoPessoa",
    ]

    # Fetch endpoints with UF filter
    print("\nFetching PR-filtered endpoints...")
    for endpoint in tqdm(uf_endpoints, desc="PR endpoints"):
        print(f"\nFetching {endpoint}...")
        data = fetch_endpoint(endpoint)
        if data:
            save_data(endpoint, data)

    # Fetch reference endpoints (no UF filter)
    print("\nFetching reference endpoints...")
    for endpoint in tqdm(no_uf_endpoints, desc="Reference endpoints"):
        print(f"\nFetching {endpoint}...")
        data = fetch_endpoint_no_uf_filter(endpoint)
        if data:
            save_data(endpoint, data)

    print("\n" + "=" * 60)
    print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)


if __name__ == "__main__":
    main()
