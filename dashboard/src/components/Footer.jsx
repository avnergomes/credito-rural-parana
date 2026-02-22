import { ExternalLink, Github, Database } from 'lucide-react';

export default function Footer() {
  const ecosystemLinks = [
    { name: 'VBP Parana', url: 'https://avnergomes.github.io/vbp-parana/' },
    { name: 'ComexStat Parana', url: 'https://avnergomes.github.io/comexstat-parana/' },
    { name: 'Precos Florestais', url: 'https://avnergomes.github.io/precos-florestais/' },
    { name: 'Precos de Terras', url: 'https://avnergomes.github.io/precos-de-terras/' },
    { name: 'Emprego Agro', url: 'https://avnergomes.github.io/emprego-agro-parana/' },
  ];

  const dataLinks = [
    { name: 'API SICOR/BCB', url: 'https://olinda.bcb.gov.br/olinda/servico/SICOR/versao/v2/swagger-ui3' },
    { name: 'Dados Abertos BCB', url: 'https://dadosabertos.bcb.gov.br/' },
  ];

  return (
    <footer className="bg-dark-900 text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="font-display font-semibold text-lg mb-4">
              Credito Rural Parana
            </h3>
            <p className="text-dark-400 text-sm leading-relaxed">
              Dashboard interativo com dados de financiamento agropecuario do
              estado do Parana, baseado nos dados publicos do Sistema de
              Operacoes do Credito Rural (SICOR) do Banco Central do Brasil.
            </p>
            <div className="flex items-center gap-2 mt-4 text-dark-400 text-sm">
              <Database className="w-4 h-4" />
              <span>Fonte: BCB/SICOR</span>
            </div>
          </div>

          {/* Ecosystem Links */}
          <div>
            <h3 className="font-display font-semibold text-lg mb-4">
              Ecossistema DataGeo
            </h3>
            <ul className="space-y-2">
              {ecosystemLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dark-400 hover:text-primary-400 transition-colors flex items-center gap-2 text-sm"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Data Sources */}
          <div>
            <h3 className="font-display font-semibold text-lg mb-4">
              Fontes de Dados
            </h3>
            <ul className="space-y-2">
              {dataLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dark-400 hover:text-primary-400 transition-colors flex items-center gap-2 text-sm"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <a
                href="https://github.com/avnergomes/credito-rural-parana"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-dark-400 hover:text-white transition-colors text-sm"
              >
                <Github className="w-4 h-4" />
                Ver no GitHub
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-dark-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-dark-500 text-sm">
            Desenvolvido por{' '}
            <a
              href="https://github.com/avnergomes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-400 hover:text-primary-300"
            >
              Avner Gomes
            </a>
          </p>
          <p className="text-dark-500 text-sm">
            Dados atualizados mensalmente via GitHub Actions
          </p>
        </div>
      </div>
    </footer>
  );
}
