#!/usr/bin/env python3
"""
Microdados SICOR (data/raw/sicor) -> cubo do painel (dashboard/public/data).

Saídas:
- cubo/dims.json         dicionários das dimensões (município, empreendimento, programa...)
- cubo/fato_<ANO>.json   tabela fato colunar, 1 linha por combinação de
                         mes x municipio x empreendimento x programa x subprograma x fonte x porte
- cubo/perfil.json       recorte estadual por sexo/tipo de beneficiário (sem município: LGPD)
- aggregated.json        série estadual (metadata, byAno, byMes, byFinalidadeMes) para previsões

Granularidade: 1 linha (REF_BACEN, NU_ORDEM) do SICOR = 1 contrato
(reconciliado com a Olinda em 2025: 165.143 x 164.329).
Município vem do complemento; ~27-31% das operações do PR não têm município
publicado (concentrado em médio/grande produtor). Essas linhas ficam no cubo
com municipio = 0 ("Não informado") para os totais baterem.
"""

import csv
import gzip
import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
RAW = ROOT / "data" / "raw" / "sicor"
OUT = ROOT / "dashboard" / "public" / "data"
CUBO = OUT / "cubo"
MUNICIPIOS = Path(__file__).parent / "municipios_pr.json"
UF = "PR"
NI = "Não informado"

FINALIDADES = {  # rótulo do Empreendimento.csv -> código usado no painel e nas previsões
    "custeio": "CUSTEIO", "investimento": "INVESTIMENTO",
    "comercializacao": "COMERCIALIZACAO", "industrializacao": "INDUSTRIALIZACAO",
}
SEXO = {"1": "Feminino", "2": "Masculino"}


# ---------------------------------------------------------------- leitura

def _decode(raw: bytes) -> str:
    # Os CSVs do BCB misturam linhas latin1 e utf-8 no mesmo arquivo.
    # O "latin1" deles é na prática cp1252 (0x96 = travessão), não ISO-8859-1.
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        try:
            return raw.decode("cp1252")
        except UnicodeDecodeError:
            return raw.decode("latin1")


def read_rows(path: Path):
    """Itera dicts de um CSV do SICOR (.csv ou .gz; ';' ou ',')."""
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rb") as f:
        lines = (_decode(raw).rstrip("\r\n") for raw in f)
        header = next(lines).lstrip("#")
        delim = ";" if ";" in header else ","
        cols = header.split(delim)
        for row in csv.reader(lines, delimiter=delim):
            yield dict(zip(cols, row))


def norm(s: str) -> str:
    """Chave sem acento/caixa para casar rótulos ('Comercialização' -> 'comercializacao')."""
    trans = str.maketrans("áàãâéêíóôõúüç", "aaaaeeiooouuc")
    return re.sub(r"\s+", " ", s.strip().lower().translate(trans))


def code(s: str) -> str:
    """Normaliza código numérico ('0056' e '56' viram '56'); vazio vira ''."""
    s = s.strip().strip('"')
    return str(int(s)) if s.isdigit() else s


# ---------------------------------------------------------------- dicionários

class Dim:
    """Dicionário valor -> índice estável, na ordem de chegada."""

    def __init__(self, first: list | None = None):
        self.items: list = []
        self.index: dict = {}
        for it in first or []:
            self.get(it[0], it[1])

    def get(self, key, item=None) -> int:
        if key not in self.index:
            self.index[key] = len(self.items)
            self.items.append(item if item is not None else key)
        return self.index[key]


def load_dominios() -> dict:
    emp = {}
    for r in read_rows(RAW / "Empreendimento.csv"):
        fin = FINALIDADES.get(norm(r["FINALIDADE"]), r["FINALIDADE"].upper())
        emp[r["CODIGO"].strip('"')] = (fin, r["ATIVIDADE"].strip(), r["PRODUTO"].strip(), r["VARIEDADE"].strip())
    prog = {code(r["CODIGO"]): r["DESCRICAO"].strip() for r in read_rows(RAW / "Programa.csv")}
    sub = {(code(r["CODIGO_PROGRAMA"]), code(r["CODIGO_SUBPROGRAMA"])): r["DESCRICAO_SUBPROGRAMA"].strip()
           for r in read_rows(RAW / "Subprogramas.csv")}
    fonte = {code(r["CODIGO"]): r["DESCRICAO"].strip() for r in read_rows(RAW / "FonteRecursos.csv")}
    porte = {code(r["CODIGO"]): r["DESCRICAO"].strip() for r in read_rows(RAW / "CategoriaEmitente.csv")}
    tipo = {code(r["CODIGO"]): r["DESCRICAO"].strip() for r in read_rows(RAW / "TipoBeneficiario.csv")}
    return {"emp": emp, "prog": prog, "sub": sub, "fonte": fonte, "porte": porte, "tipo": tipo}


def grupo_programa(cd: str) -> str:
    return {"1": "PRONAF", "50": "PRONAMP"}.get(cd, "DEMAIS")


