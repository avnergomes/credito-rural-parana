#!/usr/bin/env python3
"""
Fetch data from BCB/SICOR API for Paraná state.
Downloads rural credit data - simplified version with retry logic.
"""

import json
import sys
import time
import requests
from pathlib import Path
from datetime import datetime

# Base URL for BCB/SICOR OData API
BASE_URL = "https://olinda.bcb.gov.br/olinda/servico/SICOR/versao/v2/odata"

# Directories
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "data" / "raw"

# Request settings - more conservative
MAX_RETRIES = 3
RETRY_DELAY = 10  # seconds - longer delay
REQUEST_DELAY = 2  # seconds between requests
PAGE_SIZE = 5000  # smaller page size to avoid 500 errors


def ensure_directories():
    """Create necessary directories if they don't exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def fetch_with_retry(url: str, max_retries: int = MAX_RETRIES) -> dict:
    """Fetch URL with retry logic."""
    for attempt in range(max_retries):
        try:
            print(f"    Request attempt {attempt + 1}...")
            response = requests.get(url, timeout=180)

            if response.status_code == 500:
                print(f"    Server error 500, waiting {RETRY_DELAY * (attempt + 1)}s...")
                time.sleep(RETRY_DELAY * (attempt + 1))
                continue

            response.raise_for_status()
            content_type = response.headers.get('Content-Type', '')
            if 'html' in content_type.lower():
                print(f"    WARNING: Received HTML instead of JSON (Content-Type: {content_type})")
                if attempt < max_retries - 1:
                    time.sleep(RETRY_DELAY * (attempt + 1))
                    continue
                raise ValueError(f"API returned HTML instead of JSON: {content_type}")
            return response.json()

        except requests.exceptions.RequestException as e:
            print(f"    Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                wait_time = RETRY_DELAY * (attempt + 1)
                print(f"    Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
            else:
                raise

    # Antes retornava {"value": []} — o pipeline seguia "verde" com dados
    # vazios e o dashboard congelava silenciosamente (500s persistentes).
    raise RuntimeError(f"Falha apos {max_retries} tentativas (HTTP 500 persistente): {url}")


def fetch_endpoint(endpoint: str, filter_expr: str = None) -> list:
    """Fetch all data from endpoint with pagination."""
    all_data = []
    skip = 0

    while True:
        # Build URL
        params = f"?$format=json&$top={PAGE_SIZE}&$skip={skip}"
        if filter_expr:
            params += f"&$filter={filter_expr}"

        url = f"{BASE_URL}/{endpoint}{params}"
        print(f"  Fetching skip={skip}...")

        try:
            data = fetch_with_retry(url)
            records = data.get("value", [])

            if not records:
                break

            all_data.extend(records)
            print(f"  Total: {len(all_data)} records")

            if len(records) < PAGE_SIZE:
                break

            skip += PAGE_SIZE
            time.sleep(REQUEST_DELAY)

        except Exception as e:
            # Propagar: salvar página parcial como se fosse o total corrompe o dataset
            print(f"  Error: {e}")
            raise

    return all_data


def save_data(name: str, data: list):
    """Save data to JSON file."""
    output_path = DATA_DIR / f"{name}.json"

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

    size_kb = output_path.stat().st_size / 1024
    print(f"  Saved {len(data)} records ({size_kb:.1f} KB)")


def main():
    print("=" * 60)
    print("BCB/SICOR Data Fetcher - Parana (Simplified)")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    ensure_directories()

    # Essential endpoints only - these have the main data we need
    endpoints = [
        # Regional data with OData filter
        ("RegiaoUF", "nomeUF eq 'PR'"),
        ("RegiaoUFGenero", "nomeUF eq 'PR'"),
        ("CusteioRegiaoUFProduto", "nomeUF eq 'PR'"),
        ("InvestRegiaoUFProduto", "nomeUF eq 'PR'"),
        ("ComercRegiaoUFProduto", "nomeUF eq 'PR'"),
        ("ProgramaSubprogramaRegiaoUF", "nomeUF eq 'PR'"),
        ("MunicipioUF", "nomeUF eq 'PR'"),

        # Reference tables (small, no filter)
        ("ProgramaSubprograma", None),
        ("Faixa", None),
    ]

    failed = []
    for endpoint, filter_expr in endpoints:
        print(f"\n{'='*40}")
        print(f"Fetching: {endpoint}")
        if filter_expr:
            print(f"Filter: {filter_expr}")
        print("=" * 40)

        try:
            data = fetch_endpoint(endpoint, filter_expr)

            if data:
                save_data(endpoint, data)
            else:
                print("  No data returned")
                failed.append(endpoint)

        except Exception as e:
            print(f"  FAILED: {e}")
            failed.append(endpoint)

        # Pause between endpoints
        print("  Waiting 3s before next endpoint...")
        time.sleep(3)

    fetch_ibge_municipios()

    print("\n" + "=" * 60)
    print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Summary
    print("\nFiles created:")
    for f in sorted(DATA_DIR.glob("*.json")):
        size_kb = f.stat().st_size / 1024
        print(f"  {f.name}: {size_kb:.1f} KB")

    if failed:
        # Falhar o job para o GitHub Actions notificar, em vez de seguir
        # "verde" com dados vazios/parciais.
        print(f"\nERRO: endpoints sem dados: {', '.join(failed)}")
        sys.exit(1)


def fetch_ibge_municipios():
    """Baixa o mapeamento codigo->nome dos municipios do PR (IBGE)."""
    print(f"\n{'='*40}")
    print("Fetching: ibge_municipios (IBGE localidades)")
    print("=" * 40)
    try:
        resp = requests.get(
            "https://servicodados.ibge.gov.br/api/v1/localidades/estados/PR/municipios",
            timeout=60,
        )
        resp.raise_for_status()
        municipios = {str(m["id"]): m["nome"] for m in resp.json()}
        with open(DATA_DIR / "ibge_municipios.json", "w", encoding="utf-8") as f:
            json.dump(municipios, f, ensure_ascii=False)
        print(f"  Saved {len(municipios)} municipios")
    except Exception as e:
        # Nao e fatal: o preprocess tem fallback para o nome vindo do BCB
        print(f"  AVISO: falha ao baixar municipios do IBGE: {e}")


if __name__ == "__main__":
    main()
