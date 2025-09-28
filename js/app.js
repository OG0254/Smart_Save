/* js/app.js
  Central app script for SmartSave prototype.
  - Defensive: checks for elements before running features.
  - Uses data/data.json as a source for tips, testimonials, and impact data.
  - Chart.js required for charts (fallback text shown if missing).
*/

// -------------------- Utilities --------------------
function qs(sel) {
  return document.querySelector(sel);
}
function qsa(sel) {
  return Array.from(document.querySelectorAll(sel));
}
function trackEvent(category, action, label) {
  console.log('trackEvent', { category, action, label });
  // integration stub: replace with GA/Matomo event calls
}

// -------------------- Menu & Modal helpers --------------------
function toggleMenu() {
  const nav = qs('.nav-links');
  if (!nav) return;
  nav.style.display = nav.style.display === 'flex' ? '' : 'flex';
}
function showEmailModal() {
  const m = qs('#email-modal');
  if (!m) return;
  m.style.display = 'flex';
  m.setAttribute('aria-hidden', 'false');
}
function closeEmailModal() {
  const m = qs('#email-modal');
  if (!m) return;
  m.style.display = 'none';
  m.setAttribute('aria-hidden', 'true');
}

// safe fetch helper
async function loadJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch failed');
    return await res.json();
  } catch (err) {
    console.warn('Could not load JSON', err);
    return null;
  }
}

