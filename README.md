# Crédito Rural Paraná

Dashboard interativo de crédito rural do estado do Paraná, cobrindo o período de 2013 a 2026 com dados do SICOR/BCB. Permite explorar o volume de contratos, área financiada, distribuição por gênero, finalidade, programa e produto agropecuário, além de previsões de tendência via XGBoost.

**🔗 [Acessar](https://avnergomes.github.io/credito-rural-parana/)**

Parte do ecossistema **[Datageo Paraná](https://datageoparana.github.io)**.

---

## Sobre

O **Crédito Rural Paraná** é um dashboard analítico que consolida mais de R$ 386 bilhões em contratos de crédito rural celebrados nos 399 municípios paranaenses entre 2013 e 2026. Os dados são obtidos diretamente da API do SICOR (Sistema de Operações do Crédito Rural e do Proagro) do Banco Central do Brasil, processados localmente e publicados como arquivos JSON estáticos.

### KPIs principais

| Indicador | Descrição |
|-----------|-----------|
| **Valor contratado total** | Soma de todos os contratos no período/filtro selecionado |
| **Total de contratos** | Número de operações de crédito rural |
| **Área financiada** | Hectares cobertos pelos contratos |
| **Valor médio por contrato** | Ticket médio das operações |
| **Variação anual** | Crescimento percentual em relação ao ano anterior |

---

## Fonte de Dados

| Fonte | Sistema | Acesso |
|-------|---------|--------|
| **Banco Central do Brasil** | SICOR — Sistema de Operações do Crédito Rural e do Proagro | [API pública BCB](https://www.bcb.gov.br/estabilidadefinanceira/creditorural) |

Os dados são coletados automaticamente pelo pipeline GitHub Actions e atualizados periodicamente.

---

## Tecnologias

| Categoria | Tecnologia | Versão |
|-----------|-----------|--------|
| Framework UI | React | 18 |
| Build tool | Vite | 5 |
| Estilização | Tailwind CSS | 3 |
| Gráficos | Recharts | — |
| Gráficos | D3.js | — |
| Mapa | Leaflet / React-Leaflet | — |
| Diagrama Sankey | Nivo | — |
| Previsão | XGBoost (Python) | — |
| Pipeline de dados | Python | 3.x |
| CI/CD | GitHub Actions | — |

---

## Estrutura do Projeto

```
credito-rural-parana/
├── dashboard/                  # Aplicação React (Vite)
│   ├── public/
│   │   └── data/
│   │       ├── aggregated.json       # Dados agregados principais
│   │       ├── forecasts.json        # Previsões XGBoost
│   │       └── mapeamento_vbp.json   # Mapeamento de produtos/VBP
│   └── src/
│       ├── components/
│       │   ├── ActiveFilters.jsx
│       │   ├── BumpChart.jsx
│       │   ├── DistributionCharts.jsx
│       │   ├── ErrorBoundary.jsx
│       │   ├── Filters.jsx
│       │   ├── Footer.jsx
│       │   ├── ForecastChart.jsx
│       │   ├── ForecastPanel.jsx
│       │   ├── Header.jsx
│       │   ├── KpiCards.jsx
│       │   ├── Loading.jsx
│       │   ├── LollipopChart.jsx
│       │   ├── MapChart.jsx
│       │   ├── RankingTable.jsx
│       │   ├── SankeyChart.jsx
│       │   ├── ScatterChart.jsx
│       │   ├── Tabs.jsx
│       │   ├── TimeSeriesChart.jsx
│       │   └── TreemapChart.jsx
│       └── hooks/
│           └── useData.js
├── scripts/
│   ├── fetch_data.py           # Coleta dados da API SICOR/BCB
│   ├── preprocess_data.py      # Transformação e agregação
│   └── generate_forecasts.py   # Modelos XGBoost de previsão
└── .github/
    └── workflows/
        ├── data-pipeline.yml   # Atualização automática dos dados
        └── deploy.yml          # Deploy no GitHub Pages
```

---

## Funcionalidades

- **Diagrama Sankey** — visualização do fluxo financeiro por fonte de recursos → finalidade → programa
- **Mapa de municípios** — coroplético interativo dos 399 municípios do Paraná
- **Previsões XGBoost** — projeções de tendência de valor contratado e número de contratos
- **Bump chart** — evolução do ranking temporal de municípios/regiões
- **Distribuição multidimensional** — análise por gênero do produtor, finalidade e programa de crédito
- **Treemap de produtos** — participação por produto agropecuário no total contratado
- **Scatter plot** — relação entre variáveis (ex.: área × valor contratado)
- **Séries temporais** — evolução anual do crédito rural com comparativo de períodos
- **Lollipop chart** — comparativo entre municípios ou categorias
- **Filtros encadeados** — por ano, região, município, finalidade e programa
- **399 municípios** cobertos, **R$ 386+ bilhões** em contratos indexados

---

## Desenvolvimento Local

### Pré-requisitos

- Node.js 18+
- Python 3.x (para o pipeline de dados)

### Instalação e execução

```bash
# Clonar o repositório
git clone https://github.com/avnergomes/credito-rural-parana.git
cd credito-rural-parana/dashboard

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

```bash
# Build de produção
npm run build

# Pré-visualizar build
npm run preview
```

---

## Pipeline de Dados

O pipeline é executado automaticamente via GitHub Actions (`.github/workflows/data-pipeline.yml`) e pode ser rodado localmente:

```bash
# Instalar dependências Python
pip install -r scripts/requirements.txt

# 1. Coletar dados brutos da API SICOR/BCB
python scripts/fetch_data.py

# 2. Processar e agregar os dados
python scripts/preprocess_data.py

# 3. Gerar previsões XGBoost
python scripts/generate_forecasts.py
```

Os arquivos gerados são salvos em `dashboard/public/data/` e servidos estaticamente pelo Vite.

---

## Licença

MIT License — consulte o arquivo `LICENSE` no repositório para detalhes.
