import { loadingClients } from "./listClient.js";
import { showLoading, hideLoading } from "../services/loading.js";

export async function deletClient(id) {
  const token = localStorage.getItem("authToken")

  const dynamicModal = document.getElementById('modal')
  const modalContentContainer = document.getElementById('modalContentContainer')

  dynamicModal.classList.add("is-active")

  modalContentContainer.innerHTML = `
      <button class="modal-close is-large" aria-label="close"></button>
      <div class="message">
        <div>Deseja excluir o cliente?</div>
      </div>
      <div class="buttons-modal">
        <button class="button is-primary" id="delete">Sim</button>
        <button class="button is-danger no-delete">Não</button>
      </div>`

  const buttonDelete = document.getElementById('delete')

  const handleDelete = async () => {
    try {
      showLoading(buttonDelete)
      await axios.delete(`http://localhost:3001/clients/${id}`, {
        headers: { Authorization: token }
      });

      loadingClients();

      modal.classList.remove("is-active");
    } catch (error) {
      console.error("Erro ao deletar cliente:", error.response?.data || error);
      alert("Erro ao deletar cliente. Veja o console.");
    } finally {
      hideLoading(buttonDelete)
      buttonDelete.removeEventListener("click", handleDelete);
    }
  };

  buttonDelete.addEventListener("click", handleDelete);

}