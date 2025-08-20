const { API_BASE_URL } = require('../../config');
const BASE_URL = `${API_BASE_URL}/client.php`;

let clients = [];
let editingId = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchClients();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('addClientBtn').addEventListener('click', () => {
        openModal();
    });

    document.getElementById('clientForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleSubmit();
    });
}

async function fetchClients() {
    showLoading(true);
    try {
        const response = await fetch(BASE_URL);
        const result = await response.json();

        if (result.success) {
            clients = result.data;
            renderClients();
        } else {
            showError(result.message || "Failed to fetch clients");
        }
    } catch (error) {
        showError("Network error. Please check your connection.");
        console.error(error);
    } finally {
        showLoading(false);
    }
}

function renderClients() {
    const container = document.getElementById('clientsContainer');
    const emptyContainer = document.getElementById('emptyContainer');

    if (clients.length === 0) {
        container.style.display = 'none';
        emptyContainer.style.display = 'flex';
        return;
    }

    container.style.display = 'flex';
    emptyContainer.style.display = 'none';
    container.innerHTML = '';

    clients.forEach(client => {
        const card = document.createElement('div');
        card.className = 'client-card';
        card.innerHTML = `
            <div class="card-header">
                <span class="client-name">${client.name}</span>
                <div class="action-buttons">
                    <button class="view-button" onclick="handleViewDetails(${client.id})">View Details</button>
                    <button class="edit-button" onclick="handleEdit(${client.id})">Edit</button>
                    <button class="delete-button" onclick="handleDelete(${client.id})">Delete</button>
                </div>
            </div>
            <div class="card-body">
                <div class="info-row">
                    <span class="info-label">Firm:</span>
                    <span class="info-value">${client.firm_name || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Contact:</span>
                    <span class="info-value">${client.contact || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Balance:</span>
                    <span class="info-value">${client.opening_balance || '0'}</span>
                </div>
                ${client.address ? `
                    <div class="info-row">
                        <span class="info-label">Address:</span>
                        <span class="info-value">${client.address}</span>
                    </div>
                ` : ''}
                ${client.description ? `
                    <div class="description-box">
                        <span class="description-text">${client.description}</span>
                    </div>
                ` : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

function showLoading(show) {
    document.getElementById('loadingContainer').style.display = show ? 'flex' : 'none';
    document.getElementById('clientsContainer').style.display = show ? 'none' : 'flex';
}

function showError(message) {
    alert(message);
}

function openModal(client = null) {
    const modal = document.getElementById('clientModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('clientForm');

    editingId = client ? client.id : null;
    modalTitle.textContent = client ? 'Edit Client' : 'Add New Client';

    if (client) {
        form.name.value = client.name;
        form.firmName.value = client.firm_name || '';
        form.contact.value = client.contact || '';
        form.openingBalance.value = client.opening_balance || '';
        form.address.value = client.address || '';
        form.description.value = client.description || '';
    } else {
        form.reset();
    }

    modal.classList.add('show');
}

function closeModal() {
    const modal = document.getElementById('clientModal');
    modal.classList.remove('show');
    editingId = null;
}

async function handleSubmit() {
    const form = document.getElementById('clientForm');
    const formData = {
        name: form.name.value.trim(),
        firmName: form.firmName.value.trim(),
        contact: form.contact.value.trim(),
        openingBalance: form.openingBalance.value.trim(),
        address: form.address.value.trim(),
        description: form.description.value.trim()
    };

    if (!formData.name) {
        showError("Name is required");
        return;
    }

    if (editingId) {
        formData.id = editingId;
    }

    try {
        const response = await fetch(BASE_URL, {
            method: editingId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            fetchClients();
            closeModal();
        } else {
            showError(result.message || "Operation failed");
        }
    } catch (error) {
        showError("Network error. Please check your connection.");
        console.error(error);
    }
}

function handleEdit(id) {
    const client = clients.find(c => c.id === id);
    if (client) {
        openModal(client);
    }
}

function handleDelete(id) {
    const deleteModal = document.getElementById('deleteModal');
    deleteModal.classList.add('show');
    
    // Store the ID for the confirm delete action
    deleteModal.dataset.clientId = id;
}

function closeDeleteModal() {
    const deleteModal = document.getElementById('deleteModal');
    deleteModal.classList.remove('show');
    delete deleteModal.dataset.clientId;
}

async function confirmDelete() {
    const deleteModal = document.getElementById('deleteModal');
    const id = deleteModal.dataset.clientId;

    if (!id) return;

    try {
        const response = await fetch(BASE_URL, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id })
        });

        const result = await response.json();

        if (result.success) {
            fetchClients();
            closeDeleteModal();
        } else {
            showError(result.message || "Failed to delete client");
        }
    } catch (error) {
        showError("Network error. Please check your connection.");
        console.error(error);
    }
}

function handleViewDetails(id) {
    // Store the client ID in localStorage for the details page
    localStorage.setItem('selectedClientId', id);
    window.location.href = '../client-details/client-details.html';
}
