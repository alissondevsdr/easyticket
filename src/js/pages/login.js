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
    console.log("Token armazenado com Axios:", token)

    window.location.href = '../src/pages/dashboard.html'

    hideLoading(loginButton)

  } catch (error) {

    hideLoading(loginButton)

    loginButton.innerHTML = 'Erro'
    loginButton.classList.add('is-danger')

    setTimeout(() => {
      loginButton.innerHTML = 'Login'
      loginButton.classList.remove('is-danger')
    }, 3000);

    if (error.response) {
      console.error('Erro de autentição:', error.response.data)

    } else if (error.request) {
      console.error('Erro de Rede:', error.request);

    } else {
      console.error('Erro geral:', error.message);
    }
  }

}
