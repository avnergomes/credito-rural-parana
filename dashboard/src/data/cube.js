/**
 * Motor do cubo de crédito rural (microdados SICOR agregados).
 *
 * Uma tabela fato colunar (typed arrays) e dicionários de dimensão. Todas as
 * visões do painel são group-bys sobre as MESMAS linhas filtradas, então
 * qualquer combinação de filtros é consistente entre gráficos. Cada gráfico
 * ignora o filtro da sua própria dimensão (estilo crossfilter) para mostrar
 * as alternativas ao lado da seleção.
 *
 * Filtros: { anoMin, anoMax, meses: number[] | null, <dim>: string[] } onde
 * <dim> é uma chave de DIMENSIONS e os valores são rótulos.
 */

const FIN_LABEL = {
  CUSTEIO: 'Custeio',
  INVESTIMENTO: 'Investimento',
  COMERCIALIZACAO: 'Comercialização',
  INDUSTRIALIZACAO: 'Industrialização',
};

/** Nome curto de programa: "PRONAF - PROGRAMA NACIONAL..." -> "PRONAF". */
export function shortName(nome) {
  const s = String(nome || '').split(/\s+[-–(]\s*/)[0].trim();
  return s.length > 40 ? `${s.slice(0, 39)}…` : s;
}

/**
 * Dimensões filtráveis. `level` diz em que coluna da fato o filtro atua
 * (dimensões derivadas de empreendimento/programa viram máscara dessa coluna).
 */
export const DIMENSIONS = {
  finalidade: { label: 'Finalidade', level: 'emp' },
  atividade: { label: 'Atividade', level: 'emp' },
  produto: { label: 'Produto', level: 'emp' },
  variedade: { label: 'Variedade', level: 'emp' },
  grupo: { label: 'Grupo de programa', level: 'prog' },
  programa: { label: 'Programa', level: 'prog' },
  subprograma: { label: 'Subprograma', level: 'sub' },
  fonte: { label: 'Fonte de recursos', level: 'fonte' },
  porte: { label: 'Porte do produtor', level: 'porte' },
  municipio: { label: 'Município', level: 'mun' },
};

export const EMPTY_FILTERS = Object.freeze({
  anoMin: null,
  anoMax: null,
  meses: null,
  ...Object.fromEntries(Object.keys(DIMENSIONS).map((k) => [k, []])),
});

/** Monta a tabela e os índices a partir de dims.json e dos fato_<ano>.json. */
export function buildCube(dims, fatos) {
  const N = fatos.reduce((s, f) => s + f.cols.n.length, 0);
  const t = {
    ano: new Uint16Array(N), mes: new Uint8Array(N), mun: new Uint16Array(N),
    emp: new Uint16Array(N), prog: new Uint16Array(N), sub: new Uint16Array(N),
    fonte: new Uint16Array(N), porte: new Uint16Array(N),
    n: new Uint32Array(N), vl: new Float64Array(N), area: new Float64Array(N),
  };
  let o = 0;
  for (const { ano, cols } of fatos) {
    const len = cols.n.length;
    t.ano.fill(ano, o, o + len);
    for (const c of ['mes', 'mun', 'emp', 'prog', 'sub', 'fonte', 'porte', 'n', 'vl', 'area']) {
      t[c].set(cols[c], o);
    }
    o += len;
  }

  // Rótulos por coluna-base, e mapeamento coluna-base -> rótulo da dimensão derivada.
  const empIdx = (pos) => dims.empreendimentos.map((e) => e[pos]);
  const progLabel = dims.programas.map((p) => shortName(p.nome));
  const labelsOf = {
    finalidade: { col: 'emp', of: empIdx(0).map((i) => FIN_LABEL[dims.finalidades[i]] || dims.finalidades[i]) },
    atividade: { col: 'emp', of: empIdx(1).map((i) => dims.atividades[i]) },
    produto: { col: 'emp', of: empIdx(2).map((i) => dims.produtos[i]) },
    variedade: { col: 'emp', of: empIdx(3).map((i) => dims.variedades[i]) },
    grupo: { col: 'prog', of: dims.programas.map((p) => p.grupo) },
    programa: { col: 'prog', of: progLabel },
    subprograma: { col: 'sub', of: dims.subprogramas.map((s) => `${progLabel[s.prog]} · ${s.nome}`) },
    fonte: { col: 'fonte', of: dims.fontes.map((f) => f.nome) },
    porte: { col: 'porte', of: dims.portes },
    municipio: { col: 'mun', of: dims.municipios.map((m) => m.nome) },
  };
  const anos = dims.anos;
  return { N, t, dims, labelsOf, munCod: dims.municipios.map((m) => m.cod), anoMin: anos[0], anoMax: anos[anos.length - 1] };
}

/** Máscaras Uint8 por coluna-base com todos os filtros, exceto `except`. */
function buildMasks(cube, filters, except) {
  const masks = {};
  for (const [dim, { col, of }] of Object.entries(cube.labelsOf)) {
    const sel = filters[dim];
    if (dim === except || !sel || sel.length === 0) continue;
    const set = new Set(sel);
    const m = masks[col] || new Uint8Array(of.length).fill(1);
    for (let i = 0; i < of.length; i++) if (!set.has(of[i])) m[i] = 0;
    masks[col] = m;
  }
  return masks;
}

/** Função de predicado de linha (período + máscaras). */
function rowFilter(cube, filters, except) {
  const { t } = cube;
  const masks = Object.entries(buildMasks(cube, filters, except)).map(([col, m]) => [t[col], m]);
  const aMin = filters.anoMin ?? cube.anoMin;
  const aMax = filters.anoMax ?? cube.anoMax;
  const meses = filters.meses?.length ? new Set(filters.meses) : null;
  return (i) => {
    const a = t.ano[i];
    if (a < aMin || a > aMax) return false;
    if (meses && !meses.has(t.mes[i])) return false;
    for (let k = 0; k < masks.length; k++) if (!masks[k][1][masks[k][0][i]]) return false;
    return true;
  };
}

/** Chave + rótulo de agrupamento para uma dimensão ou período. */
function keyer(cube, dim) {
  const { t } = cube;
  if (dim === 'ano') return { key: (i) => t.ano[i], label: (k) => String(k) };
  if (dim === 'semestre') {
    return { key: (i) => t.ano[i] * 2 + (t.mes[i] > 6 ? 1 : 0), label: (k) => `${k >> 1}-S${(k & 1) + 1}` };
  }
  if (dim === 'mes') {
    return { key: (i) => t.ano[i] * 12 + t.mes[i] - 1, label: (k) => `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}` };
  }
  const { col, of } = cube.labelsOf[dim];
  // Várias chaves-base podem ter o mesmo rótulo (ex.: produto em custeio e investimento).
  const ids = new Map();
  const toId = Int32Array.from(of, (lab) => {
    if (!ids.has(lab)) ids.set(lab, ids.size);
    return ids.get(lab);
  });
  const labels = [...ids.keys()];
  const colArr = t[col];
  return { key: (i) => toId[colArr[i]], label: (k) => labels[k] };
}

/**
 * Agrupa por 1+ dimensões. Retorna [{ keys: [rótulo...], valor, contratos, area }].
 * Com uma única dimensão de filtro, ignora o próprio filtro (crossfilter) a menos que keepSelf.
 */
export function groupBy(cube, filters, dimsList, { keepSelf = false } = {}) {
  const except = !keepSelf && dimsList.length === 1 ? dimsList[0] : null;
  const pass = rowFilter(cube, filters, except);
  const ks = dimsList.map((d) => keyer(cube, d));
  const { t, N } = cube;
  const acc = new Map();
  for (let i = 0; i < N; i++) {
    if (!pass(i)) continue;
    const k = ks.length === 1 ? ks[0].key(i) : ks.map((x) => x.key(i)).join('|');
    let a = acc.get(k);
    if (!a) acc.set(k, (a = [0, 0, 0]));
    a[0] += t.vl[i];
    a[1] += t.n[i];
    a[2] += t.area[i];
  }
  const out = [];
  for (const [k, [valor, contratos, area]] of acc) {
    const parts = ks.length === 1 ? [k] : String(k).split('|').map(Number);
    out.push({ keys: parts.map((p, j) => ks[j].label(p)), rawKeys: parts, valor, contratos, area });
  }
  return out.sort((a, b) => b.valor - a.valor);
}

/** Totais com todos os filtros + cobertura municipal (parcela do valor com município). */
export function totals(cube, filters) {
  const pass = rowFilter(cube, filters, null);
  const { t, N } = cube;
  let valor = 0, contratos = 0, area = 0, valorComMun = 0;
  const porMes = new Float64Array(13 * (cube.anoMax - cube.anoMin + 1)); // (ano, mes) -> valor
  for (let i = 0; i < N; i++) {
    if (!pass(i)) continue;
    valor += t.vl[i];
    contratos += t.n[i];
    area += t.area[i];
    if (t.mun[i] !== 0) valorComMun += t.vl[i];
    porMes[(t.ano[i] - cube.anoMin) * 13 + t.mes[i]] += t.vl[i];
  }
  // Variação anual sobre os mesmos meses: o último ano costuma estar incompleto.
  let ultimo = -1;
  for (let k = porMes.length - 1; k >= 0; k--) if (porMes[k]) { ultimo = k; break; }
  let atual = 0, anterior = 0;
  if (ultimo >= 13) {
    const base = ultimo - (ultimo % 13);
    for (let m = 1; m <= ultimo % 13; m++) {
      atual += porMes[base + m];
      anterior += porMes[base - 13 + m];
    }
  }
  return {
    valor, contratos, area,
    valorMedio: contratos ? valor / contratos : 0,
    yoyChange: atual && anterior ? ((atual - anterior) / anterior) * 100 : null,
    coberturaMunicipio: valor ? valorComMun / valor : null,
  };
}

/** Linhas {ano, mes, finalidade, valor} no formato do TimeSeriesChart. */
export function timeSeries(cube, filters) {
  return groupBy(cube, filters, ['mes', 'finalidade'], { keepSelf: true }).map((r) => {
    const [ano, mes] = r.keys[0].split('-').map(Number);
    return { ano, mes, finalidade: r.keys[1], valor: r.valor, contratos: r.contratos, area: r.area };
  });
}

/** Lista simples para gráficos de uma dimensão: [{ [nameKey]: rótulo, valor, contratos, area, rank }]. */
export function ranking(cube, filters, dim, nameKey = 'name') {
  return groupBy(cube, filters, [dim]).map((r, i) => ({
    [nameKey]: r.keys[0], valor: r.valor, contratos: r.contratos, area: r.area, rank: i + 1,
    ...(dim === 'municipio' ? { codIbge: cube.munCod[cube.dims.municipios.findIndex((m) => m.nome === r.keys[0])] } : {}),
  }));
}

/** Sankey grupo -> finalidade -> top produtos, todos os filtros aplicados. */
export function sankey(cube, filters, topN = 10) {
  const gf = groupBy(cube, filters, ['grupo', 'finalidade'], { keepSelf: true });
  const fp = groupBy(cube, filters, ['finalidade', 'produto'], { keepSelf: true });
  const prodTot = new Map();
  fp.forEach((r) => prodTot.set(r.keys[1], (prodTot.get(r.keys[1]) || 0) + r.valor));
  const top = new Set([...prodTot].sort((a, b) => b[1] - a[1]).slice(0, topN).map(([p]) => p));
  const nodes = new Map();
  const node = (id, label) => nodes.set(id, { id, label });
  const links = [];
  gf.forEach(({ keys: [g, f], valor }) => {
    node(`prog_${g}`, g); node(`fin_${f}`, f);
    if (valor > 0) links.push({ source: `prog_${g}`, target: `fin_${f}`, value: valor });
  });
  fp.forEach(({ keys: [f, p], valor }) => {
    if (!top.has(p) || valor <= 0) return;
    node(`prod_${p}`, p);
    links.push({ source: `fin_${f}`, target: `prod_${p}`, value: valor });
  });
  return { nodes: [...nodes.values()], links };
}

/** Ranking anual dos top municípios (para o BumpChart). Ignora "Não informado". */
export function bump(cube, filters, topN = 20) {
  const rows = groupBy(cube, filters, ['ano', 'municipio'], { keepSelf: true });
  const byYear = new Map();
  rows.forEach((r) => {
    if (r.keys[1] === cube.dims.municipios[0].nome) return;
    const ano = Number(r.keys[0]);
    if (!byYear.has(ano)) byYear.set(ano, []);
    byYear.get(ano).push(r);
  });
  const out = [];
  byYear.forEach((list, ano) => list.slice(0, topN).forEach((r, i) => out.push({ id: r.keys[1], ano, rank: i + 1, valor: r.valor })));
  return out;
}

/** Rótulos disponíveis de uma dimensão (com valor no recorte atual, sem o próprio filtro). */
export function options(cube, filters, dim) {
  return groupBy(cube, filters, [dim]).map((r) => ({ value: r.keys[0], valor: r.valor }));
}

/** Dimensões que o recorte de perfil (estadual, sem município) consegue respeitar. */
export const PERFIL_DIMS = ['finalidade', 'grupo', 'programa', 'porte'];

/**
 * Agrupa perfil.json (sexo/tipo do mutuário principal) por 'sexo' ou 'tipo'.
 * Filtros de outras dimensões são ignorados aqui (o recorte não tem essas colunas).
 */
export function perfilBy(cube, perfil, filters, dim) {
  const { dims, labelsOf } = cube;
  const finOf = dims.finalidades.map((f) => FIN_LABEL[f] || f);
  const sel = (k) => (filters[k]?.length ? new Set(filters[k]) : null);
  const [fin, grp, prg, por] = PERFIL_DIMS.map(sel);
  const aMin = filters.anoMin ?? cube.anoMin;
  const aMax = filters.anoMax ?? cube.anoMax;
  const meses = filters.meses?.length ? new Set(filters.meses) : null;
  const labels = dim === 'sexo' ? dims.sexos : dims.tipos;
  const acc = new Map();
  const c = perfil;
  for (let i = 0; i < c.n.length; i++) {
    if (c.ano[i] < aMin || c.ano[i] > aMax || (meses && !meses.has(c.mes[i]))) continue;
    if (fin && !fin.has(finOf[c.fin[i]])) continue;
    if (grp && !grp.has(labelsOf.grupo.of[c.prog[i]])) continue;
    if (prg && !prg.has(labelsOf.programa.of[c.prog[i]])) continue;
    if (por && !por.has(dims.portes[c.porte[i]])) continue;
    const k = labels[c[dim][i]];
    const a = acc.get(k) || { name: k, valor: 0, contratos: 0 };
    acc.set(k, { ...a, valor: a.valor + c.vl[i], contratos: a.contratos + c.n[i] });
  }
  return [...acc.values()].sort((a, b) => b.valor - a.valor);
}

export { FIN_LABEL };
