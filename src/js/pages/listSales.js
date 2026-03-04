import { activateModal } from "./menus.js"

// ─── Mapa de métodos de pagamento ─────────────────────────────────────────────
const payMap = {
  cash:   { label: "Dinheiro", icon: "fa-money-bill-1", cls: "cash"   },
  pix:    { label: "PIX",      icon: "fa-qrcode",       cls: "pix"    },
  credit: { label: "Crédito",  icon: "fa-credit-card",  cls: "credit" },
  debit:  { label: "Débito",   icon: "fa-credit-card",  cls: "debit"  },
}

let allSales = []

// ─── Carregar vendas da API ───────────────────────────────────────────────────
async function loadSalesList() {
  const token = localStorage.getItem("authToken")
  const tbody = document.getElementById("salesList")
  if (!tbody) return

  tbody.innerHTML = `
    <tr>
      <td colspan="5">
        <div class="report-empty">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <p>Carregando...</p>
        </div>
      </td>
    </tr>`

  try {
    const { data } = await axios.get("http://localhost:3001/sales", {
      headers: { Authorization: token },
    })
    allSales = data
    renderSalesTable(allSales)
  } catch (e) {
    console.error("Erro ao carregar vendas:", e)
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="report-empty">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <p>Erro ao carregar vendas</p>
          </div>
        </td>
      </tr>`
  }
}

// ─── Renderizar tabela ────────────────────────────────────────────────────────
function renderSalesTable(sales) {
  const tbody = document.getElementById("salesList")
  if (!tbody) return

  if (!sales || sales.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="report-empty">
            <i class="fa-solid fa-receipt"></i>
            <p>Nenhuma venda encontrada</p>
          </div>
        </td>
      </tr>`
    return
  }

  tbody.innerHTML = sales.map((s, i) => {
    const pm   = payMap[s.paymentMethod] || { label: s.paymentMethod, icon: "fa-circle", cls: "" }
    const name = s.client?.client || "—"
    const date = s.createdAt
      ? new Date(s.createdAt).toLocaleDateString("pt-BR", {
          day: "2-digit", month: "2-digit", year: "2-digit",
          hour: "2-digit", minute: "2-digit"
        })
      : "—"
    const value = Number(s.value).toFixed(2)
      .replace(".", ",")
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")

    return `
      <tr>
        <td>#${String(i + 1).padStart(2, "0")}</td>
        <td>${name}</td>
        <td>
          <span class="pay-badge ${pm.cls}">
            <i class="fa-solid ${pm.icon}"></i>${pm.label}
          </span>
        </td>
        <td style="color:#a5ff01;font-weight:700">R$ ${value}</td>
        <td style="color:#5a6380;font-size:0.8rem">${date}</td>
      </tr>`
  }).join("")
}

// ─── Busca em tempo real ──────────────────────────────────────────────────────
document.getElementById("searchSale")?.addEventListener("input", function () {
  const q = this.value.trim().toLowerCase()
  if (!q) { renderSalesTable(allSales); return }

  const filtered = allSales.filter(s => {
    const name = (s.client?.client || "").toLowerCase()
    const pm   = (payMap[s.paymentMethod]?.label || s.paymentMethod || "").toLowerCase()
    return name.includes(q) || pm.includes(q)
  })
  renderSalesTable(filtered)
})

// ─── Botão "Voltar ao PDV" ────────────────────────────────────────────────────
document.getElementById("backToPdv")?.addEventListener("click", () => {
  activateModal("Ingressos")
})

// ─── Init ao abrir o modal ────────────────────────────────────────────────────
document.addEventListener("salesListModalOpened", () => {
  loadSalesList()
})
