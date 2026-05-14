# AI ERP Assistant

Plataforma inteligente para automação empresarial utilizando IA Generativa, integração de sistemas e análise operacional em tempo real.

## Objetivo

Criar um assistente empresarial capaz de consultar dados simulados de ERP, responder perguntas em linguagem natural e gerar insights sobre pedidos, produção, estoque e atrasos.

## Tecnologias

- Node.js
- TypeScript
- Express
- OpenAI API
- React
- Vite
- JavaScript
- ERP Data Simulation

## Funcionalidades

- Chat com IA para consulta empresarial
- Base simulada de pedidos, clientes, estoque e produção
- Respostas em linguagem natural
- Identificação de pedidos atrasados
- Resumo operacional
- Sugestões de ação para tomada de decisão
- Estrutura preparada para integração futura com ERP real

## Estrutura

```text
ai-erp-assistant/
├── backend/
│   ├── src/
│   │   ├── data/
│   │   ├── routes/
│   │   ├── services/
│   │   └── server.ts
├── frontend/
│   └── src/
├── docs/
└── README.md
```

## Como executar

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Variáveis de ambiente

Crie um arquivo `.env` dentro da pasta `backend`:

```env
OPENAI_API_KEY=sua_chave_aqui
PORT=3001
```

## Exemplos de perguntas

```text
Quais pedidos estão atrasados?
Qual cliente tem maior volume de pedidos?
Como está o status da produção?
Existe risco de atraso na entrega?
Faça um resumo operacional do dia.
```

## Roadmap

- Integração com banco PostgreSQL
- Integração com Supabase
- Upload de planilhas Excel
- Dashboard com KPIs
- Autenticação de usuários
- Integração com ERP real
- Geração de relatórios em PDF

## Autor

Henrique Sembla  
Generative AI & Automation Specialist
