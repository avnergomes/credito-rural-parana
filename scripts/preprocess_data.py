#!/usr/bin/env python3
"""
Process raw BCB/SICOR data into aggregated JSON files for the dashboard.
Uses regional data (RegiaoUF endpoints) which have PR filter applied.
All aggregations include ano/mes for filtering support.
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
        print(f"  Warning: {filepath.name} not found")
        return []

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
        if isinstance(data, dict) and "value" in data:
            return data["value"]
        return data if isinstance(data, list) else []


def load_ibge_names() -> dict:
    """Load IBGE municipality names mapping."""
    filepath = RAW_DIR / "ibge_municipios.json"
    if not filepath.exists():
        print(f"  Warning: {filepath.name} not found")
        return {}
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def get_programa_name(cd_programa) -> str:
    """Map program code to name."""
    cd = str(cd_programa).strip()
    cd_int = int(cd) if cd.isdigit() else 0
    if cd_int == 1 or cd == "0001":
        return "PRONAF"
    elif cd_int == 50 or cd == "0050":
        return "PRONAMP"
    else:
        return "DEMAIS"


def process_regiao_uf() -> pd.DataFrame:
    """Process RegiaoUF data - main aggregated data by year/month."""
    data = load_raw_data("RegiaoUF")
    if not data:
        return pd.DataFrame()

    df = pd.DataFrame(data)
    print(f"  RegiaoUF: {len(df)} records")

    df = df.rename(columns={
        "AnoEmissao": "ano",
        "MesEmissao": "mes",
        "QtdCusteio": "contratos_custeio",
        "VlCusteio": "valor_custeio",
        "QtdInvestimento": "contratos_invest",
        "VlInvestimento": "valor_invest",
        "QtdComercializacao": "contratos_comerc",
        "VlComercializacao": "valor_comerc",
        "QtdIndustrializacao": "contratos_indust",
        "VlIndustrializacao": "valor_indust",
    })

    for col in df.columns:
        if col not in ["uf", "nomeUF", "nomeRegiao", "cdRegiao"]:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    df["ano"] = df["ano"].astype(int)
    df["mes"] = df["mes"].astype(int)
    return df


def process_produto_data() -> pd.DataFrame:
    """Process all produto data (custeio, invest, comerc) into one DataFrame."""
    dfs = []

    # Custeio
    data = load_raw_data("CusteioRegiaoUFProduto")
    if data:
        df = pd.DataFrame(data)
        print(f"  CusteioRegiaoUFProduto: {len(df)} records")
        df = df.rename(columns={
            "AnoEmissao": "ano", "MesEmissao": "mes",
            "nomeProduto": "produto", "VlCusteio": "valor",
            "QtdCusteio": "contratos", "AreaCusteio": "area",
        })
        if "produto" in df.columns:
            df["produto"] = df["produto"].str.strip('"')
        df["finalidade"] = "CUSTEIO"
        for col in ["ano", "mes", "valor", "contratos", "area"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
        dfs.append(df[["ano", "mes", "produto", "finalidade", "valor", "contratos", "area"]])

    # Investimento
    data = load_raw_data("InvestRegiaoUFProduto")
    if data:
        df = pd.DataFrame(data)
        print(f"  InvestRegiaoUFProduto: {len(df)} records")
        df = df.rename(columns={
            "AnoEmissao": "ano", "MesEmissao": "mes",
            "nomeProduto": "produto", "VlInvest": "valor",
            "QtdInvest": "contratos",
        })
        if "produto" in df.columns:
            df["produto"] = df["produto"].str.strip('"')
        df["finalidade"] = "INVESTIMENTO"
        df["area"] = 0
        for col in ["ano", "mes", "valor", "contratos"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
        dfs.append(df[["ano", "mes", "produto", "finalidade", "valor", "contratos", "area"]])

    # Comercializacao
    data = load_raw_data("ComercRegiaoUFProduto")
    if data:
        df = pd.DataFrame(data)
        print(f"  ComercRegiaoUFProduto: {len(df)} records")
        df = df.rename(columns={
            "AnoEmissao": "ano", "MesEmissao": "mes",
            "nomeProduto": "produto", "VlComerc": "valor",
            "QtdComerc": "contratos",
        })
        if "produto" in df.columns:
            df["produto"] = df["produto"].str.strip('"')
        df["finalidade"] = "COMERCIALIZACAO"
        df["area"] = 0
        for col in ["ano", "mes", "valor", "contratos"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
        dfs.append(df[["ano", "mes", "produto", "finalidade", "valor", "contratos", "area"]])

    if not dfs:
        return pd.DataFrame()

    return pd.concat(dfs, ignore_index=True)


def process_programa() -> pd.DataFrame:
    """Process ProgramaSubprogramaRegiaoUF data."""
    data = load_raw_data("ProgramaSubprogramaRegiaoUF")
    if not data:
        return pd.DataFrame()

    df = pd.DataFrame(data)
    print(f"  ProgramaSubprogramaRegiaoUF: {len(df)} records")

    df = df.rename(columns={
        "AnoEmissao": "ano",
        "MesEmissao": "mes",
        "cdPrograma": "cdPrograma",
        "QtdCusteio": "contratos_custeio",
        "VlCusteio": "valor_custeio",
        "QtdInvestimento": "contratos_invest",
        "VlInvestimento": "valor_invest",
        "QtdComercializacao": "contratos_comerc",
        "VlComercializacao": "valor_comerc",
    })

    for col in df.columns:
        if col not in ["nomeUF", "nomeRegiao"]:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    df["programa"] = df["cdPrograma"].apply(get_programa_name)
    return df


def process_municipio_uf() -> pd.DataFrame:
    """Process MunicipioUF data."""
    data = load_raw_data("MunicipioUF")
    if not data:
        return pd.DataFrame()

    df = pd.DataFrame(data)
    print(f"  MunicipioUF: {len(df)} records")

    df = df.rename(columns={
        "AnoEmissao": "ano",
        "MesEmissao": "mes",
        "Municipio": "municipio",
        "codMunicIbge": "codIbge",
        "cdPrograma": "cdPrograma",
        "QtdCusteio": "contratos_custeio",
        "VlCusteio": "valor_custeio",
        "QtdInvestimento": "contratos_invest",
        "VlInvestimento": "valor_invest",
        "QtdComercializacao": "contratos_comerc",
        "VlComercializacao": "valor_comerc",
        "AreaCusteio": "area_custeio",
        "AreaInvestimento": "area_invest",
    })

    numeric_cols = [
        "contratos_custeio", "valor_custeio", "contratos_invest", "valor_invest",
        "contratos_comerc", "valor_comerc", "area_custeio", "area_invest"
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    df["ano"] = pd.to_numeric(df["ano"], errors="coerce").fillna(0).astype(int)
    df["mes"] = pd.to_numeric(df["mes"], errors="coerce").fillna(0).astype(int)

    # Add programa field
    if "cdPrograma" in df.columns:
        df["programa"] = df["cdPrograma"].apply(get_programa_name)
    else:
        df["programa"] = "DEMAIS"

    # Calculate totals
    df["valor"] = df["valor_custeio"] + df["valor_invest"] + df["valor_comerc"]
    df["contratos"] = df["contratos_custeio"] + df["contratos_invest"] + df["contratos_comerc"]
    df["area"] = df["area_custeio"] + df["area_invest"]

    return df


def process_genero() -> dict:
    """Process RegiaoUFGenero data by year/month."""
    data = load_raw_data("RegiaoUFGenero")
    if not data:
        return {"totals": {"masculino": 0, "feminino": 0}, "byAnoMes": [], "totalArea": 0}

    df = pd.DataFrame(data)
    print(f"  RegiaoUFGenero: {len(df)} records")

    df["ano"] = pd.to_numeric(df.get("AnoEmissao", 0), errors="coerce").fillna(0).astype(int)
    df["mes"] = pd.to_numeric(df.get("MesEmissao", 0), errors="coerce").fillna(0).astype(int)
    df["VlCusteio"] = pd.to_numeric(df.get("VlCusteio", 0), errors="coerce").fillna(0)
    df["VlInvestimento"] = pd.to_numeric(df.get("VlInvestimento", 0), errors="coerce").fillna(0)
    df["VlComercializacao"] = pd.to_numeric(df.get("VlComercializacao", 0), errors="coerce").fillna(0)
    df["AreaCusteio"] = pd.to_numeric(df.get("AreaCusteio", 0), errors="coerce").fillna(0)
    df["AreaInvestimento"] = pd.to_numeric(df.get("AreaInvestimento", 0), errors="coerce").fillna(0)
    df["valor"] = df["VlCusteio"] + df["VlInvestimento"] + df["VlComercializacao"]

    # By year/month and gender
    by_ano_mes = []
    for (ano, mes, genero), group in df.groupby(["ano", "mes", "cdSexo"]):
        genero_name = "feminino" if str(genero) == "1" else "masculino"
        by_ano_mes.append({
            "ano": int(ano),
            "mes": int(mes),
            "genero": genero_name,
            "valor": float(group["valor"].sum()),
        })

    # Totals
    by_gender = df.groupby("cdSexo")["valor"].sum()
    total_area = float(df["AreaCusteio"].sum() + df["AreaInvestimento"].sum())

    return {
        "totals": {
            "masculino": float(by_gender.get("2", 0)),
            "feminino": float(by_gender.get("1", 0)),
        },
        "byAnoMes": by_ano_mes,
        "totalArea": total_area,
    }


# ============ AGGREGATION FUNCTIONS ============

def aggregate_time_series(df: pd.DataFrame, df_municipio: pd.DataFrame = None) -> dict:
    """Aggregate by year and by month."""
    if df.empty:
        return {"byAno": [], "byMes": []}

    df["valor"] = (
        df.get("valor_custeio", 0) + df.get("valor_invest", 0) +
        df.get("valor_comerc", 0) + df.get("valor_indust", 0)
    )
    df["contratos"] = (
        df.get("contratos_custeio", 0) + df.get("contratos_invest", 0) +
        df.get("contratos_comerc", 0) + df.get("contratos_indust", 0)
    )

    by_ano = df.groupby("ano").agg({"valor": "sum", "contratos": "sum"}).reset_index()
    by_mes = df.groupby(["ano", "mes"]).agg({"valor": "sum", "contratos": "sum"}).reset_index()

    # Get area from municipio data if available
    if df_municipio is not None and not df_municipio.empty:
        area_by_ano = df_municipio.groupby("ano")["area"].sum().reset_index()
        area_by_mes = df_municipio.groupby(["ano", "mes"])["area"].sum().reset_index()
        by_ano = by_ano.merge(area_by_ano, on="ano", how="left").fillna(0)
        by_mes = by_mes.merge(area_by_mes, on=["ano", "mes"], how="left").fillna(0)
    else:
        by_ano["area"] = 0
        by_mes["area"] = 0

    return {
        "byAno": by_ano.sort_values("ano").to_dict(orient="records"),
        "byMes": by_mes.sort_values(["ano", "mes"]).to_dict(orient="records"),
    }


def aggregate_by_finalidade(df: pd.DataFrame) -> list:
    """Aggregate by ano/mes/finalidade."""
    if df.empty:
        return []

    result = []
    for (ano, mes), group in df.groupby(["ano", "mes"]):
        for fin, vcol, ccol in [
            ("CUSTEIO", "valor_custeio", "contratos_custeio"),
            ("INVESTIMENTO", "valor_invest", "contratos_invest"),
            ("COMERCIALIZACAO", "valor_comerc", "contratos_comerc"),
        ]:
            result.append({
                "ano": int(ano),
                "mes": int(mes),
                "finalidade": fin,
                "valor": float(group[vcol].sum()),
                "contratos": int(group[ccol].sum()),
                "area": 0,
            })
    return result


def aggregate_by_finalidade_programa(df: pd.DataFrame) -> list:
    """Aggregate by ano/mes/finalidade with programa field for filtering."""
    if df.empty:
        return []

    result = []
    for (ano, mes, programa), group in df.groupby(["ano", "mes", "programa"]):
        for fin, vcol, ccol in [
            ("CUSTEIO", "valor_custeio", "contratos_custeio"),
            ("INVESTIMENTO", "valor_invest", "contratos_invest"),
            ("COMERCIALIZACAO", "valor_comerc", "contratos_comerc"),
        ]:
            valor = float(group[vcol].sum())
            contratos = int(group[ccol].sum())
            if valor > 0 or contratos > 0:
                result.append({
                    "ano": int(ano),
                    "mes": int(mes),
                    "programa": programa,
                    "finalidade": fin,
                    "valor": valor,
                    "contratos": contratos,
                    "area": 0,
                })
    return result


def aggregate_by_programa(df: pd.DataFrame) -> list:
    """Aggregate by ano/mes/programa."""
    if df.empty:
        return []

    df["valor"] = df["valor_custeio"] + df["valor_invest"] + df["valor_comerc"]
    df["contratos"] = df["contratos_custeio"] + df["contratos_invest"] + df["contratos_comerc"]

    grouped = df.groupby(["ano", "mes", "programa"]).agg({
        "valor": "sum", "contratos": "sum",
    }).reset_index()
    grouped["area"] = 0

    return grouped.to_dict(orient="records")


def aggregate_by_produto(df: pd.DataFrame) -> list:
    """Aggregate by ano/mes/produto."""
    if df.empty:
        return []

    grouped = df.groupby(["ano", "mes", "produto"]).agg({
        "valor": "sum", "contratos": "sum", "area": "sum",
    }).reset_index()

    return grouped.to_dict(orient="records")


def aggregate_by_municipio(df: pd.DataFrame, ibge_names: dict) -> list:
    """Aggregate by ano/mes/municipio/programa."""
    if df.empty:
        return []

    grouped = df.groupby(["ano", "mes", "codIbge", "municipio", "programa"]).agg({
        "valor": "sum", "contratos": "sum", "area": "sum",
    }).reset_index()

    def get_name(row):
        code = str(row["codIbge"])
        return ibge_names.get(code, str(row["municipio"]).title())

    grouped["name"] = grouped.apply(get_name, axis=1)

    return grouped[["ano", "mes", "codIbge", "name", "programa", "valor", "contratos", "area"]].to_dict(orient="records")


def aggregate_totals(data_list: list, group_key: str) -> list:
    """Aggregate totals from ano/mes data."""
    if not data_list:
        return []

    df = pd.DataFrame(data_list)
    grouped = df.groupby(group_key).agg({
        "valor": "sum",
        "contratos": "sum",
        "area": "sum" if "area" in df.columns else lambda x: 0,
    }).reset_index()

    grouped = grouped.sort_values("valor", ascending=False)

    # Add rank for certain types
    if group_key in ["name", "produto"]:
        grouped["rank"] = range(1, len(grouped) + 1)

    return grouped.to_dict(orient="records")


def build_sankey_data(df_produto: pd.DataFrame, df_prog: pd.DataFrame) -> dict:
    """Build Sankey chart data."""
    nodes = []
    links = []
    node_map = {}

    # Programs
    for p in ["PRONAF", "PRONAMP", "DEMAIS"]:
        node_map[f"prog_{p}"] = len(nodes)
        nodes.append({"id": f"prog_{p}", "label": p})

    # Finalidades
    for f in ["CUSTEIO", "INVESTIMENTO", "COMERCIALIZACAO"]:
        node_map[f"fin_{f}"] = len(nodes)
        nodes.append({"id": f"fin_{f}", "label": f})

    # Top products
    if not df_produto.empty:
        top_prods = df_produto.groupby("produto")["valor"].sum().nlargest(10).index.tolist()
        for p in top_prods:
            node_map[f"prod_{p}"] = len(nodes)
            nodes.append({"id": f"prod_{p}", "label": p})

    # Links: Programa -> Finalidade
    if not df_prog.empty:
        for fin, vcol in [("CUSTEIO", "valor_custeio"), ("INVESTIMENTO", "valor_invest"), ("COMERCIALIZACAO", "valor_comerc")]:
            prog_vals = df_prog.groupby("programa")[vcol].sum()
            for prog, val in prog_vals.items():
                if val > 0:
                    links.append({"source": f"prog_{prog}", "target": f"fin_{fin}", "value": float(val)})

    # Links: Finalidade -> Produto
    if not df_produto.empty:
        for fin in ["CUSTEIO", "INVESTIMENTO", "COMERCIALIZACAO"]:
            fin_data = df_produto[df_produto["finalidade"] == fin]
            prod_vals = fin_data.groupby("produto")["valor"].sum()
            for prod, val in prod_vals.items():
                if f"prod_{prod}" in node_map and val > 0:
                    links.append({"source": f"fin_{fin}", "target": f"prod_{prod}", "value": float(val)})

    return {"nodes": nodes, "links": links}


def build_bump_data(df: pd.DataFrame, ibge_names: dict, top_n: int = 20) -> list:
    """Build bump chart data (ranking by year and programa)."""
    if df.empty:
        return []

    # Group by year, municipality and programa
    grouped = df.groupby(["ano", "codIbge", "municipio", "programa"]).agg({"valor": "sum"}).reset_index()

    result = []
    # Generate rankings per programa and year
    for programa in grouped["programa"].unique():
        prog_data = grouped[grouped["programa"] == programa]
        for ano in prog_data["ano"].unique():
            year_data = prog_data[prog_data["ano"] == ano].sort_values("valor", ascending=False).head(top_n)
            for i, (_, row) in enumerate(year_data.iterrows()):
                code = str(row["codIbge"])
                name = ibge_names.get(code, str(row["municipio"]).title())
                result.append({
                    "id": name,
                    "ano": int(ano),
                    "programa": programa,
                    "rank": i + 1,
                    "valor": float(row["valor"]),
                })

    return result


def main():
    """Main processing function."""
    print("=" * 60)
    print("BCB/SICOR Data Processor - Full Granularity")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("\nLoading raw data...")
    df_regiao = process_regiao_uf()
    df_produto = process_produto_data()
    df_prog = process_programa()
    df_municipio = process_municipio_uf()
    ibge_names = load_ibge_names()
    genero_data = process_genero()

    if df_regiao.empty:
        print("ERROR: No RegiaoUF data found.")
        return

    print(f"  IBGE names: {len(ibge_names)} municipalities")

    # Metadata
    ano_min = int(df_regiao["ano"].min())
    ano_max = int(df_regiao["ano"].max())
    total_valor = float(
        df_regiao["valor_custeio"].sum() + df_regiao["valor_invest"].sum() +
        df_regiao["valor_comerc"].sum() + df_regiao["valor_indust"].sum()
    )
    total_contratos = int(
        df_regiao["contratos_custeio"].sum() + df_regiao["contratos_invest"].sum() +
        df_regiao["contratos_comerc"].sum() + df_regiao["contratos_indust"].sum()
    )

    print(f"\n  Period: {ano_min} - {ano_max}")
    print(f"  Total value: R$ {total_valor/1e9:.2f} bi")
    print(f"  Total contracts: {total_contratos:,}")

    # Generate all aggregations with ano/mes
    print("\nGenerating aggregations...")

    time_series = aggregate_time_series(df_regiao.copy(), df_municipio.copy())
    by_finalidade = aggregate_by_finalidade_programa(df_prog.copy())
    by_programa = aggregate_by_programa(df_prog.copy())
    by_produto = aggregate_by_produto(df_produto.copy())
    by_municipio = aggregate_by_municipio(df_municipio.copy(), ibge_names)

    # Totals (for initial display)
    finalidade_totals = aggregate_totals(by_finalidade, "finalidade")
    programa_totals = aggregate_totals(by_programa, "programa")
    produto_totals = aggregate_totals(by_produto, "produto")[:50]  # Top 50
    municipio_totals = aggregate_totals(by_municipio, "name")

    # Add rank to municipio totals
    for i, m in enumerate(municipio_totals):
        m["rank"] = i + 1

    # Sankey and bump
    sankey = build_sankey_data(df_produto, df_prog)
    bump = build_bump_data(df_municipio, ibge_names)

    # Build output
    aggregated = {
        "metadata": {
            "anoMin": ano_min,
            "anoMax": ano_max,
            "totalMunicipios": len(municipio_totals),
            "totalContratos": total_contratos,
            "totalValor": total_valor,
            "totalArea": genero_data["totalArea"],
            "ultimaAtualizacao": datetime.now().strftime("%Y-%m-%d"),
            "periodoMaisRecente": f"{ano_max}-{int(df_regiao['mes'].max()):02d}",
        },
        "filters": {
            "finalidades": ["CUSTEIO", "INVESTIMENTO", "COMERCIALIZACAO"],
            "programas": ["PRONAF", "PRONAMP", "DEMAIS"],
        },
        # Time series
        "byAno": time_series["byAno"],
        "byMes": time_series["byMes"],
        # Granular data (with ano/mes for filtering)
        "byFinalidade": by_finalidade,
        "byPrograma": by_programa,
        "byProduto": by_produto,
        "byMunicipio": by_municipio,
        # Totals (pre-aggregated for fast initial load)
        "finalidadeTotals": finalidade_totals,
        "programaTotals": programa_totals,
        "produtoTotals": produto_totals,
        "municipioTotals": municipio_totals,
        # Other
        "byGenero": genero_data,
        "sankey": sankey,
        "bump": bump,
    }

    # Save
    print("\nSaving aggregated.json...")
    output_path = OUTPUT_DIR / "aggregated.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(aggregated, f, ensure_ascii=False)

    print(f"  Saved: {output_path.stat().st_size / 1024:.1f} KB")
    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
