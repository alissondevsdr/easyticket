document.addEventListener('DOMContentLoaded', () => {

  function openModal($el) {
    $el.classList.add('is-active');
  }

  function closeModal($el) {
    $el.classList.remove('is-active');
  }

  function closeAllModals() {
    (document.querySelectorAll('.modal') || []).forEach(($modal) => {
      closeModal($modal);
    });
  }


  (document.querySelectorAll('.js-modal-trigger') || []).forEach(($trigger) => {
    const modal = $trigger.dataset.target;
    const $target = document.getElementById(modal);

    $trigger.addEventListener('click', () => {
      openModal($target);
    });
  });

  document.addEventListener('click', (event) => {

    const closeSelectors = [
      '.modal-background',
      '.modal-close',
      '.cancel',
      '.no-delete',
      '.modal-card-head .delete',
      '.modal-card-foot .button',
    ];

    const clickedElement = event.target;
    let $closeElement = null;

    for (const selector of closeSelectors) {
      if (clickedElement.matches(selector)) {
        $closeElement = clickedElement;
        break;
      }
      const parentMatch = clickedElement.closest(selector);
      if (parentMatch) {
        $closeElement = parentMatch;
        break;
      }
    }

    if ($closeElement) {

      const $target = $closeElement.closest('.modal');
      if ($target) {
        closeModal($target);
      }

      event.preventDefault();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === "Escape") {
      closeAllModals();
    }
  });
});