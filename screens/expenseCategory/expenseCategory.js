// Expense Category Plain JS Implementation
const API_BASE_URL = 'https://oftbrothers.com/backend/api';

document.addEventListener('DOMContentLoaded', function () {
    renderLayout();
    fetchCategories();
    setupWindowControls();
});

function renderLayout() {
    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="ec-container">
            <h2>Expense Categories</h2>
            <div id="ec-error" class="error-text" style="display:none;"></div>
            <form id="ec-form" class="ec-form">
                <input type="text" id="ec-name" placeholder="Category Name" required />
                <input type="hidden" id="ec-id" />
                <button type="submit">Add</button>
                <button type="button" id="ec-cancel" style="display:none;">Cancel</button>
            </form>
            <table class="ec-table" border="1" cellpadding="8">
                <thead>
                    <tr><th>ID</th><th>Name</th><th>Actions</th></tr>
                </thead>
                <tbody id="ec-table-body"></tbody>
            </table>
        </div>
    `;
    document.getElementById('ec-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('ec-cancel').addEventListener('click', resetForm);
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
            if (data.success) renderTable(data.data);
            else showError(data.message || 'Failed to load categories');
        })
        .catch(() => showError('Failed to load categories'));
}

function renderTable(categories) {
    const tbody = document.getElementById('ec-table-body');
    tbody.innerHTML = '';
    if (!categories.length) {
        tbody.innerHTML = '<tr><td colspan="3">No categories found</td></tr>';
        return;
    }
    categories.forEach(cat => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${cat.id}</td>
            <td>${cat.name}</td>
            <td>
                <button class="ec-edit" data-id="${cat.id}" data-name="${cat.name}">Edit</button>
                <button class="ec-delete" data-id="${cat.id}">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.ec-edit').forEach(btn => btn.onclick = handleEdit);
    tbody.querySelectorAll('.ec-delete').forEach(btn => btn.onclick = handleDelete);
}

function handleFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('ec-name').value.trim();
    const id = document.getElementById('ec-id').value;
    if (!name) return showError('Name is required');
    hideError();
    const method = id ? 'PUT' : 'POST';
    const body = JSON.stringify(id ? { id, name } : { name });
    fetch(`${API_BASE_URL}/expense_category.php`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                fetchCategories();
                resetForm();
            } else showError(data.message || 'Error');
        })
        .catch(() => showError('Failed to save'));
}

function handleEdit(e) {
    document.getElementById('ec-id').value = e.target.dataset.id;
    document.getElementById('ec-name').value = e.target.dataset.name;
    document.querySelector('#ec-form button[type="submit"]').textContent = 'Update';
    document.getElementById('ec-cancel').style.display = '';
}

function handleDelete(e) {
    if (!confirm('Delete this category?')) return;
    const id = e.target.dataset.id;
    fetch(`${API_BASE_URL}/expense_category.php`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) fetchCategories();
            else showError(data.message || 'Error');
        })
        .catch(() => showError('Failed to delete'));
}

function resetForm() {
    document.getElementById('ec-id').value = '';
    document.getElementById('ec-name').value = '';
    document.querySelector('#ec-form button[type="submit"]').textContent = 'Add';
    document.getElementById('ec-cancel').style.display = 'none';
}

function showError(msg) {
    const el = document.getElementById('ec-error');
    el.textContent = msg;
    el.style.display = '';
}
function hideError() {
    const el = document.getElementById('ec-error');
    el.textContent = '';
    el.style.display = 'none';
}
