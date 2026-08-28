# Site Climbeiros

Site institucional do Climbeiros: hub de academias, cursos, rotas de escalada, guias/dicas e parcerias.

## Como este site funciona

- O conteúdo (academias, cursos, rotas, artigos, parceiros) vem do **Supabase**.
- As páginas são geradas como **arquivos estáticos** (rápidas, gratuitas de hospedar).
- Toda vez que o site for **publicado de novo** (na Vercel), ele busca os dados mais recentes do Supabase.

## Antes de publicar: variáveis de ambiente

O site precisa saber onde fica o seu Supabase. Essas duas informações vão em variáveis de ambiente (nunca direto no código):

```
PUBLIC_SUPABASE_URL=https://ctbetvnlojkpiwrruvie.supabase.co
PUBLIC_SUPABASE_KEY=sb_publishable_BnV0RJeVWRrihXYP9VqI9Q_4Wy_tDMu
```

(veja o arquivo `.env.example` — copie para `.env` se for rodar localmente)

## Rodar localmente (opcional, para testar antes de publicar)

```
npm install
npm run dev
```

Abre em `http://localhost:4321`

## Publicar (deploy)

Ver instruções passo a passo no chat com o Claude — em resumo: subir esse projeto pro GitHub, conectar na Vercel, colar as duas variáveis de ambiente acima, e apontar o domínio climbeiros.com.br pra Vercel.
