<?php
/**
 * /src/public/index.php
 * AleNFE - Roteador de Autenticação
 */
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>AleNFE - Carregando...</title>
    <script>
        (function() {
            // Verifica se existe uma sessão ativa no cache do navegador
            const session = localStorage.getItem('alenfe_session');

            if (session) {
                // Usuário autenticado -> Vai para o Menu
                window.location.href = 'menu.php';
            } else {
                // Usuário não autenticado -> Vai para o Logon
                window.location.href = 'logon.php';
            }
        })();
    </script>
    <style>
        /* Estética simples para o breve momento de transição */
        body { 
            background-color: #020617; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
        }
        .loader {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(16, 185, 129, 0.1);
            border-top: 3px solid #10b981;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="loader"></div>
</body>
</html>