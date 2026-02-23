import { Database, ExternalLink } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark-900 text-dark-300 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Fonte de Dados */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-primary-500" />
              Fonte de Dados
            </h4>
            <ul className="space-y-1.5 text-xs text-dark-400">
              <li>
                <a
                  href="https://olinda.bcb.gov.br/olinda/servico/SICOR/versao/v2/swagger-ui3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-400 transition-colors inline-flex items-center gap-1"
                >
                  SICOR - Banco Central do Brasil
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Sistema de Operacoes do Credito Rural e do Proagro</li>
            </ul>
            <p className="text-xs text-dark-500">Filtragem: Parana (PR), 2013-2026</p>
          </div>

          {/* Datageo Parana */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm">
              <a
                href="https://datageoparana.github.io"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-400 transition-colors inline-flex items-center gap-1"
              >
                Datageo Parana
                <ExternalLink className="w-3 h-3" />
              </a>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              <a
                href="https://avnergomes.github.io/vbp-parana/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2.5 py-1 text-[10px] rounded-full border border-dark-700 text-dark-300 hover:text-primary-400 hover:border-primary-500 transition-colors"
              >
                VBP Parana
              </a>
              <a
                href="https://avnergomes.github.io/comexstat-parana/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2.5 py-1 text-[10px] rounded-full border border-dark-700 text-dark-300 hover:text-primary-400 hover:border-primary-500 transition-colors"
              >
                ComexStat Parana
              </a>
              <a
                href="https://avnergomes.github.io/precos-diarios/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2.5 py-1 text-[10px] rounded-full border border-dark-700 text-dark-300 hover:text-primary-400 hover:border-primary-500 transition-colors"
              >
                Precos Diarios
              </a>
              <a
                href="https://avnergomes.github.io/precos-florestais/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2.5 py-1 text-[10px] rounded-full border border-dark-700 text-dark-300 hover:text-primary-400 hover:border-primary-500 transition-colors"
              >
                Precos Florestais
              </a>
              <a
                href="https://avnergomes.github.io/precos-de-terras/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2.5 py-1 text-[10px] rounded-full border border-dark-700 text-dark-300 hover:text-primary-400 hover:border-primary-500 transition-colors"
              >
                Precos de Terras
              </a>
              <a
                href="https://avnergomes.github.io/emprego-agro-parana/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2.5 py-1 text-[10px] rounded-full border border-dark-700 text-dark-300 hover:text-primary-400 hover:border-primary-500 transition-colors"
              >
                Emprego Agro
              </a>
              <a
                href="https://avnergomes.github.io/censo-parana/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2.5 py-1 text-[10px] rounded-full border border-dark-700 text-dark-300 hover:text-primary-400 hover:border-primary-500 transition-colors"
              >
                Censo Parana
              </a>
            </div>
          </div>

          {/* Developer */}
          <div className="space-y-3 flex flex-col items-start md:items-end">
            <a
              href="https://avnergomes.github.io/portfolio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-dark-400 hover:text-primary-400 transition-colors group"
              title="Portfolio"
            >
              <img
                src={`${import.meta.env.BASE_URL}assets/logo.png`}
                alt="Avner Gomes"
                className="w-8 h-8 rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
              />
              <span className="text-xs">Desenvolvido por Avner Gomes</span>
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-6 pt-4 border-t border-dark-700 flex items-center justify-between text-[10px] text-dark-500">
          <p>&copy; {currentYear} Credito Rural Parana. Dados publicos.</p>
        </div>
      </div>
    </footer>
  );
}
