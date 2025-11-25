let isLoading = false

export function showLoading(button) {
  isLoading = true
  loading(button)
}

export function hideLoading(button) {
  isLoading = false;
  loading(button);
}

function loading(button) {
  if (isLoading) {
    button.classList.add("is-loading")

  } else {
    button.classList.remove("is-loading")
  }
}



