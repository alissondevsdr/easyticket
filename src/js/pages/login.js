import { showLoading, hideLoading } from "../services/loading.js";

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");

loginForm.addEventListener('submit', function (event) {
  event.preventDefault()
  showLoading(loginButton)

  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  handleLogin(email, password)
})

async function handleLogin(email, password) {
  const URL_LOGIN = 'http://localhost:3001/login';
  const infosLogin = { email, password };

  try {
    const response = await axios.post(URL_LOGIN, infosLogin)
    const token = response.data.token

    localStorage.setItem('authToken', token)
    console.log("Token armazenado:", token)

    // Detecta se está rodando no Electron ou no browser
    const isElectron = typeof window.electronAPI !== 'undefined';

    if (isElectron) {
      // No Electron: caminho absoluto a partir da raiz do projeto
      window.location.href = './src/pages/dashboard.html';
    } else {
      // No browser normal
      window.location.href = '../src/pages/dashboard.html';
    }

    hideLoading(loginButton)

  } catch (error) {
    hideLoading(loginButton)

    let mensagem = 'Erro'

    if (error.response) {
      const status = error.response.status
      if (status === 401) mensagem = 'Senha incorreta'
      else if (status === 404) mensagem = 'Usuário não encontrado'
      else mensagem = 'Erro no servidor'
      console.error('Erro de autenticação:', error.response.data)
    } else if (error.request) {
      mensagem = 'Sem conexão'
      console.error('Erro de Rede:', error.request);
    } else {
      console.error('Erro geral:', error.message);
    }

    loginButton.innerHTML = mensagem
    loginButton.classList.add('is-danger')

    setTimeout(() => {
      loginButton.innerHTML = 'Entrar'
      loginButton.classList.remove('is-danger')
    }, 3000);
  }
}