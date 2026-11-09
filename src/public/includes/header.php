<?php // includes/header.php ?>
<!DOCTYPE html>
<html lang="pt-BR" class="bg-slate-950 text-slate-200">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AleNFE</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Main CSS -->
    <link rel="stylesheet" href="/css/main.css">

    <script>
        // Auth Guard: Verifica a sessão antes de carregar o restante da página
        (function () {
            const isLoginPage = window.location.pathname.includes('index.php') ||
                window.location.pathname.includes('logon.php');

            let temToken = false;
            try {
                const session = JSON.parse(localStorage.getItem('alenfe_session') || 'null');
                temToken = !!session?.token; // CORRIGIDO: exige token, não só a chave existir
            } catch (e) {
                temToken = false;
            }

            if (!temToken && !isLoginPage) {
                window.location.href = 'index.php';
            }
        })();

        // Função de Logout (ÚNICA — remover a duplicata do api-auth.js)
        function logout() {
            localStorage.removeItem('alenfe_session');
            window.location.href = 'index.php';
        }
    </script>
</head>

<body class="min-h-screen flex flex-col">
    <header class="bg-slate-900/80 backdrop-blur-md border-b border-emerald-500/20 shadow-lg sticky top-0 z-50">
        <div class="container mx-auto px-4 py-3 flex items-center justify-between">
            <!-- Logo -->
            <div class="flex items-center space-x-2">
                <div class="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                    <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <span class="text-xl font-bold tracking-tight text-white">Ale<span
                        class="text-emerald-400">NFE</span></span>
            </div>

            <!-- User info & logout -->
            <div class="flex items-center space-x-6">
                <div class="flex items-center gap-3 border-r border-slate-700 pr-6">
                    <div
                        class="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <svg class="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                clip-rule="evenodd" />
                        </svg>
                    </div>
                    <span id="header-user-name"
                        class="hidden sm:block text-sm font-medium text-slate-200">Carregando...</span>
                </div>

                <button onclick="logout()"
                    class="flex items-center gap-2 text-slate-400 hover:text-rose-400 transition-all duration-200 group">
                    <span class="text-sm font-medium">Sair</span>
                    <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none"
                        stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        </div>
    </header>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const sessionData = localStorage.getItem('alenfe_session');
            if (sessionData) {
                try {
                    const session = JSON.parse(sessionData);
                    const userNameElement = document.getElementById('header-user-name');

                    if (userNameElement) {
                        // Tenta buscar o nome, depois o usuário, ou usa um padrão
                        const displayName = session.user?.nome || session.user?.usuario || 'Usuário';
                        userNameElement.textContent = displayName;
                    }
                } catch (e) {
                    console.error("Erro ao processar sessão:", e);
                }
            }
        });
    </script>

    <div class="flex flex-1">