export async function auth(token) {
  if (!token) {
    console.error('Usuário não logado. O token de autenticação não foi encontrado.');
    window.location.href = '../../index.html';
    return;
  }

  try {
    const response = await axios.get("http://localhost:3001/clients", {
      headers: {
        Authorization: token
      }
    });
    return response.status === 200;

  } catch (error) {
    const statusCode = error.response?.status;

    // CORRIGIDO: só redireciona se o erro for de autenticação (401/403)
    // Erros de rede (sem error.response) não devem deslogar o usuário
    if (statusCode === 401 || statusCode === 403) {
      console.warn("Token inválido ou expirado. Status:", statusCode);
      alert("Sua sessão expirou. Faça login novamente.");
      window.location.href = '../../index.html';
      return;
    }

    // Erro de rede ou servidor fora do ar: apenas loga, não redireciona
    if (!error.response) {
      console.error("Erro de rede ao verificar token (servidor indisponível):", error.message);
      return false;
    }

    console.error("Erro inesperado ao verificar token:", error.message);
  }
}
