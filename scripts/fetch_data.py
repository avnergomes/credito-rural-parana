#!/usr/bin/env python3
"""
Baixa os microdados do SICOR (BCB) usados pelo painel.

A API Olinda/SICOR v2 passou a responder HTTP 500 em praticamente todos os
endpoints (jul/2026 em diante); os arquivos brutos publicados em
https://www.bcb.gov.br/htms/sicor/ continuam atualizados e trazem a
granularidade de operação (produto, programa, fonte, município).

Arquivos baixados para data/raw/sicor/ (fora do git):
- SICOR_OPERACAO_BASICA_ESTADO_<ANO>.gz  operações (todas as UFs) por ano
- SICOR_COMPLEMENTO_OPERACAO_BASICA.gz   município IBGE por operação
- SICOR_MUTUARIOS.gz                     sexo/tipo do mutuário (CPF descartado na leitura)
- tabelas de domínio (*.csv)
"""

import sys
import time
from datetime import datetime
from pathlib import Path

import requests

BASE = "https://www.bcb.gov.br/htms/sicor"
RAW_DIR = Path(__file__).parent.parent / "data" / "raw" / "sicor"
ANO_INICIAL = 2013  # primeiro ano publicado pelo BCB
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; credito-rural-parana-pipeline)"}
MAX_RETRIES = 4
TIMEOUT = (30, 300)

DOMINIOS = [
    "Empreendimento.csv", "Programa.csv", "Subprogramas.csv", "FonteRecursos.csv",
    "CategoriaEmitente.csv", "TipoBeneficiario.csv", "Atividade.csv", "Modalidade.csv",
]
AUXILIARES = ["SICOR_COMPLEMENTO_OPERACAO_BASICA.gz", "SICOR_MUTUARIOS.gz"]


def remote_size(url: str) -> int | None:
    """Content-Length do arquivo remoto; None se não existir (404)."""
    for attempt in range(MAX_RETRIES):
        try:
            r = requests.head(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return int(r.headers.get("Content-Length", -1))
        except requests.RequestException as e:
            print(f"    HEAD falhou ({attempt + 1}/{MAX_RETRIES}): {e}")
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"HEAD persistente falhou: {url}")


def download(url: str, dest: Path, size: int) -> None:
    """Baixa em streaming para .part e renomeia; pula se o tamanho local já confere."""
    if dest.exists() and size > 0 and dest.stat().st_size == size:
        print(f"  {dest.name}: em cache ({size / 1e6:.1f} MB)")
        return
    tmp = dest.with_suffix(dest.suffix + ".part")
    for attempt in range(MAX_RETRIES):
        try:
            with requests.get(url, headers=HEADERS, timeout=TIMEOUT, stream=True) as r:
                r.raise_for_status()
                with open(tmp, "wb") as f:
                    for chunk in r.iter_content(chunk_size=1 << 20):
                        f.write(chunk)
            got = tmp.stat().st_size
            if size > 0 and got != size:
                raise IOError(f"tamanho {got} != esperado {size}")
            tmp.replace(dest)
            print(f"  {dest.name}: {got / 1e6:.1f} MB")
            return
        except (requests.RequestException, IOError) as e:
            print(f"    download falhou ({attempt + 1}/{MAX_RETRIES}): {e}")
            time.sleep(15 * (attempt + 1))
    raise RuntimeError(f"Download persistente falhou: {url}")


def main() -> None:
    print(f"SICOR microdados -> {RAW_DIR}  ({datetime.now():%Y-%m-%d %H:%M})")
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    alvos = [(f"{BASE}/{n}", n) for n in DOMINIOS]
    alvos += [(f"{BASE}/DadosBrutos/{n}", n) for n in AUXILIARES]
    for ano in range(ANO_INICIAL, datetime.now().year + 1):
        n = f"SICOR_OPERACAO_BASICA_ESTADO_{ano}.gz"
        alvos.append((f"{BASE}/DadosBrutos/{n}", n))

    faltando = []
    for url, nome in alvos:
        size = remote_size(url)
        if size is None:
            # Ano corrente pode ainda não ter sido publicado em janeiro.
            print(f"  {nome}: não publicado (404)")
            faltando.append(nome)
            continue
        download(url, RAW_DIR / nome, size)

    obrigatorios = set(DOMINIOS) | set(AUXILIARES)
    criticos = [n for n in faltando if n in obrigatorios]
    if criticos or len(faltando) > 1:
        print(f"ERRO: arquivos ausentes: {', '.join(faltando)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
