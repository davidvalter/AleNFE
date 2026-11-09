// /src/public/includes/api-auth.js
const API_AUTH_BASE = "https://alenfe.alecriminteligente.com.br";
const SESSION_KEY = "alenfe_session";

function getToken() {
    try {
        const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        return s?.token || null;
    } catch {
        return null;
    }
}

function exigeSessao() {
    if (!getToken()) {
        window.location.href = "/logon.php";
        return false;
    }
    return true;
}

/**
 * Wrapper de fetch com o token JWT.
 * Em 401: limpa a sessão e volta para o login.
 */
async function apiFetch(path, options = {}) {
    const headers = Object.assign(
        { "Authorization": "Bearer " + getToken() },
        options.headers || {}
    );

    const resp = await fetch(API_AUTH_BASE + path, { ...options, headers });

    if (resp.status === 401) {
        localStorage.removeItem(SESSION_KEY);
        alert("Sessão expirada. Faça login novamente.");
        window.location.href = "/logon.php";
        throw new Error("Sessão expirada");
    }
    return resp;
}
