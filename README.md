# 🎫 EasyTicket - Gestão de Eventos e Campanhas

![EasyTicket Logo](assets/easyticket2.png)

O **EasyTicket** é uma solução completa para gestão de eventos, controle de vendas e automação de marketing via WhatsApp. Desenvolvido como uma aplicação desktop (Electron) integrada a um ecossistema robusto de backend, o sistema oferece desde o cadastro de clientes até o envio de campanhas personalizadas.

---

## 🚀 Funcionalidades Principais

- **👤 Gestão de Clientes**: Cadastro completo com validação de CPF e máscaras inteligentes.
- **🎟️ Controle de Eventos**: Criação e monitoramento de eventos (estágios: Ativo/Concluído).
- **💰 Gestão de Vendas**: Registro de transações vinculadas a clientes e eventos específicos.
- **📱 Automação WhatsApp**: 
    - Envio de campanhas em massa com suporte a imagens e tags personalizadas (`{nome}`, `{empresa}`).
    - Sistema de retentativas automáticas e controle de delay para evitar banimentos.
    - Monitoramento de status em tempo real (Aguardando Scan, Conectado, Autenticando).
- **📊 Dashboard & Métricas**: Visualização de desempenho de vendas e engajamento de campanhas.

---

## 🛠️ Stack Tecnológica

### Frontend (Desktop)
- **Core**: JavaScript (Vanilla ES6+), Electron.
- **UI/UX**: HTML5, CSS3 (Bulma CSS Framework), Google Fonts (Poppins).
- **Comunicação**: Axios para chamadas API.

### Backend (API)
- **Ambiente**: Node.js, Express.
- **Banco de Dados**: MySQL gerenciado via **Prisma ORM**.
- **Segurança**: JWT (JSON Web Token) para autenticação e bcryptjs para hash de senhas.
- **Integração**: `whatsapp-web.js` para controle remoto da instância do WhatsApp.

---

## 📂 Arquitetura do Projeto

O projeto é dividido em dois repositórios principais para garantir separação de responsabilidades:

1. **`easyticket/`**: App desktop Electron (Interface e lógica de visualização).
2. **`easyticket-back/`**: API RESTful e serviços de fundo (Base de dados e integração WhatsApp).

---

## ⚙️ Instalação e Configuração

### Pré-requisitos
- Node.js (v18 ou superior)
- MySQL Server

### 1. Configurando o Backend
```bash
cd easyticket-back
npm install
```
Crie um arquivo `.env` na raiz do backend com a URL do seu banco de dados:
```env
DATABASE_URL="mysql://USUARIO:SENHA@localhost:3306/easyticket"
```
Execute as migrações do Prisma:
```bash
npx prisma migrate dev
```

### 2. Configurando o Frontend
```bash
cd easyticket
npm install
```

### 3. Rodando a Aplicação
Você pode rodar ambos simultaneamente a partir da raiz do frontend:
```bash
npm run dev
```

---

## 📊 Modelo de Dados (Entidades)

O banco de dados segue um esquema relacional otimizado:
- **Client**: Dados cadastrais e histórico de vendas.
- **Event**: Detalhes do evento (local, data, capacidade).
- **Sale**: Transações financeiras vinculadas a Clientes e Eventos.
- **Campaign**: Templates de mensagens e configurações de envio.
- **CampaignLog**: Rastreabilidade individual de envio por campanha/cliente.


## 📄 Licença
Distribuído sob a licença ISC. Veja `LICENSE` para mais informações.
