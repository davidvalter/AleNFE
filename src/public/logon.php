<!DOCTYPE html>
<html lang="pt-BR">

<!-- logon.php -->

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AleNFE - Login</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            background: radial-gradient(circle at center, #022c22 0%, #020617 100%);
            min-height: 100vh;
            margin: 0;
        }

        .glow-behind {
            position: absolute;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle at center, rgba(16, 185, 129, 0.15) 0%, transparent 70%);
            filter: blur(80px);
            pointer-events: none;
            z-index: 0;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }

        .glass-card {
            background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(40px);
            -webkit-backdrop-filter: blur(40px);
            border: 1px solid rgba(16, 185, 129, 0.2);
            border-radius: 1.5rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            z-index: 1;
        }

        input {
            background-color: #030712;
            border: 1px solid rgba(55, 65, 81, 0.5);
            transition: all 0.3s ease;
        }

        input:focus {
            border-color: #10b981;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
            outline: none;
        }

        .btn-glow {
            background: linear-gradient(135deg, #10b981, #047857);
            transition: all 0.3s ease;
            color: white;
            font-weight: 600;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.75rem;
            cursor: pointer;
        }

        .btn-glow:hover {
            background: linear-gradient(135deg, #34d399, #059669);
            transform: translateY(-2px);
            box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.4);
        }

        /* Estilo para o estado de carregamento */
        .btn-glow:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
        }

        /* Classe para desativar links */
        .link-disabled {
            color: #64748b !important;
            /* slate-500 */
            pointer-events: none;
            /* Impede o clique */
            cursor: default;
            /* Remove a "mãozinha" */
            text-decoration: none;
            opacity: 0.6;
        }
    </style>
</head>

<body class="flex items-center justify-center p-4 relative overflow-hidden">
    <div class="glow-behind"></div>

    <div class="glass-card w-full max-w-md p-8 relative">
        <div class="flex justify-center mb-6">
            <img src="/assets/img/alenfe_logomarca.png" alt="AleNFE" class="h-16 w-auto drop-shadow-lg">
        </div>

        <h2 class="text-2xl font-semibold text-center text-white mb-2">Acesse sua conta</h2>
        <p class="text-center text-gray-400 text-sm mb-8">Sistema de Nota Fiscal Eletrônica</p>

        <!-- Elemento para mensagens de erro -->
        <div id="loginError"
            class="hidden mb-6 p-3 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-300 text-sm text-center">
        </div>

        <!-- ID adicionado ao formulário -->
        <form id="loginForm" class="space-y-5">
            <div>
                <label for="text" class="block text-sm font-medium text-gray-300 mb-1">Usuário</label>
                <input type="text" id="user" name="user" placeholder="Seu usuário de acesso" required
                    class="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:ring-0">
            </div>
            <div>
                <label for="password" class="block text-sm font-medium text-gray-300 mb-1">Senha</label>
                <input type="password" id="password" name="password" placeholder="••••••••" required
                    class="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:ring-0">
            </div>

            <div class="flex items-center justify-between text-sm">
                <label class="flex items-center text-gray-400">
                    <input type="checkbox" id="remember"
                        class="mr-2 rounded bg-slate-800 border-gray-600 text-emerald-500 focus:ring-emerald-500">
                    Lembrar-me
                </label>
                <a href="#" class="text-emerald-400 hover:text-emerald-300 transition link-disabled">Esqueci a senha</a>
            </div>

            <button type="submit" id="btnSubmit" class="btn-glow w-full">Entrar</button>
        </form>

        <p class="text-center text-gray-500 text-sm mt-6">
            Não tem conta? <a href="#"
                class="text-emerald-400 hover:text-emerald-300 transition link-disabled">Cadastre-se</a>
        </p>
    </div>

    <script>
        const loginForm = document.getElementById('loginForm');
        const loginError = document.getElementById('loginError');
        const btnSubmit = document.getElementById('btnSubmit');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Limpar erros anteriores e desabilitar botão
            loginError.classList.add('hidden');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Autenticando...';

            const usuario = document.getElementById('user').value;
            const senha = document.getElementById('password').value;

            try {
                const response = await fetch('https://alenfe.alecriminteligente.com.br/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ usuario, senha })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Usuário ou senha incorretos.');
                }

                // CORRIGIDO: o backend responde { success, token, user: {id, nome, usuario, role} }
                if (!data.token || !data.user) {
                    throw new Error('Resposta de login inválida (token ausente). Verifique a versão do backend.');
                }

                // Armazenar sessão no localStorage
                localStorage.setItem('alenfe_session', JSON.stringify({
                    token: data.token,
                    user: data.user,
                    timestamp: new Date().getTime()
                }));

                // Redirecionar para o Menu
                window.location.href = 'menu.php';

            } catch (error) {
                loginError.textContent = error.message;
                loginError.classList.remove('hidden');
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Entrar';
            }
        });
    </script>
</body>

</html>