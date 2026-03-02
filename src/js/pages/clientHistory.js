// clientHistory.js — modal de histórico de vendas do cliente

const payMap = {
  cash:   { label: "Dinheiro", icon: "fa-money-bill-1", cls: "cash"   },
  pix:    { label: "PIX",      icon: "fa-qrcode",       cls: "pix"    },
  credit: { label: "Crédito",  icon: "fa-credit-card",  cls: "credit" },
  debit:  { label: "Débito",   icon: "fa-credit-card",  cls: "debit"  },
}

function fmtCurrency(val) {
  return "R$ " + Number(val || 0)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function fmtDate(raw) {
  if (!raw) return "—"
  const d = new Date(raw)
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export async function showClientHistory(clientId, clientName) {
  const token                     = localStorage.getItem("authToken")
  const dynamicModal              = document.getElementById("modal")
  const modalContentContainer     = document.getElementById("modalContentContainer")

  // Abre modal com loading imediato
  dynamicModal.classList.add("is-active")
  modalContentContainer.innerHTML = `
    <div class="modal-header">
      <div class="message">
        <i class="fa-solid fa-clock-rotate-left" style="font-size:.9rem;color:#a5ff01"></i>
        Histórico — ${clientName}
      </div>
      <button class="modal-close is-large" aria-label="close"></button>
    </div>
    <div class="history-loading">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span>Carregando histórico...</span>
    </div>`

  try {
    const { data: allSales } = await axios.get("http://localhost:3001/sales", {
      headers: { Authorization: token }
    })

    // Filtra as vendas do cliente
    const sales        = allSales.filter(s => Number(s.clientId) === Number(clientId))
    const totalVendas  = sales.length
    const totalValor   = sales.reduce((acc, s) => acc + Number(s.value || 0), 0)
    const ticketMedio  = totalVendas > 0 ? totalValor / totalVendas : 0

    const rows = totalVendas === 0
      ? `<tr>
           <td colspan="4">
             <div class="history-empty">
               <i class="fa-solid fa-receipt"></i>
               <p>Nenhuma venda registrada para este cliente</p>
             </div>
           </td>
         </tr>`
      : sales.map((s, i) => {
          const pm = payMap[s.paymentMethod] || { label: s.paymentMethod, icon: "fa-circle", cls: "" }
          return `
            <tr>
              <td class="history-td-num">#${String(i + 1).padStart(2, "0")}</td>
              <td>${fmtDate(s.createdAt)}</td>
              <td>
                <span class="pay-badge ${pm.cls}">
                  <i class="fa-solid ${pm.icon}"></i>${pm.label}
                </span>
              </td>
              <td class="history-td-value">${fmtCurrency(s.value)}</td>
            </tr>`
        }).join("")

    modalContentContainer.innerHTML = `
      <div class="modal-header">
        <div class="message">
          <i class="fa-solid fa-clock-rotate-left" style="font-size:.9rem;color:#a5ff01;margin-right:2px"></i>
          Histórico — ${clientName}
        </div>
        <button class="modal-close is-large" aria-label="close"></button>
      </div>

      <!-- KPIs -->
      <div class="history-kpis">
        <div class="history-kpi">
          <div class="history-kpi-icon"><i class="fa-solid fa-bolt"></i></div>
          <div class="history-kpi-info">
            <span class="history-kpi-label">Total de vendas</span>
            <span class="history-kpi-value">${totalVendas}</span>
          </div>
        </div>
        <div class="history-kpi">
          <div class="history-kpi-icon"><i class="fa-solid fa-dollar-sign"></i></div>
          <div class="history-kpi-info">
            <span class="history-kpi-label">Total em valor</span>
            <span class="history-kpi-value accent">${fmtCurrency(totalValor)}</span>
          </div>
        </div>
        <div class="history-kpi">
          <div class="history-kpi-icon"><i class="fa-solid fa-arrow-trend-up"></i></div>
          <div class="history-kpi-info">
            <span class="history-kpi-label">Ticket médio</span>
            <span class="history-kpi-value">${fmtCurrency(ticketMedio)}</span>
          </div>
        </div>
      </div>

      <!-- Tabela -->
      <div class="history-table-wrap">
        <table class="history-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Data</th>
              <th>Pagamento</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <!-- Rodapé -->
      <div class="history-footer">
        <button class="button cancel">Fechar</button>
      </div>`

  } catch (err) {
    console.error("Erro ao carregar histórico:", err)
    modalContentContainer.innerHTML = `
      <div class="modal-header">
        <div class="message">Histórico — ${clientName}</div>
        <button class="modal-close is-large" aria-label="close"></button>
      </div>
      <div class="history-loading">
        <i class="fa-solid fa-circle-exclamation" style="color:#e03131"></i>
        <span>Erro ao carregar histórico</span>
      </div>
      <div class="history-footer">
        <button class="button cancel">Fechar</button>
      </div>`
  }
}
