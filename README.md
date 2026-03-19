# Eugência AI - Deploy no Vercel

Este projeto foi adaptado para rodar no Vercel.

## Configuração do Firebase

Para que a autenticação e o banco de dados funcionem corretamente:

1.  **Domínios Autorizados**: Adicione o seu domínio do Vercel (`*.vercel.app`) no Console do Firebase em **Authentication > Settings > Authorized domains**.
2.  **Variáveis de Ambiente**: No painel do Vercel, adicione a seguinte variável de ambiente:
    *   `GEMINI_API_KEY`: Sua chave da API do Gemini.

## Scripts

*   `npm run build`: Gera a versão de produção na pasta `dist`.
*   `npm run dev`: Inicia o servidor de desenvolvimento.

## Estrutura

O projeto é um SPA (Single Page Application) construído com Vite e React. O arquivo `vercel.json` garante que todas as rotas sejam redirecionadas para o `index.html`, permitindo o funcionamento correto do roteamento no lado do cliente (se adicionado futuramente).
