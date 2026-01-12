# Configuração das APIs do Google para Roteirização

Este documento explica como configurar as APIs do Google Cloud para usar o sistema de roteirização de entregas no TenisLab.

## 📋 Pré-requisitos

- Conta Google
- Cartão de crédito (para ativar APIs pagas do Google Cloud)
- Projeto TenisLab rodando localmente ou em produção

## 🚀 Passo a Passo

### 1. Criar Projeto no Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Clique em **"Criar Projeto"** (ou selecione um existente)
3. Nome sugerido: `TenisLab Rotas`
4. Aguarde a criação do projeto

### 2. Habilitar as APIs Necessárias

Você precisa habilitar **2 APIs**:

#### A) Routes API (Otimização de Rotas)
1. No menu lateral, vá em **APIs e Serviços** → **Biblioteca**
2. Busque por: `Routes API`
3. Clique em **Ativar**

#### B) Geocoding API (Conversão de Plus Codes)
1. Na mesma biblioteca, busque: `Geocoding API`
2. Clique em **Ativar**

### 3. Criar API Key

1. Vá em **APIs e Serviços** → **Credenciais**
2. Clique em **+ Criar Credenciais** → **Chave de API**
3. Copie a chave gerada (ex: `AIzaSyD...`)

### 4. Configurar Restrições de Segurança (IMPORTANTE!)

Para evitar uso indevido da sua API Key:

1. Clique na API Key criada
2. Em **Restrições de aplicativo**, escolha:
   - **Referenciadores HTTP (sites)** se for usar em produção
   - Adicione seu domínio: `*.vercel.app` ou `tenislab.app.br`
3. Em **Restrições de API**, selecione:
   - ✅ Routes API
   - ✅ Geocoding API
4. Clique em **Salvar**

### 5. Configurar no Projeto TenisLab

#### Desenvolvimento Local:
1. Copie o arquivo `.env.example` para `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edite `.env.local` e adicione sua API Key:
   ```env
   NEXT_PUBLIC_GOOGLE_ROUTES_API_KEY=AIzaSyD...sua_chave_aqui
   NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY=AIzaSyD...sua_chave_aqui
   ```
   
   💡 **Dica**: Você pode usar a mesma chave para ambas as variáveis!

3. Reinicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

#### Produção (Vercel):
1. Acesse o dashboard do Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione as variáveis:
   - `NEXT_PUBLIC_GOOGLE_ROUTES_API_KEY`
   - `NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY`
4. Faça um novo deploy

## 💰 Custos Estimados

### Google Routes API
- **Grátis**: $200 de crédito por mês
- **Preço**: $0.005 por requisição (após créditos)
- **Exemplo**: 1000 otimizações/mês = ~$5 USD

### Geocoding API
- **Grátis**: $200 de crédito por mês
- **Preço**: $0.005 por requisição
- **Exemplo**: 500 conversões/mês = ~$2.50 USD

### 💡 Dica de Economia
- Armazene coordenadas convertidas no banco de dados
- Não converta o mesmo Plus Code múltiplas vezes
- Use cache para rotas frequentes

## ✅ Testando a Configuração

1. Acesse a página de **Entregas** no sistema
2. Adicione algumas coletas com endereços
3. Clique no botão **"Otimizar Rota"**
4. Se configurado corretamente, a rota será otimizada automaticamente

## ❌ Problemas Comuns

### Erro: "API Key não configurada"
- Verifique se adicionou as variáveis no `.env.local` ou Vercel
- Reinicie o servidor após adicionar variáveis

### Erro: "API Key inválida"
- Verifique se copiou a chave completa
- Confirme que as APIs estão habilitadas no Google Cloud

### Erro: "Quota excedida"
- Você atingiu o limite gratuito de $200/mês
- Adicione um método de pagamento no Google Cloud

## 📚 Documentação Oficial

- [Routes API](https://developers.google.com/maps/documentation/routes)
- [Geocoding API](https://developers.google.com/maps/documentation/geocoding)
- [Preços Google Maps Platform](https://mapsplatform.google.com/pricing/)

## 🆘 Suporte

Se tiver dúvidas sobre a configuração, entre em contato com o desenvolvedor do sistema.
