#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para exibir mensagens de sucesso
success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

# Função para exibir mensagens de erro
error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

# 1. Parar o PM2
echo "Parando PM2..."
pm2 stop all 2>/dev/null || pm2 kill 2>/dev/null
if [ $? -eq 0 ]; then
    success "PM2 parado com sucesso."
else
    error "Falha ao parar PM2."
    exit 1
fi

# 2. Limpar node_modules
echo "Limpando node_modules..."
rm -rf node_modules
if [ $? -eq 0 ]; then
    success "node_modules removido."
else
    error "Falha ao remover node_modules."
    exit 1
fi

# 3. Limpar dist/
echo "Limpando diretório dist..."
rm -rf dist
if [ $? -eq 0 ]; then
    success "dist removido."
else
    error "Falha ao remover dist."
    exit 1
fi

# 4. Limpar cache npm
echo "Limpando cache npm..."
npm cache clean --force
if [ $? -eq 0 ]; then
    success "Cache npm limpo."
else
    error "Falha ao limpar cache npm."
    exit 1
fi

# 5. Reinstalar dependências
echo "Reinstalando dependências..."
npm install
if [ $? -eq 0 ]; then
    success "Dependências instaladas."
else
    error "Falha ao instalar dependências."
    exit 1
fi

# 6. Recompilar TypeScript
echo "Compilando TypeScript..."
npm run build 2>/dev/null || tsc 2>/dev/null
if [ $? -eq 0 ]; then
    success "TypeScript compilado."
else
    error "Falha na compilação TypeScript."
    exit 1
fi

# 7. Copiar arquivos estáticos (se necessário)
# Descomente e ajuste o caminho conforme necessário
# echo "Copiando arquivos estáticos..."
# cp -r src/public dist/
# if [ $? -eq 0 ]; then
#     success "Arquivos estáticos copiados."
# else
#     error "Falha ao copiar arquivos estáticos."
#     exit 1
# fi

# 8. Iniciar PM2 novamente
echo "Iniciando PM2..."
pm2 start ecosystem.config.js 2>/dev/null || pm2 start app.js --name app 2>/dev/null || pm2 start npm -- start
if [ $? -eq 0 ]; then
    success "PM2 iniciado."
else
    error "Falha ao iniciar PM2."
    exit 1
fi

# 9. Testar a aplicação
echo "Testando a aplicação..."
# Exemplo: curl localhost:3000 ou npm test
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001
HTTP_CODE=$?
if [ $HTTP_CODE -eq 200 ]; then
    success "Aplicação respondeu com sucesso (HTTP 200)."
else
    error "Aplicação não respondeu corretamente."
fi

echo -e "${GREEN}Processo finalizado!${NC}"