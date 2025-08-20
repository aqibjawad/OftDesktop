// Expense Screen Plain JS Implementation
const API_BASE_URL = 'https://oftbrothers.com/backend/api';

document.addEventListener('DOMContentLoaded', function () {
    renderLayout();
    fetchCategories();
    fetchBanks();
    fetchExpenses();
    setupWindowControls();
});

function renderLayout() {
    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="expense-container">
            <h2>Expenses</h2>
            <div id="expense-error" class="error-text" style="display:none;"></div>
            <form id="expense-form" class="expense-form">
                <select id="expense-category" required>
                    <option value="">Select Category</option>
                </select>
                <select id="expense-bank" required>
                    <option value="">Select Bank</option>
                </select>
                <input type="number" id="expense-amount" placeholder="Amount" min="0" step="0.01" required />
                <input type="date" id="expense-date" required />
                <textarea id="expense-description" placeholder="Description"></textarea>
                <button type="submit">Add Expense</button>
            </form>
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Category/ID</th>
                            <th>Amount</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="expense-table-body"></tbody>
                </table>
            </div>
            <style>
                .category-summary { background-color: #f5f5f5; }
                .category-summary td { padding: 12px 8px; }
                .expense-detail td { padding: 8px; }
                .toggle-details {
                    padding: 4px 8px;
                    cursor: pointer;
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 4px;
                }
                .category-details tr:hover { background-color: #ffe6a7; }
            </style>
        </div>
    `;
    document.getElementById('expense-form').addEventListener('submit', handleFormSubmit);
}

function setupWindowControls() {
    const { remote } = window.require ? window.require('@electron/remote') : {};
    if (!remote) return;
    document.getElementById('minimize-btn').onclick = () => remote.BrowserWindow.getFocusedWindow().minimize();
    document.getElementById('maximize-btn').onclick = () => {
        const win = remote.BrowserWindow.getFocusedWindow();
        win.isMaximized() ? win.unmaximize() : win.maximize();
    };
    document.getElementById('close-btn').onclick = () => remote.BrowserWindow.getFocusedWindow().close();
}

function fetchCategories() {
    fetch(`${API_BASE_URL}/expense_category.php`)
        .then(res => res.json())
        .then(data => {
            if ((data.status && data.status === 'success') || (data.success === true)) {
                const select = document.getElementById('expense-category');
                data.data.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat.id;
                    opt.textContent = cat.name;
                    select.appendChild(opt);
                });
            }
        });
}

function fetchBanks() {
    fetch(`${API_BASE_URL}/bank.php`)
        .then(res => res.json())
        .then(data => {
            if ((data.status && data.status === 'success') || (data.success === true)) {
                const select = document.getElementById('expense-bank');
                data.data.forEach(bank => {
                    const opt = document.createElement('option');
                    opt.value = bank.id;
                    opt.textContent = bank.bank_name;
                    select.appendChild(opt);
                });
            }
        });
}

function fetchExpenses() {
    fetch(`${API_BASE_URL}/expense.php`)
        .then(res => res.json())
        .then(data => {
            if (data.success) renderTable(data.data);
            else showError(data.message || 'Failed to load expenses');
        })
        .catch(() => showError('Failed to load expenses'));
}

function renderTable(expenses) {
    const tbody = document.getElementById('expense-table-body');
    tbody.innerHTML = '';
    if (!expenses.length) {
        tbody.innerHTML = '<tr><td colspan="6">No expenses found</td></tr>';
        return;
    }

    // Group expenses by category
    const groupedExpenses = expenses.reduce((acc, exp) => {
        if (!acc[exp.category_name]) {
            acc[exp.category_name] = {
                expenses: [],
                total: 0
            };
        }
        acc[exp.category_name].expenses.push(exp);
        acc[exp.category_name].total += parseFloat(exp.amount);
        return acc;
    }, {});

    // Sort categories by total amount (highest first)
    const sortedCategories = Object.entries(groupedExpenses).sort((a, b) => b[1].total - a[1].total);

    // Render each category group
    sortedCategories.forEach(([category, data]) => {
        // Category summary row
        const summaryRow = document.createElement('tr');
        summaryRow.className = 'category-summary';
        summaryRow.innerHTML = `
            <td>${category}</td>
            <td>${data.total.toFixed(2)}</td>
            <td>
                <button class="btn btn-primary btn-sm toggle-details" data-category="${category}">View Details</button>
            </td>
        `;
        tbody.appendChild(summaryRow);
    });

    // Add event delegation for toggle buttons
    tbody.onclick = function(e) {
        if (e.target && e.target.classList.contains('toggle-details')) {
            const category = e.target.getAttribute('data-category');
            window.location.href = `expense_details.html?category=${encodeURIComponent(category)}`;
        }
    };

}

function handleFormSubmit(e) {
    e.preventDefault();
    hideError();
    const category_id = document.getElementById('expense-category').value;
    const bank_id = document.getElementById('expense-bank').value;
    const amount = document.getElementById('expense-amount').value;
    const date = document.getElementById('expense-date').value;
    const description = document.getElementById('expense-description').value.trim();
    if (!category_id || !bank_id || !amount || !date) {
        showError('All fields except description are required');
        return;
    }
    const body = JSON.stringify({ category_id, bank_id, amount, date, description });
    fetch(`${API_BASE_URL}/expense.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
    })
        .then(res => res.json())
        .then(data => {
            if ((data.status && data.status === 'success') || (data.success === true)) {
                fetchExpenses();
                document.getElementById('expense-form').reset();
            } else showError(data.message || 'Error');
        })
        .catch(() => showError('Failed to save'));
}

function showError(msg) {
    const el = document.getElementById('expense-error');
    el.textContent = msg;
    el.style.display = '';
}
function hideError() {
    const el = document.getElementById('expense-error');
    el.textContent = '';
    el.style.display = 'none';
}
