# Manual do sistema — Vistorias, chamados e fiscalização municipal

Versão do manual: **0.1.1** (alinhada à versão `0.1.1` do changelog; atualize ambos a cada entrega.)

Este documento descreve as **funcionalidades já implementadas** no MVP, do ponto de vista de quem usa o sistema (gestores, fiscais, equipes e cidadãos). Para desenvolvedores: veja também `README.md`, `CHANGELOG.md` e `docs/ITERACOES.md`.

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Perfis, permissões e acesso](#2-perfis-permissões-e-acesso)
3. [URLs e atalhos](#3-urls-e-atalhos)
4. [Persistência, dados de demonstração e reset](#4-persistência-dados-de-demonstração-e-reset)
5. [Dashboard (Painel)](#5-dashboard-painel)
6. [Cadastros](#6-cadastros)
7. [Roteiros de vistoria](#7-roteiros-de-vistoria)
8. [Vistorias](#8-vistorias)
9. [Planos de ação (não conformidades)](#9-planos-de-ação-não-conformidades)
10. [Chamados](#10-chamados)
11. [Denúncias (triagem administrativa)](#11-denúncias-triagem-administrativa)
12. [Portal do cidadão](#12-portal-do-cidadão)
13. [Documentos oficiais](#13-documentos-oficiais)
14. [Consulta pública de documento](#14-consulta-pública-de-documento)
15. [Impressão Bluetooth](#15-impressão-bluetooth)
16. [Relatórios](#16-relatórios)
17. [Auditoria e sincronização (MVP)](#17-auditoria-e-sincronização-mvp)
18. [Protocolos e prefixos](#18-protocolos-e-prefixos)
19. [Limitações e boas práticas em produção](#19-limitações-e-boas-práticas-em-produção)

---

## 1. Visão geral

O sistema reúne:

- **Planejamento** de fiscalização por **áreas de serviço** e **roteiros** (perguntas configuráveis).
- **Execução de vistorias** em campo, com geolocalização e evidências.
- **Registro de não conformidades** e **planos de ação**.
- **Chamados** (manutenção / execução) com histórico e SLA.
- **Denúncias do cidadão** com mapa, anexos e **agrupamento** de casos semelhantes e próximos.
- **Documentos oficiais** (autos, notificações, etc.) com QR para consulta pública e opções de impressão.
- **Painel** de indicadores e **auditoria** de ações administrativas (escopo do MVP).

Stack resumida: interface web responsiva (PWA) com **identidade visual institucional** configurável (logo em `public/`), API Node, banco PostgreSQL; em deploy único, o servidor entrega o front compilado e a API.

---

## 2. Perfis, permissões e acesso

O login atual é **demonstrativo**: escolha um usuário na lista e use a senha indicada na tela (protótipo).

| Perfil | Descrição resumida | Acesso às páginas (visão geral) |
|--------|-------------------|----------------------------------|
| **Administrador** | Configuração geral | Todas, incluindo Cadastros e Auditoria |
| **Gestor / Fiscal** | planejamento e fiscalização | Dashboard, Roteiros, Denúncias, Vistorias, Planos, Documentos, Chamados, Relatórios, Impressão |
| **Executor** | execução / equipe | Dashboard, Planos, Chamados, Impressão |
| **Consulta** | somente leitura ampla | Dashboard, Denúncias, Planos, Documentos, Chamados, Relatórios (sem Cadastros, Roteiros, Vistorias, Impressão, Auditoria) |

*A matriz exata está no código (`pageConfig`); se novas páginas forem criadas, atualize esta tabela no manual.*

### Navegação e fluxo

- O **menu lateral** (e o menu “**Mais**” no celular) agrupa as páginas por **etapa do trabalho**: Visão geral, Planejamento, Campo e fiscalização, Cidadão e demandas, Indicadores e Auditoria — para não parecer uma lista aleatória de funções.
- No **Painel**, o cartão **Fluxo de trabalho** mostra **atalhos numerados** na ordem sugerida; a lista muda conforme o **perfil** (admin vê também Roteiros, Cadastros e Auditoria).
- O **cabeçalho** de cada tela repete o **grupo**, o **nome curto** da página (ex.: Painel, Vistorias) e uma **frase de ajuda** sobre o que fazer naquela área.
- Na **barra inferior** (smartphone), quatro atalhos refletem o uso mais comum do perfil; o quinto botão (**Mais**) abre o menu completo.

## 3. URLs e atalhos

| Recurso | Como acessar |
|---------|----------------|
| Área administrativa | `/` (após login) |
| Portal do cidadão | `/?portal=cidadao` |
| Consulta pública de documento | `/?documento=DOC-ANO-NNNN` (número exato do protocolo; use o valor codificado pelo sistema quando aplicável) |
| Pré-selecionar denúncia na tela de vistorias | `/?vincularDenuncia=<id>` — ao abrir **Vistorias**, o protocolo correspondente aparece no campo opcional (a URL é normalmente aplicada pelo botão na triagem de denúncias) |
| Atalho de menu após login | `/?atalho=<id>` — ex.: `/?atalho=vistorias` |

IDs úteis de atalho: `dashboard`, `cadastros`, `roteiros`, `denuncias`, `vistorias`, `planos`, `documentos`, `chamados`, `relatorios`, `impressao`, `auditoria`.

---

## 4. Persistência, dados de demonstração e reset

- Os dados vivem em um **único documento JSON** no PostgreSQL (modelo `AppState`), servindo de “estado da aplicação” para o MVP.
- O navegador mantém **cópia local** para uso offline parcial e **reenvia** alterações para o servidor com debounce quando online.
- O projeto inclui **dados de demonstração** (vistoria finalizada, uma não conformidade, uma denúncia) para facilitar testes.
- **Reset no servidor:** `POST /api/app-data/reset` restaura o estado para o seed inicial carregado pelo servidor (equivalente ao conteúdo de demonstração em `mockData` / primeira carga).

*Em produção, planeje backup e política de retenção antes de usar reset em ambiente compartilhado.*

---

## 5. Dashboard (Painel)

**Objetivo:** visão gerencial rápida e **entrada no fluxo** do dia.

**Conteúdo principal:**

- **Fluxo de trabalho:** atalhos numerados (Denúncias → Vistorias → Planos → Documentos → Chamados, etc., conforme perfil) para reduzir cliques e orientar quem está começando.
- Contadores: vistorias finalizadas, chamados, vencidos, percentual concluído/validado.
- Segunda fileira: não conformidades ativas, denúncias em andamento, documentos emitidos, grupos de denúncias.
- Gráficos: chamados por status, por prioridade, por setor; lista resumida de chamados vencidos; tempo médio de conclusão (quando houver dados).

**Quem acessa:** todos os perfis com permissão de Painel (`dashboard`).

---

## 6. Cadastros

**Objetivo:** manter estruturas básicas usadas em vistorias e chamados.

**Disponível para:** apenas **Administrador**.

**Funcionalidades:**

- **Locais:** nome, endereço, setor, tipo de local, ativo/inativo.
- **Itens de checklist (legado):** vínculo com categoria; usados quando a vistoria **não** usa roteiro por script (apenas categoria antiga).
- **Categorias** usadas nos cadastros e filtros.

---

## 7. Roteiros de vistoria

**Objetivo:** adaptar o sistema a diferentes realidades (obras, educação, vigilância sanitária, etc.) por meio de roteiros configuráveis.

**Disponível para:** Administrador e Gestor/Fiscal.

**Estrutura hierárquica:**

1. **Área de serviço** — ex.: Vigilância Sanitária, Obras.
2. **Tipo de vistoria** — ex.: Restaurante, Prédio público (com rótulo do alvo fiscalizado).
3. **Roteiro (script)** — conjunto versionado de perguntas para aquele tipo.
4. **Seções** — blocos dentro do roteiro.
5. **Perguntas** — com código e texto; tipo de resposta (conformidade, sim/não, texto, foto, etc.); obrigatoriedade; **evidência obrigatória**; **abrir chamado automaticamente** e prazo sugerido; **criticidade**; referência legal (texto).

Alterações aqui refletem nas **novas** vistorias que selecionarem esse roteiro.

---

## 8. Vistorias

**Objetivo:** registrar inspeção em campo até finalização.

**Disponível para:** Administrador e Gestor/Fiscal.

**Fluxo resumido:**

1. Informe **área de serviço**, **tipo**, **roteiro** (quando houver), **setor**, **local**, **categoria** (exigência do modelo atual).
2. Opcionalmente vincule uma **denúncia** (protocolo do portal) ao **finalizar** a vistoria: o protocolo passa a referenciar esta inspeção em campo (rastreio na própria ficha da denúncia). Trocar a área de serviço limpa essa seleção.
3. Responda cada item (conforme / não conforme / não se aplica), observações e fotos.
4. Use o **mapa** para marcar posição: GPS, busca de endereço (requer rede) ou clique no mapa.
5. **Finalizar** exige **geolocalização** preenchida.
6. Para itens **não conformes** com **evidência obrigatória**, é necessário **ao menos uma foto** por item antes de finalizar.
7. Ao finalizar com não conformidades: o sistema pode gerar **registros de não conformidade** e **chamados** (origem “Vistoria”) conforme regras de cada pergunta; uma mensagem na tela oferece ir a **Planos de ação**.

**Rascunho:** salva inspeção sem exigir o mesmo rigor de finalização (o vínculo com denúncia só é gravado ao **finalizar**).

---

## 9. Planos de ação (não conformidades)

**Objetivo:** acompanhar tratamento das irregularidades (da vistoria ou fluxos futuros).

**Disponível para:** admin, gestor, executor e consulta (conforme menu).

**Funcionalidades:**

- Lista com filtros (status, criticidade, etc., conforme a interface). Listas vazias podem exibir um botão para **Ir para Vistorias** ou **Limpar filtros**, conforme o caso.
- Detalhe: prazos, equipe, vínculo com vistoria, evidências.
- **Mudança de status** (ex.: aberta, em adequação, corrigida, validada) com observação.
- **Anexar evidências** adicionais.
- **Histórico** de movimentações.

---

## 10. Chamados

**Objetivo:** gestão operacional de demandas (manutenção, correções).

**Funcionalidades principais:**

- Listagem com busca/filtros.
- Detalhe: descrição, SLA, prioridade, equipe, origem (manual ou vistoria).
- **Comentários** e **histórico** de mudança de status.
- Evidências de conclusão quando o fluxo permitir.

**Relação com denúncias:** na triagem de denúncias é possível **criar chamado** a partir do protocolo.

---

## 11. Denúncias (triagem administrativa)

**Objetivo:** processar o que chegou pelo **portal do cidadão**.

**Funcionalidades:**

- Métricas resumidas (recebidas, triagem, encaminhadas, grupos).
- Filtro por status; botão limpar filtros (e CTA quando a lista está vazia só por causa do filtro).
- **Andamento do protocolo**: passos visuais **Triagem → Vistoria → Documento**, alinhados ao status, à vistoria vinculada e a documentos oficiais com o mesmo protocolo.
- Detalhe da denúncia: texto, categoria, área, mapa (se houver coordenadas), anexos.
- Se pertencer a um **grupo**: exibe quantos protocolos compõem o mesmo caso aproximado.
- **Alterar status** e registrar **notas de triagem**.
- **Criar chamado** vinculado (setor/equipe conforme seleção na tela).
- Se a denúncia ainda não tiver vistoria em campo vinculada: botão para abrir **Vistorias** com o protocolo **pré-selecionado** (atalho operacional).

**Quem acessa:** admin, gestor e consulta (conforme menu).

---

## 12. Portal do cidadão

**Objetivo:** receber relatos da população sem login.

**Acesso:** `/?portal=cidadao` (responsivo para celular).

**O cidadão pode informar:**

- Categoria e área de serviço (quando disponível na lista).
- Título e descrição do problema.
- Endereço textual.
- **Localização por GPS** (recomendado).
- Anexos (imagens / arquivos conforme navegador).
- Opção de **denúncia anônima** ou identificação (nome/contato).

**Agrupamento automático:** denúncias **próximas** (raio na ordem de **150 metros**) e com **motivo semelhante** podem ser **unidas ao mesmo grupo**; o sistema informa ao cidadão se o protocolo foi agrupado a um caso existente.

**Persistência:** gravação pública no estado (auditoria de usuário simplificada no MVP do portal).

---

## 13. Documentos oficiais

**Objetivo:** emitir e controlar documentos formais ligados à fiscalização ou denúncia.

**Disponível para:** emissão principalmente **admin** e **gestor**; **consulta** pode ver conforme menu (documentos na barra lateral).

**Origens da emissão:**

1. **Não conformidade (vistoria)** — fatos baseados na NC e na vistoria vinculada.
2. **Denúncia do cidadão** — fatos baseados no protocolo, endereço informado e descrição; pode incluir identificação do denunciante se não for anônimo.

**Tipos** (lista atual): Auto de Infração, Notificação, Interdição, Apreensão, Embargo, Relatório de Vistoria.

**Após gerar:**

- Visualização com **QR Code** apontando para a **consulta pública**.
- **Registrar assinatura** do responsável ou **recusa** (nome, documento, observação).
- **Imprimir no navegador** (layout de impressão).
- **Imprimir via Bluetooth** na impressora configurada (texto em colunas estilo recibo; ver seção 15).
- **Registrar impressão manual** quando o papel já saiu por outro meio.

**Campos especiais:** quando a origem é denúncia sem local cadastrado, o **endereço do relato** é guardado em **endereço externo** e usado no documento e na impressão térmica.

---

## 14. Consulta pública de documento

**Objetivo:** permitir que qualquer pessoa **valide** se um número de protocolo de documento existe na base, **sem login**.

**Acesso:** `/?documento=<número do documento>` (como impresso no QR).

**Exibição:** tipo, número, situação, datas, local ou endereço informado na denúncia, área; visão de **confirmação institucional**, sem expor todo o detalhamento jurídico na página pública. Links para portal do cidadão e área administrativa.

---

## 15. Impressão Bluetooth

**Objetivo:** testar e usar impressora **térmica** compatível com **BLE** e envio **ESC/POS** pelo navegador.

**Disponível para:** admin, gestor, executor.

**Passos:**

1. Abra a página **Impressão**.
2. Escolha o **perfil** do dispositivo (ex.: serviço genérico FFE0 ou Nordic UART).
3. Use **Conectar e imprimir teste**.
4. Na página **Documentos**, use **Impressora Bluetooth** após configurar o perfil (o sistema reutiliza o perfil salvo no armazenamento local do navegador).

**Requisitos:** em geral **Chrome no Android**, **HTTPS** ou PWA instalado; suporte à **Web Bluetooth API**.

**Fallback:** impressão pelo diálogo do navegador.

---

## 16. Relatórios

**Objetivo:** exportação e visão analítica simples.

- **Exportação CSV** de chamados (compatível com planilhas).
- Cartões descritivos de outros relatórios (parte do conteúdo é descritiva do MVP).

---

## 17. Auditoria e sincronização (MVP)

**Auditoria (admin):** lista de eventos registrados quando ações usam o fluxo administrativo com auditoria (ação, entidade, descrição, usuário, data).

**Sincronização:** indicador de fila pendente e botão para marcar itens como sincronizados — comportamento **simplificado** para demonstração; não substitui integração com sistemas externos reais.

---

## 18. Protocolos e prefixos

Formato típico: `PREFIXO-ANO-NNNN`.

| Prefixo | Uso |
|---------|-----|
| VIS | Vistoria |
| CH | Chamado |
| NC | Não conformidade |
| DOC | Documento oficial |
| DEN | Denúncia (cidadão) |
| GRP | Grupo de denúncias |

---

## 19. Limitações e boas práticas em produção

- **Segurança:** login mock; portal público sem anti-abuso robusto; avaliar autenticação real, HTTPS, políticas LGPD e limites de API.
- **Dados:** modelo JSON único facilita o MVP mas pode precisar de **normalização** e APIs específicas conforme o crescimento.
- **Impressão:** nem toda impressora suporta os mesmos UUIDs Bluetooth; teste em campo.
- **Documentação:** a cada entrega, atualize `CHANGELOG.md`, `docs/MANUAL.md` e siga `docs/ITERACOES.md`.

---

*Fim do manual v0.1.0.*
