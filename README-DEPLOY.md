# Deploy aaPanel + PM2

## Diretório final no servidor
/www/wwwroot/alenfe.alecriminteligente.com.br/

## Instalação
1. Envie os arquivos para o diretório acima
2. Copie `.env.example` para `.env`
3. Rode:
   npm install
   npx prisma generate
   npx prisma migrate deploy
   npm run build
4. No aaPanel PM2:
   - App Name: alenfe-sefaz
   - Startup File: dist/server.js
   - Working Directory: /www/wwwroot/alenfe.alecriminteligente.com.br/
5. Faça upload dos certificados em `/certs`
