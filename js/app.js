// ======================
// Budget Calculator
// ======================
let budgetChart;
document.getElementById('add-expense').addEventListener('click', () => {
  const container = document.getElementById('expenses-container');
  const div = document.createElement('div');
  div.classList.add('expense-item');
  div.innerHTML = `
    <input type="text" class="expense-name" placeholder="Expense name">
    <input type="number" class="expense-amount" placeholder="Amount">
  `;
  container.appendChild(div);
});

document.getElementById('budget-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const income = parseFloat(document.getElementById('income').value) || 0;
  const expenseNames = document.querySelectorAll('.expense-name');
  const expenseAmounts = document.querySelectorAll('.expense-amount');

  const labels = [];
  const data = [];
  let totalExpenses = 0;

  expenseNames.forEach((nameInput, i) => {
    const label = nameInput.value || `Expense ${i + 1}`;
    const amount = parseFloat(expenseAmounts[i].value) || 0;
    labels.push(label);
    data.push(amount);
    totalExpenses += amount;
  });

  if (budgetChart) budgetChart.destroy();
  const ctx = document.getElementById('budget-chart');
  budgetChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4caf50', '#9966ff'],
        },
      ],
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
  });
});

// ======================
// Savings Tracker
// ======================
document.getElementById('savings-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const goal = parseFloat(document.getElementById('goal-amount').value) || 0;
  const monthly = parseFloat(document.getElementById('monthly-saving').value) || 0;

  const months = monthly > 0 ? Math.ceil(goal / monthly) : 0;
  document.getElementById('timeline').textContent = `Estimated: ${months} months`;

  const fill = document.getElementById('progress-fill');
  const percent = Math.min((monthly / goal) * 100, 100);
  fill.style.width = percent + '%';

  let message = '';
  if (percent < 25) message = 'A small step, but keep going!';
  else if (percent < 75) message = 'Great progress! Stay consistent.';
  else message = 'Almost there — don’t give up!';
  document.getElementById('motivation-message').textContent = message;
});

// ======================
// Templates Modal
// ======================
const modal = document.getElementById('templates-modal');
document.getElementById('open-templates').addEventListener('click', () => {
  modal.style.display = 'block';
  modal.setAttribute('aria-hidden', 'false');
});
document.getElementById('close-templates').addEventListener('click', () => {
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
});
window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
});
// --- IMPACT PAGE CHARTS ---
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.impact-page')) {
    // Households chart
    const householdsCtx = document.getElementById('householdsChart');
    new Chart(householdsCtx, {
      type: 'line',
      data: {
        labels: ['2019', '2020', '2021', '2022', '2023', '2024', '2025'],
        datasets: [
          {
            label: 'Households Above Poverty Line',
            data: [120, 300, 750, 1500, 2800, 4000, 5200],
            borderColor: '#e67e22',
            backgroundColor: 'rgba(230,126,34,0.2)',
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
      },
    });

    // Savings chart
    const savingsCtx = document.getElementById('savingsChart');
    new Chart(savingsCtx, {
      type: 'bar',
      data: {
        labels: ['2019', '2020', '2021', '2022', '2023', '2024', '2025'],
        datasets: [
          {
            label: 'Average Monthly Savings ($)',
            data: [10, 15, 25, 40, 55, 70, 90],
            backgroundColor: '#27ae60',
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }
});