# ---------------------------------------------------------------- etapas

def load_operacoes(anos: list[int]) -> tuple[list, dict]:
    """Operações do PR. Retorna (linhas, chave 'ref;ordem' -> índice da linha)."""
    ops, idx = [], {}
    for ano in anos:
        n0 = len(ops)
        for r in read_rows(RAW / f"SICOR_OPERACAO_BASICA_ESTADO_{ano}.gz"):
            if r["CD_ESTADO"] != UF:
                continue
            _, m, y = r["DT_EMISSAO"].split("/")
            idx[f"{r['REF_BACEN']};{r['NU_ORDEM']}"] = len(ops)
            ops.append((
                int(y), int(m), r["REF_BACEN"], r["CD_EMPREENDIMENTO"].strip(),
                code(r["CD_PROGRAMA"]), code(r["CD_SUBPROGRAMA"]), code(r["CD_FONTE_RECURSO"]),
                code(r["CD_CATEG_EMITENTE"]),
                float(r["VL_PARC_CREDITO"] or 0), float(r["VL_AREA_FINANC"] or 0),
            ))
        print(f"  {ano}: {len(ops) - n0:,} operações PR")
    return ops, idx


def load_municipios(idx: dict) -> dict:
    """Índice da operação -> código IBGE (só os que o BCB publica)."""
    mun = {}
    for r in read_rows(RAW / "SICOR_COMPLEMENTO_OPERACAO_BASICA.gz"):
        i = idx.get(f"{r['REF_BACEN']};{r['NU_ORDEM']}")
        if i is not None and r["CD_IBGE_MUNICIPIO"].startswith("41"):
            mun[i] = r["CD_IBGE_MUNICIPIO"]
    return mun


def load_mutuarios(refs: set) -> dict:
    """REF_BACEN -> (sexo, tipo) do mutuário principal. CPF/CNPJ não é lido nem guardado."""
    out = {}
    for r in read_rows(RAW / "SICOR_MUTUARIOS.gz"):
        ref = r["REF_BACEN"]
        if r["CD_PRIMEIRO"] == "S" and ref in refs and ref not in out:
            out[ref] = (r["CD_SEXO"].strip(), code(r["CD_TIPO_BENEFICIARIO"]))
    return out


def build_cubes(ops: list, mun: dict, mutu: dict, dom: dict, nomes_mun: dict) -> tuple:
    d_mun = Dim([("", {"cod": "", "nome": NI})])
    d_emp, d_prog, d_sub, d_fonte, d_porte = Dim(), Dim(), Dim(), Dim(), Dim()
    d_fin, d_ativ, d_prod, d_var = Dim(), Dim(), Dim(), Dim()
    d_sexo, d_tipo = Dim([("", NI)]), Dim([("", NI)])

    fato = defaultdict(lambda: defaultdict(lambda: [0, 0.0, 0.0]))  # ano -> chave -> [n, vl, area]
    perfil = defaultdict(lambda: [0, 0.0])
    for i, (ano, mes, ref, emp, prog, sub, fonte, porte, vl, area) in enumerate(ops):
        cod_mun = mun.get(i, "")
        m = d_mun.get(cod_mun, {"cod": cod_mun, "nome": nomes_mun.get(cod_mun, cod_mun)})
        fin, ativ, prod, var = dom["emp"].get(emp, ("NÃO IDENTIFICADO",) * 4)
        e = d_emp.get(emp, [d_fin.get(fin), d_ativ.get(ativ), d_prod.get(prod), d_var.get(var)])
        p = d_prog.get(prog, {"cod": prog, "nome": dom["prog"].get(prog, prog), "grupo": grupo_programa(prog)})
        s = d_sub.get((prog, sub), {"cod": sub, "prog": p, "nome": dom["sub"].get((prog, sub), sub or NI)})
        f = d_fonte.get(fonte, {"cod": fonte, "nome": dom["fonte"].get(fonte, fonte)})
        po = d_porte.get(porte, dom["porte"].get(porte, porte or NI))
        cell = fato[ano][(mes, m, e, p, s, f, po)]
        cell[0] += 1
        cell[1] += vl
        cell[2] += area

        sexo, tipo = mutu.get(ref, ("", ""))
        sx = d_sexo.get(sexo, SEXO.get(sexo, NI))
        tp = d_tipo.get(tipo, dom["tipo"].get(tipo, tipo))
        pc = perfil[(ano, mes, p, d_emp.items[e][0], po, sx, tp)]
        pc[0] += 1
        pc[1] += vl

    dims = {
        "municipios": d_mun.items, "empreendimentos": d_emp.items,
        "finalidades": d_fin.items, "atividades": d_ativ.items, "produtos": d_prod.items,
        "variedades": d_var.items, "programas": d_prog.items, "subprogramas": d_sub.items,
        "fontes": d_fonte.items, "portes": d_porte.items, "sexos": d_sexo.items, "tipos": d_tipo.items,
    }
    return dims, fato, perfil


