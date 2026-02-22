#!/usr/bin/env python3
"""
Process raw BCB/SICOR data into aggregated JSON files for the dashboard.
Generates aggregated.json and detailed.json.
"""

import json
from pathlib import Path
from datetime import datetime
from collections import defaultdict

import pandas as pd
import numpy as np

# Directories
SCRIPT_DIR = Path(__file__).parent
RAW_DIR = SCRIPT_DIR.parent / "data" / "raw"
OUTPUT_DIR = SCRIPT_DIR.parent / "dashboard" / "public" / "data"


def load_raw_data(filename: str) -> list:
    """Load raw JSON data file."""
    filepath = RAW_DIR / f"{filename}.json"
    if not filepath.exists():
        print(f"Warning: {filepath} not found")
        return []

    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def process_custeio_municipio():
    """Process CusteioMunicipioProduto data."""
    data = load_raw_data("CusteioMunicipioProduto")
    if not data:
        return pd.DataFrame()

    df = pd.DataFrame(data)
    df["finalidade"] = "CUSTEIO"
    return df


def process_invest_municipio():
    """Process InvestMunicipioProduto data."""
    data = load_raw_data("InvestMunicipioProduto")
    if not data:
        return pd.DataFrame()

    df = pd.DataFrame(data)
    df["finalidade"] = "INVESTIMENTO"
    return df


def process_comerc_produto():
    """Process ComercRegiaoUFProduto data."""
    data = load_raw_data("ComercRegiaoUFProduto")
    if not data:
        return pd.DataFrame()

    df = pd.DataFrame(data)
    df["finalidade"] = "COMERCIALIZACAO"
    return df


