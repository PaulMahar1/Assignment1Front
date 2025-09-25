const API_BASE = 'https://subtrackerapi.onrender.com/api';

// DOM Elements
const subscriptionsList = document.getElementById('subscriptions-list');
const addSubscriptionBtn = document.getElementById('add-subscription-btn');
const subscriptionModal = document.getElementById('subscription-modal');
const subscriptionForm = document.getElementById('subscription-form');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalTitle = document.getElementById('modal-title');
const managePaymentsBtn = document.getElementById('manage-payments-btn');
const manageCategoriesBtn = document.getElementById('manage-categories-btn');
const paymentModal = document.getElementById('payment-modal');
const paymentForm = document.getElementById('payment-form');
const closePaymentModalBtn = document.getElementById('close-payment-modal-btn');
const paymentAccountsList = document.getElementById('payment-accounts-list');
const categoryModal = document.getElementById('category-modal');
const categoryForm = document.getElementById('category-form');
const closeCategoryModalBtn = document.getElementById('close-category-modal-btn');
const categoriesListEl = document.getElementById('categories-list');
const subscriptionIconSelect = document.getElementById('subscription-icon');
const exportBtn = document.getElementById('export-btn');

let editingId = null;
let categories = [];
let paymentAccounts = [];
// Chart instances
let categoryChart = null;
let monthlyChart = null;

// Show subscription modal
addSubscriptionBtn.addEventListener('click', () => {
  modalTitle.textContent = 'Add Subscription';
  subscriptionForm.reset();
  editingId = null;
  // Load categories/payment accounts, then populate selects and show modal
  Promise.all([loadCategories(), loadPaymentAccounts()]).then(() => {
    populateSubscriptionSelects();
    subscriptionModal.classList.remove('hidden');
  });
});
closeModalBtn.addEventListener('click', () => {
  subscriptionModal.classList.add('hidden');
});

// Payments & categories modal handlers
managePaymentsBtn.addEventListener('click', () => {
  paymentForm.reset();
  loadPaymentAccounts();
  paymentModal.classList.remove('hidden');
});
closePaymentModalBtn.addEventListener('click', () => paymentModal.classList.add('hidden'));

manageCategoriesBtn.addEventListener('click', () => {
  categoryForm.reset();
  loadCategories();
  categoryModal.classList.remove('hidden');
});
closeCategoryModalBtn.addEventListener('click', () => categoryModal.classList.add('hidden'));

// Fetch and display subscriptions
async function loadSubscriptions() {
  subscriptionsList.innerHTML = '<p>Loading...</p>';
  const res = await fetch(`${API_BASE}/subscriptions`);
  const data = await res.json();
  subscriptionsList.innerHTML = '';
  data.subscriptions.forEach(sub => {
    const card = document.createElement('div');
    card.className = 'subscription-card';
    card.innerHTML = `
      <div class="sub-header">
        <div class="sub-icon">${renderIcon(sub)}</div>
        <strong>${sub.name}</strong>
      </div>
      <span>Cost: $${sub.cost}</span>
      <span>Billing: ${sub.billing_cycle} on day ${sub.billing_day}</span>
      <span>Status: ${sub.status}</span>
      <div class="actions">
        <button onclick="editSubscription('${sub.id}')">Edit</button>
        <button class="delete" onclick="deleteSubscription('${sub.id}')">Delete</button>
      </div>
    `;
    subscriptionsList.appendChild(card);
  });
}

window.editSubscription = function(id) {
  fetch(`${API_BASE}/subscriptions/${id}`)
    .then(res => res.json())
    .then(sub => {
      modalTitle.textContent = 'Edit Subscription';
      editingId = id;
      Promise.all([loadCategories(), loadPaymentAccounts()]).then(() => {
        populateSubscriptionSelects();
        subscriptionForm.name.value = sub.name;
        subscriptionForm.cost.value = sub.cost;
        subscriptionForm.billing_cycle.value = sub.billing_cycle;
        subscriptionForm.billing_day.value = sub.billing_day;
        const paySel = subscriptionForm.querySelector('select[name="payment_account_id"]');
        const catSel = subscriptionForm.querySelector('select[name="category_id"]');
        if (paySel) paySel.value = sub.payment_account_id || '';
        if (catSel) catSel.value = sub.category_id || '';
        subscriptionForm.icon.value = sub.icon || '';
        subscriptionForm.status.value = sub.status;
        subscriptionForm.trial_end_date.value = sub.trial_end_date || '';
        subscriptionForm.is_trial.checked = !!sub.is_trial;
        subscriptionModal.classList.remove('hidden');
      });
    });
};

window.deleteSubscription = function(id) {
  if (!confirm('Delete this subscription?')) return;
  fetch(`${API_BASE}/subscriptions/${id}`, { method: 'DELETE' })
    .then(() => loadSubscriptions());
};

subscriptionForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = new FormData(subscriptionForm);
  const payload = Object.fromEntries(formData.entries());
  payload.is_trial = subscriptionForm.is_trial.checked;
  console.log('Submitting subscription:', payload);
  const method = editingId ? 'PUT' : 'POST';
  const url = editingId ? `${API_BASE}/subscriptions/${editingId}` : `${API_BASE}/subscriptions`;
  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Subscription save failed:', data);
        alert('Failed to save subscription: ' + (data.message || res.status));
        return;
      }
      subscriptionModal.classList.add('hidden');
      loadSubscriptions();
      loadAnalytics();
    })
    .catch(err => {
      console.error('Subscription save error:', err);
      alert('Error saving subscription: ' + err);
    });
});

// Categories & Payments loading
async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    const data = await res.json();
    console.log('Categories API response:', data);
    if (Array.isArray(data)) {
      categories = data;
    } else if (Array.isArray(data.categories)) {
      categories = data.categories;
    } else {
      categories = [];
    }
    renderCategoriesList();
  } catch (e) {
    categories = [];
  }
}

async function loadPaymentAccounts() {
  try {
    const res = await fetch(`${API_BASE}/payment-accounts`);
    const data = await res.json();
    console.log('Payment Accounts API response:', data);
    if (Array.isArray(data)) {
      paymentAccounts = data;
    } else if (Array.isArray(data.payment_accounts)) {
      paymentAccounts = data.payment_accounts;
    } else {
      paymentAccounts = [];
    }
    renderPaymentAccountsList();
  } catch (e) {
    paymentAccounts = [];
  }
}

function populateSubscriptionSelects() {
  // Find selects
  const catSel = subscriptionForm.querySelector('select[name="category_id"]');
  const paySel = subscriptionForm.querySelector('select[name="payment_account_id"]');
  if (catSel) {
    catSel.innerHTML = '<option value="">Select category</option>';
    categories.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent = c.name;
      catSel.appendChild(o);
    });
  }
  if (paySel) {
    paySel.innerHTML = '<option value="">Select payment account</option>';
    paymentAccounts.forEach(p => {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = `${p.name} ${p.details ? `(${p.details})` : ''}`;
      paySel.appendChild(o);
    });
  }
}

function renderIcon(sub) {
  const icon = sub.icon || (sub.category && sub.category.icon) || '';
  if (!icon) return '<i class="fa-solid fa-circle" style="color:#ccc"></i>';
  return `<i class="${icon}" style="color:${(sub.category && sub.category.color) || '#4ECDC4'}"></i>`;
}

function renderCategoriesList() {
  if (!categoriesListEl) return;
  categoriesListEl.innerHTML = '';
  categories.forEach(c => {
    const div = document.createElement('div');
    div.className = 'category-item';
    div.style.setProperty('--cat-color', c.color || '#4ECDC4');
    div.innerHTML = `${c.icon ? `<i class="${c.icon}"></i>` : ''} <strong>${c.name}</strong> <button onclick="deleteCategory('${c.id}')">Delete</button>`;
    categoriesListEl.appendChild(div);
  });
}

function renderPaymentAccountsList() {
  if (!paymentAccountsList) return;
  paymentAccountsList.innerHTML = '';
  paymentAccounts.forEach(p => {
    const div = document.createElement('div');
    div.className = 'payment-item';
    div.innerHTML = `<strong>${p.name}</strong> <span>${p.details || p.type || ''}</span> <button onclick="deletePaymentAccount('${p.id}')">Delete</button>`;
    paymentAccountsList.appendChild(div);
  });
}

// Expose deletes for inline handlers
window.deleteCategory = function(id) {
  if (!confirm('Delete category?')) return;
  fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE' }).then(() => loadCategories()).then(() => populateSubscriptionSelects());
}
window.deletePaymentAccount = function(id) {
  if (!confirm('Delete payment account?')) return;
  fetch(`${API_BASE}/payment-accounts/${id}`, { method: 'DELETE' }).then(() => loadPaymentAccounts()).then(() => populateSubscriptionSelects());
}

paymentForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = new FormData(paymentForm);
  const payload = Object.fromEntries(formData.entries());
  fetch(`${API_BASE}/payment-accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(() => {
    loadPaymentAccounts().then(() => {
      populateSubscriptionSelects();
    });
    paymentForm.reset();
  });
});

categoryForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = new FormData(categoryForm);
  const payload = Object.fromEntries(formData.entries());
  fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(() => {
    loadCategories().then(() => {
      populateSubscriptionSelects();
    });
    categoryForm.reset();
  });
});

// Simple analytics: monthly / annual totals
async function loadAnalytics(mode = 'monthly') {
  try {
    const res = await fetch(`${API_BASE}/subscriptions`);
    const data = await res.json();
    const subs = data.subscriptions || [];
    let total = 0;
    subs.forEach(s => {
      const cost = parseFloat(s.cost) || 0;
      switch (s.billing_cycle) {
        case 'weekly':
          total += (mode === 'monthly') ? cost * 52 / 12 : cost * 52;
          break;
        case 'monthly':
          total += (mode === 'monthly') ? cost : cost * 12;
          break;
        case 'quarterly':
          total += (mode === 'monthly') ? cost / 3 : cost * 4;
          break;
        case 'semi_annual':
          total += (mode === 'monthly') ? cost / 6 : cost * 2;
          break;
        case 'annual':
          total += (mode === 'monthly') ? cost / 12 : cost;
          break;
        default:
          total += (mode === 'monthly') ? cost : cost * 12; // Default to monthly billing
      }
    });
    const displayTotal = total.toFixed(2);
    const analyticsContent = document.getElementById('analytics-content');
    analyticsContent.innerHTML = `
      <div class="analytics-mode">
        Mode: 
        <button onclick="loadAnalytics('monthly')" ${mode === 'monthly' ? 'disabled' : ''}>Monthly</button>
        <button onclick="loadAnalytics('annual')" ${mode === 'annual' ? 'disabled' : ''}>Annual</button>
      </div>
      <h3>Total ${mode} cost: $${displayTotal}</h3>
    `;

    // Build category breakdown dataset
    const byCategory = {};
    subs.forEach(s => {
      const cat = (s.category && s.category.name) || (categories.find(c => c.id === s.category_id) || {}).name || 'Uncategorized';
      const cost = convertToModeCost(s, mode);
      byCategory[cat] = (byCategory[cat] || 0) + cost;
    });
    const catLabels = Object.keys(byCategory);
    const catData = catLabels.map(l => byCategory[l].toFixed(2));

    // Build time-series data based on selected mode
    const monthlyBuckets = new Array(12).fill(0);
    // For simple visualization, aggregate costs in the first month
    subs.forEach(s => {
      const value = convertToModeCost(s, mode);
      // put into month 0 for now (aggregate over months)
      monthlyBuckets[0] += value;
    });

    // Initialize or update charts
    const catCtx = document.getElementById('category-chart').getContext('2d');
    if (!categoryChart) {
      categoryChart = new Chart(catCtx, {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [{ data: catData, backgroundColor: generateColors(catLabels.length) }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      });
    } else {
      categoryChart.data.labels = catLabels;
      categoryChart.data.datasets[0].data = catData;
      categoryChart.data.datasets[0].backgroundColor = generateColors(catLabels.length);
      categoryChart.update();
    }

    const monCtx = document.getElementById('monthly-chart').getContext('2d');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if (!monthlyChart) {
      monthlyChart = new Chart(monCtx, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [{ label: `${mode === 'annual' ? 'Annual' : 'Monthly'} cost`, data: monthlyBuckets.map(x => x.toFixed(2)), backgroundColor: '#4ECDC4' }]
        },
        options: { responsive: true }
      });
    } else {
      monthlyChart.data.datasets[0].data = monthlyBuckets.map(x => x.toFixed(2));
      monthlyChart.update();
    }
  } catch (e) {
    // ignore
  }
}

function convertToModeCost(s, mode) {
  const cost = parseFloat(s.cost) || 0;
  switch (s.billing_cycle) {
    case 'weekly':
      if (mode === 'monthly') return cost * 52 / 12; // 52 weeks/year, 12 months
      if (mode === 'annual') return cost * 52;
      return cost;
    case 'monthly':
      if (mode === 'monthly') return cost;
      if (mode === 'annual') return cost * 12;
      return cost;
    case 'quarterly':
      if (mode === 'monthly') return cost / 3; // 1 quarter = 3 months
      if (mode === 'annual') return cost * 4; // 4 quarters/year
      return cost;
    case 'semi_annual':
      if (mode === 'monthly') return cost / 6; // 1 semi-annual = 6 months
      if (mode === 'annual') return cost * 2; // 2 semi-annual/year
      return cost;
    case 'annual':
      if (mode === 'monthly') return cost / 12;
      if (mode === 'annual') return cost;
      return cost;
    default:
      return cost;
  }
}

function generateColors(n) {
  const palette = ['#4ECDC4','#FF6B6B','#556270','#C7F464','#FFA500','#9B59B6','#2ECC71','#3498DB','#E74C3C','#F39C12'];
  const out = [];
  for (let i=0;i<n;i++) out.push(palette[i % palette.length]);
  return out;

}

window.loadAnalytics = loadAnalytics;

exportBtn.addEventListener('click', async () => {
  try {
    const res = await fetch(`${API_BASE}/export`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.json';
    a.click();
  } catch (e) {
    alert('Export failed');
  }
});

// Initial load: get categories/payments then subscriptions and analytics
Promise.all([loadCategories(), loadPaymentAccounts()]).then(() => {
  loadSubscriptions();
  loadAnalytics();
});
