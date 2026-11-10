This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Autenticação e painel administrativo

O site é público, exceto o painel em `/admin`, acessível apenas por gestores e
profissionais do HEMOAL (login em `/login`, somente e-mail e senha). A
autenticação usa [Better Auth](https://better-auth.com) com o plugin admin.

- **Não há cadastro público.** Novos usuários são criados por gestores em
  `/admin/usuarios`.
- **Papéis** (`lib/permissions.ts`): `admin` (Gestor — acesso total, incluindo
  usuários) e `staff` (Profissional — opera o cadastro de doadores).
- **Proxy** (`proxy.ts`): só intercepta `/admin/*` e redireciona quem não tem
  cookie de sessão. A validação real da sessão e das permissões é feita no
  servidor (`lib/auth-session.ts` e `authActionClient` em `server/safe-action.ts`).

### Primeiro usuário

Configure `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL` no `.env` (veja
`.env.example`), aplique as migrações e crie o primeiro gestor pela CLI:

```bash
pnpm prisma migrate deploy
pnpm auth:create-admin --email gestor@exemplo.com --name "Nome do Gestor"
```

A CLI pede a senha de forma interativa (ou aceite `--password`).

Ao mudar a configuração do Better Auth (por exemplo, adicionar plugins), rode
`pnpm auth:generate` para atualizar `prisma/schema/auth.prisma` e depois
`pnpm prisma migrate dev`.

## Campanhas de convocação

Em `/admin/campanhas` gestores e profissionais criam campanhas que convocam por
e-mail os doadores dos tipos sanguíneos em necessidade.

- **Rascunho → prévia → envio.** A campanha nasce como rascunho (nada é
  enviado). A página da campanha mostra a prévia do e-mail e do público; o
  envio só acontece após confirmação, e apenas para os doadores exibidos.
- **Quem é convocado** (`lib/campaign.ts`): doadores com exatamente um dos
  tipos selecionados, que aceitam convocações, cuja última doação foi há mais
  que o intervalo mínimo e sem envio aceito dentro do intervalo entre
  convocações. Os intervalos ficam em `/admin/campanhas/configuracoes`.
- **Envio** (`server/workflows/campaign.workflow.ts`): um Workflow envia os
  e-mails pela API REST do Cloudflare Email Sending
  (`lib/email/cloudflare.ts`), a partir de `convocacao@hemoal.gepetojj.com`,
  com o template de `lib/email/campaign-template.ts`. Cada tentativa fica
  registrada; falhas podem ser reenviadas sem afetar quem já recebeu.

Configure `CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_EMAIL_API_TOKEN` (veja
`.env.example`) e habilite o domínio no Email Sending da Cloudflare.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