/* DOMContentLoaded main */
document.addEventListener('DOMContentLoaded', async () => {
  const data = (await loadJSON('data/data.json')) || {};

  // Wire CTAs on index
  const ctaFeatures = qs('#cta-features');
  if (ctaFeatures) ctaFeatures.addEventListener('click', () => (location.href = 'features.html'));
  const ctaImpact = qs('#cta-impact');
  if (ctaImpact) ctaImpact.addEventListener('click', () => (location.href = 'impact.html'));
  const ctaJoin = qs('#cta-join');
  if (ctaJoin) ctaJoin.addEventListener('click', () => (location.href = 'contact.html'));

  /*showEmailModal);*/

  // Lead form
  const leadForm = qs('#lead-form');
  if (leadForm) {
    leadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = qs('#lead-email').value;
      localStorage.setItem('smartsave_lead', JSON.stringify({ email, ts: Date.now() }));
      qs('#lead-msg').textContent = 'Thanks — demo mode: we saved your email locally.';
      trackEvent('lead', 'submit', email);
      leadForm.reset();
      setTimeout(closeEmailModal, 1000);
    });
  }

  // Populate hero/snapshot numbers on index if present
  if (qs('#hero-metric') || qs('#snap-families')) {
    const families = data.hero && data.hero.familiesReached ? data.hero.familiesReached : 120;
    const avg = data.hero && data.hero.avgSavings ? data.hero.avgSavings : 1250;
    qs('#hero-metric') && (qs('#hero-metric').textContent = families ? Math.round(avg / 10) : 100);
    qs('#snap-families') && (qs('#snap-families').textContent = families);
    qs('#snap-savings') && (qs('#snap-savings').textContent = avg);
    qs('#snap-families-2') && (qs('#snap-families-2').textContent = families);
    qs('#snap-savings-2') && (qs('#snap-savings-2').textContent = `Ksh ${avg}`);
    qs('#snap-retention') &&
      (qs('#snap-retention').textContent =
        data.impact && data.impact.retention ? data.impact.retention + '%' : 'N/A');

    // mini home chart - compact, maintainAspectRatio:false so it fills container
    if (typeof Chart !== 'undefined' && qs('#miniHomeChart')) {
      const ctx = qs('#miniHomeChart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: (data.impact && data.impact.months) || ['Jan', 'Feb', 'Mar'],
          datasets: [
            {
              label: 'Avg savings',
              data: (data.impact && data.impact.savings) || [400, 700, 1250],
              backgroundColor: ['#0b5ed7', '#ff9800', '#4caf50'],
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } },
        },
      });
    }
  }

  // Testimonials (index or features)
  if (qs('#testimonials') && data.testimonials) {
    const root = qs('#testimonials');
    root.innerHTML = '';
    data.testimonials.forEach((t) => {
      const card = document.createElement('div');
      card.className = 'card testimonial';
      card.innerHTML = `<p>"${t.text}"</p><p class="small-muted">— ${t.name}</p>`;
      root.appendChild(card);
    });
  }

  // ----------------- Features Page -----------------
  if (qs('#budget-form')) {
    // Load saved budget scenarios if any
    const saved = JSON.parse(localStorage.getItem('smartsave_budget_v1') || 'null');
    if (saved) {
      qs('#income').value = saved.income || '';
      // clear existing expense items then add saved
      const container = qs('#expenses-container');
      container.innerHTML = '';
      (saved.expenses || []).forEach((exp) => {
        const div = document.createElement('div');
        div.className = 'expense-item';
        div.innerHTML = `<input type="text" name="expense-name" class="expense-name" value="${exp.name}">
                         <input type="number" name="expense-value" class="expense-value" value="${exp.value}">
                         <button type="button" class="remove-expense">✕</button>`;
        container.appendChild(div);
      });
    }

    // Add expense row handler
    qs('#add-expense').addEventListener('click', () => {
      const container = qs('#expenses-container');
      const div = document.createElement('div');
      div.className = 'expense-item';
      div.innerHTML = `<input type="text" name="expense-name" class="expense-name" placeholder="Expense name">
                       <input type="number" name="expense-value" class="expense-value" placeholder="Amount">
                       <button type="button" class="remove-expense">✕</button>`;
      container.appendChild(div);
    });

    // delegate remove-expense
    qs('#expenses-container').addEventListener('click', (e) => {
      if (e.target && e.target.classList.contains('remove-expense')) {
        e.target.parentElement.remove();
      }
    });

    // Budget form submit -> chart + save
    qs('#budget-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const income = parseFloat(qs('#income').value) || 0;
      const names = qsa('.expense-name').map((n) => n.value || 'Unnamed');
      const values = qsa('.expense-value').map((v) => parseFloat(v.value) || 0);
      const expenses = names.map((n, i) => ({ name: n, value: values[i] }));
      const totalExpenses = values.reduce((a, b) => a + b, 0);
      const balance = income - totalExpenses;

      qs('#display-income').textContent = income.toLocaleString();
      qs('#display-expenses').textContent = totalExpenses.toLocaleString();
      qs('#display-balance').textContent = balance.toLocaleString();

      // save
      localStorage.setItem(
        'smartsave_budget_v1',
        JSON.stringify({ income, expenses, ts: Date.now() })
      );
      trackEvent('budget', 'generate', JSON.stringify({ income }));

      // draw chart
      if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded');
        return;
      }

      // Build meaningful labels: fallback "Expense 1" etc. and ensure legend shows amounts
      const sanitizedLabels = names.map((n, i) => (n && n.trim() ? n.trim() : `Expense ${i + 1}`));
      const ctx = qs('#budgetChart').getContext('2d');

      if (window._budgetChart) window._budgetChart.destroy();

      window._budgetChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: sanitizedLabels,
          datasets: [
            {
              data: values,
              backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4caf50', '#9966ff', '#00bfa5'],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false, // fill the .chart-wrap container
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                generateLabels: function (chart) {
                  const data = chart.data;
                  if (!data || !data.datasets || !data.datasets.length) return [];
                  const dataset = data.datasets[0];
                  return data.labels.map((label, i) => {
                    const val = dataset.data[i] || 0;
                    return {
                      text: `${label} — Ksh ${Number(val).toLocaleString()}`,
                      fillStyle: dataset.backgroundColor[i],
                      strokeStyle: dataset.backgroundColor[i],
                      hidden: false,
                      index: i,
                    };
                  });
                },
              },
            },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  const val = ctx.parsed || 0;
                  return `Ksh ${Number(val).toLocaleString()}`;
                },
              },
            },
          },
          layout: { padding: 6 },
        },
      });
    });
  }

  // Savings tracker
  if (qs('#savings-form')) {
    // load
    const sv = JSON.parse(localStorage.getItem('smartsave_goal_v1') || 'null');
    if (sv) {
      qs('#goal').value = sv.goal;
      qs('#monthly').value = sv.monthly;
      updateSavingsUI(sv.goal, sv.monthly);
    }
    qs('#savings-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const goal = parseFloat(qs('#goal').value) || 0;
      const monthly = parseFloat(qs('#monthly').value) || 0;
      localStorage.setItem('smartsave_goal_v1', JSON.stringify({ goal, monthly, ts: Date.now() }));
      updateSavingsUI(goal, monthly);
      trackEvent('savings', 'track', `${goal}-${monthly}`);
    });
  }

  function updateSavingsUI(goal, monthly) {
    let savedSoFar = monthly * 1; // placeholder: assume first month saved
    let percentage = Math.min((savedSoFar / goal) * 100, 100);
    let monthsNeeded = monthly > 0 ? Math.ceil(goal / monthly) : 0;

    // Update UI
    qs('#saved-amount') && (qs('#saved-amount').textContent = savedSoFar.toLocaleString());
    qs('#goal-display') && (qs('#goal-display').textContent = goal.toLocaleString());
    qs('#timeline') && (qs('#timeline').textContent = monthsNeeded + ' months');

    qs('#progress-fill') && (qs('#progress-fill').style.width = percentage + '%');

    // Motivational messages
    const motivationMessage = qs('#motivation-message');
    if (!motivationMessage) return;
    if (percentage === 0) {
      motivationMessage.textContent = 'Start your journey today!';
    } else if (percentage < 25) {
      motivationMessage.textContent = 'Just starting out – stay consistent!';
    } else if (percentage < 50) {
      motivationMessage.textContent = 'Great progress! Keep pushing.';
    } else if (percentage < 75) {
      motivationMessage.textContent = 'You’re over halfway – don’t stop now!';
    } else if (percentage < 100) {
      motivationMessage.textContent = 'Almost there, stay focused!';
    } else {
      motivationMessage.textContent = 'Congratulations! Goal achieved 🎉';
    }
  }

  // Templates modal: populate cards from data.templates or fallback
  if (qs('#view-templates')) {
    const modal = qs('#templates-modal');
    const grid = qs('#templates-grid');
    qs('#view-templates').addEventListener('click', () => {
      grid.innerHTML = ''; // clear then populate
      const templates =
        data.templates && data.templates.length
          ? data.templates
          : [
              {
                id: 'pdf',
                title: 'Budget Planner (PDF)',
                desc: 'Printable budget planner',
                thumb: 'assets/images/pdf-thumb.png',
                file: 'templates/budget-template.pdf',
              },
              {
                id: 'xlsx',
                title: 'Smart Budget (Excel)',
                desc: 'Interactive Excel sheet',
                thumb: 'assets/images/excel-thumb.png',
                file: 'templates/budget-template.xlsx',
              },
            ];
      templates.forEach((t) => {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.innerHTML = `<img src="${t.thumb}" alt="${t.title}"><h4>${t.title}</h4><p class="small-muted">${t.desc}</p>`;
        const link = document.createElement('a');
        link.className = 'btn';
        link.href = t.file || '#';
        link.textContent = 'Download';
        // If file not present, use blob fallback
        link.addEventListener('click', (ev) => {
          ev.preventDefault();
          // try to fetch real file, else create blob
          fetch(t.file)
            .then((res) => {
              if (res.ok) return res.blob();
              throw new Error('No file');
            })
            .then((blob) => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = t.file.split('/').pop();
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
              trackEvent('template', 'download', t.title);
            })
            .catch(() => {
              // blob fallback
              const content = `Placeholder for ${t.title}\nReplace with real template in /templates/`;
              const blob = new Blob([content], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = t.file ? t.file.split('/').pop() : `${t.id}.txt`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
              trackEvent('template', 'download-fallback', t.title);
            });
        });
        card.appendChild(link);
        grid.appendChild(card);
      });
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
    });
    qs('#close-templates').addEventListener('click', () => {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    });
    // click outside to close
    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
      }
    });
  }

  // Accordion tips from data
  if (qs('#accordion') && data.features) {
    const acc = qs('#accordion');
    acc.innerHTML = '';
    data.features.forEach((f) => {
      const item = document.createElement('div');
      item.className = 'accordion-item';
      const head = document.createElement('div');
      head.className = 'accordion-header';
      head.innerHTML = `<strong>${f.title}</strong><button class="acc-toggle">+</button>`;
      const body = document.createElement('div');
      body.className = 'accordion-body';
      body.innerHTML = `<p class="small-muted">${f.desc || ''}</p><ul>${(f.tips || [])
        .map((t) => `<li>${t}</li>`)
        .join('')}</ul>`;
      head.addEventListener('click', () => {
        const open = body.style.display === 'block';
        // close others
        qsa('.accordion .accordion-body').forEach((b) => (b.style.display = 'none'));
        qsa('.accordion .acc-toggle').forEach((btn) => (btn.textContent = '+'));
        if (!open) {
          body.style.display = 'block';
          head.querySelector('.acc-toggle').textContent = '−';
        } else {
          body.style.display = 'none';
          head.querySelector('.acc-toggle').textContent = '+';
        }
      });
      head.appendChild(document.createElement('div'));
      head.querySelector('div').remove(); // just ensure structure
      head.querySelector('button') &&
        head.querySelector('button').setAttribute('aria-label', 'Toggle details');
      item.appendChild(head);
      item.appendChild(body);
      acc.appendChild(item);
    });
  }

  // Impact charts & stories
  if (qs('#savingsChart') && data.impact) {
    // savings chart
    if (typeof Chart !== 'undefined') {
      const sctx = qs('#savingsChart');
      if (sctx) {
        try {
          const ctx = sctx.getContext('2d');
          new Chart(ctx, {
            type: 'bar',
            data: {
              labels: data.impact.months || [],
              datasets: [
                {
                  label: 'Average Monthly Savings ($)',
                  data: data.impact.savings || [],
                  backgroundColor: '#27ae60',
                  borderRadius: 8,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } },
            },
          });
        } catch (e) {
          console.warn('savingsChart render error', e);
        }
      }
      const bctxEl = qs('#breakdownChart');
      if (bctxEl) {
        try {
          const ctx2 = bctxEl.getContext('2d');
          new Chart(ctx2, {
            type: 'pie',
            data: {
              labels: data.impact.breakdownLabels || ['Savings', 'Needs', 'Wants'],
              datasets: [
                {
                  label: 'Breakdown',
                  data: data.impact.breakdown || [],
                  backgroundColor: ['#0b5ed7', '#ff9800', '#4caf50'],
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } },
            },
          });
        } catch (e) {
          console.warn('breakdownChart render error', e);
        }
      }
    } else {
      console.warn('Chart.js not loaded for impact charts');
    }

    // stories
    if (data.testimonials && qs('#impact-stories')) {
      const root = qs('#impact-stories');
      root.innerHTML = '';
      data.testimonials.forEach((t) => {
        const card = document.createElement('article');
        card.className = 'card story';
        card.innerHTML = `<blockquote>"${t.text}"</blockquote><p class="small-muted">— ${t.name}</p>`;
        root.appendChild(card);
      });
    }
    // CSV download
    if (qs('#download-impact')) {
      qs('#download-impact').addEventListener('click', () => {
        const csv = buildImpactCSV(data);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'impact-data.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        trackEvent('impact', 'download', 'csv');
      });
    }
  }

  // Contact form handler
  if (qs('#contact-form')) {
    qs('#contact-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = qs('#contact-name').value,
        email = qs('#contact-email').value,
        msg = qs('#contact-message').value;
      qs('#contact-msg').textContent = 'Thanks — demo mode: message saved locally.';
      localStorage.setItem(
        'smartsave_contact',
        JSON.stringify({ name, email, msg, ts: Date.now() })
      );
      trackEvent('contact', 'submit', email);
      qs('#contact-form').reset();
    });
  }
}); // end DOMContentLoaded

// Helper to build CSV from impact data
function buildImpactCSV(data) {
  const months = (data.impact && data.impact.months) || [];
  const savings = (data.impact && data.impact.savings) || [];
  let csv = 'Month,AvgSavings\n';
  months.forEach((m, i) => {
    csv += `${m},${savings[i] || ''}\n`;
  });
  return csv;
}

// downloadTemplates (index CTA) fallback to open features modal or trigger downloads
function downloadTemplates() {
  // try to fetch templates folder links; if not present, generate placeholders
  const files = [
    { name: 'budget-template.pdf', text: 'PDF placeholder - replace with real file' },
    { name: 'budget-template.xlsx', text: 'XLSX placeholder - replace with real file' },
  ];
  files.forEach((f) => {
    const blob = new Blob([f.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
  trackEvent('template', 'download-batch', 'index-cta');
}
