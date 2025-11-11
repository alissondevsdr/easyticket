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

    if (statusCode === 401 || statusCode === 403) {
      console.warn("Token inválido ou expirado. Status:", statusCode);
      window.location.href = '../../index.html';
    }

    console.error("Erro ao verificar o token (API Down ou outro erro):", error.message);
    window.location.href = '../../index.html';
  }
}
