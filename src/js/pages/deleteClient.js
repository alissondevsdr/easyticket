import { loadingClients } from "./listClient.js";
import { showLoading, hideLoading } from "../services/loading.js";

export async function deletClient(id) {
  const token = localStorage.getItem("authToken")

  const dynamicModal = document.getElementById('modal')
  const modalContentContainer = document.getElementById('modalContentContainer')

  dynamicModal.classList.add("is-active")

  if (id === 0 || id === 1) {
    modalContentContainer.innerHTML = `
      <div class="modal-header">
        <div class="message">Ação não permitida</div>
        <button class="modal-close is-large" aria-label="close"></button>
      </div>
      <div class="buttons-modal">
        <button class="button is-primary no-delete">Ok</button>
      </div>`
  } else {
    modalContentContainer.innerHTML = `
      <div class="modal-header">
        <div class="message">Deseja excluir o cliente?</div>
        <button class="modal-close is-large" aria-label="close"></button>
      </div>
      <div class="buttons-modal">
        <button class="button is-danger-confirm" id="delete">
          <i class="fa-solid fa-trash" style="margin-right:6px"></i>
          Sim, excluir
        </button>
        <button class="button no-delete cancel">Cancelar</button>
      </div>`
  }

  const buttonDelete = document.getElementById('delete')
  if (!buttonDelete) return

  const handleDelete = async () => {
    try {
      showLoading(buttonDelete)
      await axios.delete(`http://localhost:3001/clients/${id}`, {
        headers: { Authorization: token }
      });
      loadingClients();
      dynamicModal.classList.remove("is-active");
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
