import { showLoading, hideLoading } from "../services/loading.js";

const loginForm = document.getElementById("loginForm");
const errorMessage = document.getElementById("errorMessage");
const notification = document.getElementById("notification")
const loginButton = document.getElementById("loginButton")

loginForm.addEventListener('submit', function (event) {

  event.preventDefault()

  showLoading(loginButton)

  errorMessage.textContent = ''

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
    console.log("Token armazenado com Axios:", token)

    window.location.href = '../src/pages/dashboard.html'

    hideLoading(loginButton)

  } catch (error) {

    hideLoading(loginButton)

    if (error.response) {

      notification.classList.remove('invisible')

      const errorMsg = error.response.data.message || 'Credencias inválidas'
      errorMessage.textContent = errorMsg
      console.error('Erro de autentição:', error.response.data)

    } else if (error.request) {
      notification.classList.remove('invisible')

      const errorMsg = 'Servidor indisponível.'
      errorMessage.textContent = errorMsg
      console.error('Erro de Rede:', error.request);

    } else {
      notification.classList.remove('invisible')
      errorMessage.textContent = 'Ocorreu um erro inesperado.';
      console.error('Erro geral:', error.message);
    }

    setTimeout(() => {
      notification.classList.add('invisible')
    }, 3000)
  }

}
