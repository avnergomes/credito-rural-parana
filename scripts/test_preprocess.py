"""Fixture mínima do SICOR: join de município, balde 'Não informado', filtro de UF, acentos e CPF fora da saída.

Rodar: python -m pytest scripts/test_preprocess.py   (ou python scripts/test_preprocess.py)
"""
import gzip
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import preprocess_data as pp  # noqa: E402

OP_HEAD = ("#REF_BACEN;NU_ORDEM;CNPJ_IF;DT_EMISSAO;DT_VENCIMENTO;CD_INST_CREDITO;CD_CATEG_EMITENTE;"
           "CD_FONTE_RECURSO;CNPJ_AGENTE_INVEST;CD_ESTADO;CD_REF_BACEN_INVESTIMENTO;CD_TIPO_SEGURO;"
           "CD_EMPREENDIMENTO;CD_PROGRAMA;CD_SUBPROGRAMA;VL_PARC_CREDITO;VL_AREA_FINANC")


def op(ref, data, uf, emp, prog, vl, area, categ="2222"):
    return f"{ref};1;0;{data};;5;{categ};0300;;{uf};;9;{emp};{prog};0;{vl};{area}"


def write(path: Path, text: str, enc="utf-8"):
    data = text.encode(enc)
    if path.suffix == ".gz":
        path.write_bytes(gzip.compress(data))
    else:
        path.write_bytes(data)


def build_fixture(raw: Path):
    write(raw / "Empreendimento.csv",
          '#CODIGO;FINALIDADE;ATIVIDADE;PRODUTO;VARIEDADE\n'
          '"E1";"Custeio";"Agrícola";"ERVA-MATE";"NÃO SE APLICA"\n'
          '"E2";"Comercialização";"Agrícola";"ALGODÃO";"NÃO SE APLICA"\n', enc="latin1")
    write(raw / "Programa.csv", '#CODIGO;DESCRICAO\n"0001";"PRONAF - AGRICULTURA FAMILIAR"\n')
    write(raw / "Subprogramas.csv", "#CODIGO_SUBPROGRAMA;DESCRICAO_SUBPROGRAMA;VL_TAXA_JUROS;CODIGO_PROGRAMA\n")
    write(raw / "FonteRecursos.csv", '#CODIGO;DESCRICAO\n"0300";"POUPANÇA RURAL"\n')
    write(raw / "CategoriaEmitente.csv", '#CODIGO;DESCRICAO\n"2222";"Pequeno Produtor Rural"\n"4444";"Grande Produtor Rural"\n')
    write(raw / "TipoBeneficiario.csv", '#CODIGO,DESCRICAO\n"001","Produtor rural – PF"\n', enc="cp1252")
    write(raw / "SICOR_OPERACAO_BASICA_ESTADO_2026.gz", "\n".join([
        OP_HEAD,
        op("10", "15/03/2026", "PR", "E1", "0001", "1000.50", "2.5"),
        op("11", "20/08/2026", "PR", "E2", "0999", "500.00", "0", categ="4444"),  # sem município
        op("12", "20/08/2026", "SC", "E1", "0001", "999.00", "1"),  # outra UF: fora
    ]) + "\n")
    write(raw / "SICOR_COMPLEMENTO_OPERACAO_BASICA.gz",
          "#REF_BACEN;NU_ORDEM;REF_BACEN_EFETIVO;AGENCIA_IF;CD_IBGE_MUNICIPIO;NUM_CEDULA_IF\n"
          "10;1;x;1;4106902;x\n12;1;x;1;4205407;x\n")
    write(raw / "SICOR_MUTUARIOS.gz",
          "#CD_SEXO;CD_CPF_CNPJ;CD_TIPO_BENEFICIARIO;CD_DAP;REF_BACEN;CD_PRIMEIRO\n"
          "1;12345678901;001;;10;S\n2;99999999999;001;;10;N\n")


def test_pipeline(tmp_path: Path):
    raw, out = tmp_path / "raw", tmp_path / "out"
    raw.mkdir()
    build_fixture(raw)
    pp.RAW, pp.OUT, pp.CUBO = raw, out, out / "cubo"
    pp.main()

    dims = json.loads((out / "cubo" / "dims.json").read_text(encoding="utf-8"))
    fato = json.loads((out / "cubo" / "fato_2026.json").read_text(encoding="utf-8"))
    agg = json.loads((out / "aggregated.json").read_text(encoding="utf-8"))

    assert sum(fato["n"]) == 2, "operação de SC não pode entrar"
    assert sum(fato["vl"]) == round(1000.50) + 500
    nomes = [dims["municipios"][i]["nome"] for i in fato["mun"]]
    assert sorted(nomes) == ["Curitiba", pp.NI], nomes
    assert "Comercialização" not in json.dumps(dims) and "COMERCIALIZACAO" in dims["finalidades"]
    assert "ALGODÃO" in dims["produtos"] and "ERVA-MATE" in dims["produtos"]  # latin1 -> utf-8
    assert "Produtor rural – PF" in dims["tipos"], dims["tipos"]  # 0x96 cp1252 -> travessão
    assert agg["metadata"]["coberturaMunicipio"] == {"2026": 0.5}
    assert {r["mes"] for r in agg["byMes"]} == {3, 8}

    perfil = json.loads((out / "cubo" / "perfil.json").read_text(encoding="utf-8"))
    assert sorted(dims["sexos"][i] for i in perfil["sexo"]) == ["Feminino", pp.NI]  # só o mutuário principal
    blob = "".join(p.read_text(encoding="utf-8") for p in out.rglob("*.json"))
    assert "12345678901" not in blob and "99999999999" not in blob, "CPF vazou para a saída"


if __name__ == "__main__":
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        test_pipeline(Path(d))
    print("ok")
