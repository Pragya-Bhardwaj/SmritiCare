document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.reminder-card');

  cards.forEach(card => {
    const checkbox = card.querySelector('.reminder-toggle');
    if (!checkbox) return;

    // initialize visual state from checked or data-status
    if (checkbox.checked || card.dataset.status === 'done') {
      card.classList.add('done');
    } else {
      card.classList.remove('done');
    }

    checkbox.addEventListener('change', (e) => {
      if (checkbox.checked) {
        card.classList.add('done');
        card.dataset.status = 'done';
      } else {
        card.classList.remove('done');
        card.dataset.status = 'pending';
      }
    });
  });
});