export function logout() {
  localStorage.removeItem('authToken');
  console.log("Logout manual realizado. Token removido.");
  window.location.href = '../../index.html';
}