# ---------------------------------------------------------------- escrita

FATO_COLS = ["mes", "mun", "emp", "prog", "sub", "fonte", "porte"]


def columnar(cells: dict, key_cols: list, area: bool = True) -> dict:
    cols = {c: [] for c in key_cols + ["n", "vl"] + (["area"] if area else [])}
    for key, (n, *meas) in sorted(cells.items()):
        for c, v in zip(key_cols, key):
            cols[c].append(v)
        cols["n"].append(n)
        cols["vl"].append(round(meas[0]))  # R$ inteiros: precisão suficiente e ~40% menor
        if area:
            cols["area"].append(round(meas[1], 1))
    return cols


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  {path.name}: {path.stat().st_size / 1e6:.2f} MB")


def serie_estadual(ops: list, dom: dict, cobertura: dict) -> dict:
    by_mes = defaultdict(lambda: [0, 0.0, 0.0])
    by_fin = defaultdict(lambda: [0, 0.0, 0.0])
    for ano, mes, _, emp, *_, vl, area in ops:
        fin = dom["emp"].get(emp, ("NÃO IDENTIFICADO",))[0]
        for acc, k in ((by_mes, (ano, mes)), (by_fin, (ano, mes, fin))):
            acc[k][0] += 1
            acc[k][1] += vl
            acc[k][2] += area
    rec = lambda k, v, names: {**dict(zip(names, k)), "contratos": v[0], "valor": round(v[1], 2), "area": round(v[2], 2)}
    by_ano = defaultdict(lambda: [0, 0.0, 0.0])
    for (ano, _), v in by_mes.items():
        by_ano[ano] = [a + b for a, b in zip(by_ano[ano], v)]
    anos = sorted(by_ano)
    ultimo = max(by_mes)
    return {
        "metadata": {
            "fonte": "BCB/SICOR microdados (www.bcb.gov.br/htms/sicor/DadosBrutos)",
            "anoMin": anos[0], "anoMax": anos[-1],
            "totalContratos": sum(v[0] for v in by_ano.values()),
            "totalValor": round(sum(v[1] for v in by_ano.values()), 2),
            "totalArea": round(sum(v[2] for v in by_ano.values()), 2),
            "ultimaAtualizacao": datetime.now().strftime("%Y-%m-%d"),
            "periodoMaisRecente": f"{ultimo[0]}-{ultimo[1]:02d}",
            "coberturaMunicipio": cobertura,
        },
        "byAno": [rec((a,), by_ano[a], ["ano"]) for a in anos],
        "byMes": [rec(k, v, ["ano", "mes"]) for k, v in sorted(by_mes.items())],
        "byFinalidadeMes": [rec(k, v, ["ano", "mes", "finalidade"]) for k, v in sorted(by_fin.items())],
    }


def main() -> None:
    anos = sorted(int(p.stem.split("_")[-1].split(".")[0]) for p in RAW.glob("SICOR_OPERACAO_BASICA_ESTADO_*.gz"))
    if not anos:
        print(f"ERRO: nenhum microdado em {RAW}; rode fetch_data.py")
        sys.exit(1)
    print(f"Anos: {anos[0]}-{anos[-1]}")
    dom = load_dominios()
    nomes_mun = json.loads(MUNICIPIOS.read_text(encoding="utf-8"))

    ops, idx = load_operacoes(anos)
    print("Complemento (município)...")
    mun = load_municipios(idx)
    del idx
    print("Mutuários (sexo/tipo, sem CPF)...")
    mutu = load_mutuarios({o[2] for o in ops})

    cobertura = defaultdict(lambda: [0, 0])
    for i, o in enumerate(ops):
        cobertura[o[0]][0 if i in mun else 1] += 1
    cob = {str(a): round(c / (c + s), 4) for a, (c, s) in sorted(cobertura.items())}
    print(f"  cobertura municipal por ano: {cob}")
    if len(mun) / len(ops) < 0.5:  # queda brusca = join quebrado ou mudança de layout no BCB
        print("ERRO: menos de 50% das operações com município; verifique o complemento")
        sys.exit(1)

    dims, fato, perfil = build_cubes(ops, mun, mutu, dom, nomes_mun)
    dims["anos"] = sorted(fato)
    print("Gravando...")
    write_json(CUBO / "dims.json", dims)
    for ano, cells in fato.items():
        write_json(CUBO / f"fato_{ano}.json", columnar(cells, FATO_COLS))
    perf = columnar(perfil, ["ano", "mes", "prog", "fin", "porte", "sexo", "tipo"], area=False)
    write_json(CUBO / "perfil.json", perf)
    serie = serie_estadual(ops, dom, cob)
    serie["metadata"]["totalMunicipios"] = len(dims["municipios"]) - 1  # sem "Não informado"
    write_json(OUT / "aggregated.json", serie)


if __name__ == "__main__":
    main()
