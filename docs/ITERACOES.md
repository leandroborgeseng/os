# Guia de documentação por iteração

Use este guia a cada entrega para manter **notas de versão** e o **manual** alinhados ao produto.

## Checklist rápido

1. **Código pronto** — testes manuais ou automatizados do fluxo novo ou alterado.
2. **`CHANGELOG.md`**
   - Em **\[Unreleased\]**, liste em português:
     - **Adicionado** — funcionalidades novas.
     - **Alterado** — mudança de comportamento ou UX.
     - **Corrigido** — bugs.
     - **Removido** — recursos retirados (raro no MVP).
     - **Segurança** — quando aplicável.
   - Ao fechar a versão, renomeie **\[Unreleased\]** para **`[X.Y.Z] — AAAA-MM-DD`**, abra um novo **\[Unreleased\]** vazio no topo e atualize os links do rodapé do changelog (se usar tags no GitHub).
3. **`package.json`** — campo `"version"`: incremente **patch** (0.1.1) para correções pequenas, **minor** (0.2.0) para funcionalidades compatíveis, **major** (1.0.0) para ruptura de contrato ou release estável acordado.
4. **`docs/MANUAL.md`**
   - Localize o módulo afetado na estrutura do sumário.
   - Atualize: objetivo da tela, perfis com acesso, passo a passo, campos importantes, limitações.
   - Se criar **nova seção** (novo menu), acrescente entrada no sumário e, se necessário, uma linha na tabela **Perfis x páginas**.
5. **README** — só ajuste se mudar instalação, variáveis de ambiente ou deploy.

## Boas práticas

- Prefira descrever o que o **usuário consegue fazer**, não só o nome da função no código.
- Mencione URLs públicas (`?portal=cidadao`, `?documento=`) quando o fluxo for exposto na internet.
- Se algo for **provisório** ou **somente demonstração**, marque como *MVP* ou *simulado* no manual e no changelog.

## Referência de URLs do sistema

| URL / parâmetro | Uso |
|-----------------|-----|
| `/` | Login e área administrativa |
| `/?portal=cidadao` | Portal do cidadão (denúncia) |
| `/?documento=<número>` | Consulta pública de documento oficial |
| `/?atalho=<id da página>` | Atalho para abrir página após login (ex.: `vistorias`) |

IDs de página válidos para `atalho`: `dashboard`, `cadastros`, `roteiros`, `denuncias`, `vistorias`, `planos`, `documentos`, `chamados`, `relatorios`, `impressao`, `auditoria`.