def standardize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Standardize column names across different data sources."""
    # Common column mappings
    column_map = {
        "AnoEmissao": "ano",
        "MesEmissao": "mes",
        "codMunic": "codMunic",
        "Municipio": "municipio",
        "Uf": "uf",
        "Produto": "produto",
        "Atividade": "atividade",
        "QtdContrato": "contratos",
        "VlContrato": "valor",
        "AreaFinanciada": "area",
        "Programa": "programa",
        "SubPrograma": "subprograma",
        "Genero": "genero",
        "TipoBeneficiario": "tipoPessoa",
        "FaixaValor": "faixaValor",
        "FonteRecursos": "fonteRecursos",
        "NomeIF": "instituicao",
        "Segmento": "segmento",
    }

    # Rename columns that exist
    df = df.rename(columns={k: v for k, v in column_map.items() if k in df.columns})

    # Convert numeric columns
    numeric_cols = ["ano", "mes", "contratos", "valor", "area"]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # Convert year/month to int
    if "ano" in df.columns:
        df["ano"] = df["ano"].astype(int)
    if "mes" in df.columns:
        df["mes"] = df["mes"].astype(int)

    return df


def aggregate_by_year(df: pd.DataFrame) -> list:
    """Aggregate data by year."""
    if df.empty:
        return []

    grouped = df.groupby("ano").agg({
        "valor": "sum",
        "contratos": "sum",
        "area": "sum",
    }).reset_index()

    return grouped.to_dict(orient="records")


def aggregate_by_month(df: pd.DataFrame) -> list:
    """Aggregate data by year and month."""
    if df.empty or "mes" not in df.columns:
        return []

    grouped = df.groupby(["ano", "mes"]).agg({
        "valor": "sum",
        "contratos": "sum",
        "area": "sum",
    }).reset_index()

    return grouped.to_dict(orient="records")


def aggregate_by_finalidade(df: pd.DataFrame) -> list:
    """Aggregate data by finalidade."""
    if df.empty or "finalidade" not in df.columns:
        return []

    grouped = df.groupby(["ano", "finalidade"]).agg({
        "valor": "sum",
        "contratos": "sum",
        "area": "sum",
    }).reset_index()

    return grouped.to_dict(orient="records")


def aggregate_by_programa(df: pd.DataFrame) -> list:
    """Aggregate data by programa."""
    if df.empty or "programa" not in df.columns:
        return []

    grouped = df.groupby("programa").agg({
        "valor": "sum",
        "contratos": "sum",
        "area": "sum",
    }).reset_index()

    return grouped.sort_values("valor", ascending=False).to_dict(orient="records")


def aggregate_by_produto(df: pd.DataFrame, top_n: int = 50) -> list:
    """Aggregate data by produto (top N)."""
    if df.empty or "produto" not in df.columns:
        return []

    grouped = df.groupby("produto").agg({
        "valor": "sum",
        "contratos": "sum",
        "area": "sum",
    }).reset_index()

    return grouped.nlargest(top_n, "valor").to_dict(orient="records")


def aggregate_by_municipio(df: pd.DataFrame, top_n: int = 100) -> list:
    """Aggregate data by municipio (top N)."""
    if df.empty or "municipio" not in df.columns:
        return []

    grouped = df.groupby(["codMunic", "municipio"]).agg({
        "valor": "sum",
        "contratos": "sum",
        "area": "sum",
    }).reset_index()

    return grouped.nlargest(top_n, "valor").to_dict(orient="records")


def process_genero():
    """Process gender distribution data."""
    data = load_raw_data("RegiaoUFGenero")
    if not data:
        return {"masculino": 0, "feminino": 0}

    df = pd.DataFrame(data)
    df = standardize_columns(df)

    if "genero" not in df.columns:
        return {"masculino": 0, "feminino": 0}

    totals = df.groupby("genero")["valor"].sum().to_dict()

    return {
        "masculino": totals.get("MASCULINO", 0),
        "feminino": totals.get("FEMININO", 0),
    }


def process_tipo_pessoa():
    """Process legal entity type data."""
    data = load_raw_data("SegmentoTipoPessoa")
    if not data:
        return {"pf": 0, "pj": 0}

    df = pd.DataFrame(data)
    df = standardize_columns(df)

    # This needs proper field mapping - placeholder
    return {"pf": 0, "pj": 0}


def build_sankey_data(df: pd.DataFrame) -> dict:
    """Build Sankey chart data (nodes and links)."""
    if df.empty:
        return {"nodes": [], "links": []}

    # Get top 10 products
    top_produtos = df.groupby("produto")["valor"].sum().nlargest(10).index.tolist()

    # Filter to top products
    df_filtered = df[df["produto"].isin(top_produtos)]

    # Build nodes
    programas = df_filtered["programa"].dropna().unique().tolist() if "programa" in df_filtered.columns else []
    finalidades = df_filtered["finalidade"].dropna().unique().tolist() if "finalidade" in df_filtered.columns else []

    nodes = []
    node_map = {}

    for p in programas:
        node_map[f"prog_{p}"] = len(nodes)
        nodes.append({"id": f"prog_{p}", "label": p})

    for f in finalidades:
        node_map[f"fin_{f}"] = len(nodes)
        nodes.append({"id": f"fin_{f}", "label": f})

    for p in top_produtos:
        node_map[f"prod_{p}"] = len(nodes)
        nodes.append({"id": f"prod_{p}", "label": p})

    # Build links
    links = []

    # Programa -> Finalidade
    if "programa" in df_filtered.columns and "finalidade" in df_filtered.columns:
        prog_fin = df_filtered.groupby(["programa", "finalidade"])["valor"].sum().reset_index()
        for _, row in prog_fin.iterrows():
            source = node_map.get(f"prog_{row['programa']}")
            target = node_map.get(f"fin_{row['finalidade']}")
            if source is not None and target is not None:
                links.append({
                    "source": source,
                    "target": target,
                    "value": float(row["valor"]),
                })

    # Finalidade -> Produto
    if "finalidade" in df_filtered.columns:
        fin_prod = df_filtered.groupby(["finalidade", "produto"])["valor"].sum().reset_index()
        for _, row in fin_prod.iterrows():
            source = node_map.get(f"fin_{row['finalidade']}")
            target = node_map.get(f"prod_{row['produto']}")
            if source is not None and target is not None:
                links.append({
                    "source": source,
                    "target": target,
                    "value": float(row["valor"]),
                })

    return {"nodes": nodes, "links": links}


def build_bump_data(df: pd.DataFrame, top_n: int = 20) -> list:
    """Build bump chart data (ranking over years)."""
    if df.empty or "municipio" not in df.columns:
        return []

    # Get ranking per year
    result = []
    years = sorted(df["ano"].unique())

    for year in years:
        year_df = df[df["ano"] == year]
        grouped = year_df.groupby("municipio")["valor"].sum().reset_index()
        grouped = grouped.nlargest(top_n, "valor")
        grouped["rank"] = range(1, len(grouped) + 1)
        grouped["ano"] = year

        result.extend(grouped.to_dict(orient="records"))

    return result


def main():
    """Main processing function."""
    print("=" * 60)
    print("BCB/SICOR Data Processor")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load and combine data
    print("\nLoading raw data...")
    df_custeio = process_custeio_municipio()
    df_invest = process_invest_municipio()
    df_comerc = process_comerc_produto()

    # Standardize columns
    df_custeio = standardize_columns(df_custeio)
    df_invest = standardize_columns(df_invest)
    df_comerc = standardize_columns(df_comerc)

    # Combine all data
    df_all = pd.concat([df_custeio, df_invest, df_comerc], ignore_index=True)

    if df_all.empty:
        print("Warning: No data loaded. Creating empty output files.")
        # Create minimal metadata
        metadata = {
            "anoMin": 2013,
            "anoMax": 2024,
            "totalMunicipios": 0,
            "totalContratos": 0,
            "totalValor": 0,
            "totalArea": 0,
            "ultimaAtualizacao": datetime.now().strftime("%Y-%m-%d"),
        }

        aggregated = {"metadata": metadata}

        with open(OUTPUT_DIR / "aggregated.json", "w", encoding="utf-8") as f:
            json.dump(aggregated, f, ensure_ascii=False, indent=2)

        print("Created empty aggregated.json")
        return

    print(f"Loaded {len(df_all)} total records")

    # Calculate metadata
    print("\nCalculating metadata...")
    metadata = {
        "anoMin": int(df_all["ano"].min()),
        "anoMax": int(df_all["ano"].max()),
        "totalMunicipios": int(df_all["municipio"].nunique()) if "municipio" in df_all.columns else 0,
        "totalContratos": int(df_all["contratos"].sum()),
        "totalValor": float(df_all["valor"].sum()),
        "totalArea": float(df_all["area"].sum()),
        "ultimaAtualizacao": datetime.now().strftime("%Y-%m-%d"),
        "periodoMaisRecente": f"{int(df_all['ano'].max())}-{int(df_all['mes'].max()):02d}" if "mes" in df_all.columns else str(int(df_all["ano"].max())),
    }

    # Generate aggregations
    print("\nGenerating aggregations...")

    aggregated = {
        "metadata": metadata,
        "filters": {
            "finalidades": df_all["finalidade"].dropna().unique().tolist() if "finalidade" in df_all.columns else [],
            "programas": df_all["programa"].dropna().unique().tolist() if "programa" in df_all.columns else [],
        },
        "byAno": aggregate_by_year(df_all),
        "byMes": aggregate_by_month(df_all),
        "byFinalidade": aggregate_by_finalidade(df_all),
        "byPrograma": aggregate_by_programa(df_all),
        "byProduto": aggregate_by_produto(df_all),
        "byMunicipio": aggregate_by_municipio(df_all),
        "byGenero": process_genero(),
        "byTipoPessoa": process_tipo_pessoa(),
        "sankey": build_sankey_data(df_all),
        "bump": build_bump_data(df_all),
    }

    # Save aggregated data
    print("\nSaving aggregated.json...")
    with open(OUTPUT_DIR / "aggregated.json", "w", encoding="utf-8") as f:
        json.dump(aggregated, f, ensure_ascii=False, indent=2)

    print(f"Saved aggregated.json ({(OUTPUT_DIR / 'aggregated.json').stat().st_size / 1024:.1f} KB)")

    # Save detailed data (for lazy loading)
    print("\nSaving detailed.json...")
    detailed = df_all.to_dict(orient="records")
    with open(OUTPUT_DIR / "detailed.json", "w", encoding="utf-8") as f:
        json.dump(detailed, f, ensure_ascii=False)

    print(f"Saved detailed.json ({(OUTPUT_DIR / 'detailed.json').stat().st_size / 1024 / 1024:.1f} MB)")

    print("\n" + "=" * 60)
    print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)


if __name__ == "__main__":
    main()
