# Notas de versão

Todas as mudanças relevantes do projeto são registradas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/) quando aplicável ao produto.

---

## [Unreleased]

### Como documentar a próxima entrega

1. Mova itens de **Unreleased** para uma nova seção com número de versão e data.
2. Atualize `package.json` (`version`) e o **Manual do usuário** (`docs/MANUAL.md`) conforme novas telas ou fluxos.
3. Veja o guia rápido em `docs/ITERACOES.md`.

---

## [0.1.0] — 2026-04-30

### Adicionado

- **Aplicação fullstack**: front-end React (Vite, TypeScript, Tailwind), API Express, persistência em PostgreSQL via Prisma (`AppState` JSON), scripts de build e deploy Railway (`railway.json`, `nixpacks.toml`, Node 22).
- **Autenticação por perfil (MVP)**: login com seleção de usuário mockado; perfis Administrador, Gestor/Fiscal, Executor, Consulta com menus distintos.
- **Dashboard**: indicadores de vistorias, chamados, vencidos, conclusão; gráficos por status, prioridade e setor; segunda fileira com não conformidades ativas, denúncias em andamento, documentos emitidos e grupos de denúncias.
- **Cadastros (admin)**: locais, itens de checklist (legado), categorias vinculadas às inspeções.
- **Roteiros de vistoria**: áreas de serviço, tipos de vistoria, roteiros (scripts), seções, perguntas com tipo de resposta, criticidade, evidência obrigatória, geração automática de chamado, prazos e referência legal.
- **Vistorias**: fluxo em rascunho ou finalizada; uso de roteiro (perguntas) ou checklist legado por categoria; mapa (Leaflet) com GPS, busca de endereço, geolocalização obrigatória na finalização; evidência fotográfica quando exigida; geração de não conformidades e chamados (origem “Vistoria”) ao finalizar.
- **Planos de ação (não conformidades)**: listagem com filtros, detalhe, mudança de status, anexos, histórico.
- **Chamados**: listagem, filtros, detalhe, comentários, histórico de status, SLA e evidências de conclusão (conforme fluxo existente).
- **Relatórios**: exportação CSV de chamados e cartões descritivos de relatórios.
- **Denúncias (admin)**: triagem de protocolos do portal; filtros por status; agrupamento exibido; encaminhamento, notas, criação de chamado a partir da denúncia.
- **Portal do cidadão** (`/?portal=cidadao`): envio de denúncia com texto, categoria, área de serviço, endereço, anexos, **geolocalização**; agrupamento automático por **proximidade (~150 m)** e **similaridade de motivo**; feedback se o protocolo foi agrupado a um caso existente.
- **Documentos oficiais**: emissão a partir de **não conformidade** ou **denúncia**; tipos (auto de infração, notificação, interdição, etc.); texto de fatos, prazos e medidas; **QR Code** para consulta pública; registro de **assinatura ou recusa** do responsável; impressão no navegador; **impressão térmica Bluetooth (ESC/POS)** com perfil salvo; marcação de impressão/manual; campo `externalAddress` para endereço da denúncia sem local cadastrado.
- **Consulta pública de documento** (`/?documento=<protocolo>`): validação de existência do protocolo sem login (dados limitados por segurança).
- **Impressão Bluetooth**: página de configuração, perfis FFE0 e Nordic UART, teste de página.
- **Auditoria (admin)**: registro de ações administrativas no domínio (com `commit`); fila de sincronização simulada e botão de sincronizar (MVP).
- **PWA**: manifest e suporte a instalação quando o navegador oferece prompt.
- **Dados de demonstração** em `mockData` (vistoria finalizada, NC, denúncia) para testar fluxos sem configurar tudo manualmente; **reset** via API `POST /api/app-data/reset` para voltar ao estado inicial do servidor.

### Alterado

- **Interface** alinhada a padrão administrativo institucional (cores, cards, filtros, badges, responsividade).
- **Armazenamento**: cliente com debounce para `PUT /api/app-data`; carregamento inicial remoto; fallback e normalização de dados (ex.: `qrCodePayload` em documentos antigos).

### Corrigido / Infra

- Build e deploy no Railway: Node 22, instalação de dependências de desenvolvimento no build, resolução de `DATABASE_URL` e variáveis alternativas do PostgreSQL.

### Observações (MVP)

- O portal público **não** exige autenticação; em produção avalie **rate limiting**, **CAPTCHA** e políticas de privacidade.
- A fila de sincronização e parte das notificações são **demonstrativas**; integrações externas reais não estão incluídas.

---

<!-- Ao publicar no GitHub, crie a tag v0.1.0 e ajuste os links abaixo se desejar. -->
[Unreleased]: https://github.com/leandroborgeseng/os/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/leandroborgeseng/os/tree/v0.1.0
