const { API_BASE_URL } = require('../../config');
const API_URL = `${API_BASE_URL}/client.php`;
const BANK_URL = `${API_BASE_URL}/bank.php`;
const BASE_URL = `${API_BASE_URL}/receives.php`;

// Bootstrap Modal instance
let receiptModal;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap modal
    receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));
    
    // Add event listeners
    document.getElementById('backToHome').addEventListener('click', () => {
        window.location.href = '../home/home.html';
    });
    
    document.getElementById('addReceiptBtn').addEventListener('click', () => {
        document.getElementById('receiptForm').reset();
        receiptModal.show();
    });
    
    document.getElementById('saveReceiptBtn').addEventListener('click', handleSubmit);
    
    // Fetch initial data
    fetchClients();
    fetchBanks();
    fetchReceipts();
});

// Fetch clients for dropdown
async function fetchClients() {
    try {
        const response = await fetch(API_URL);
        const result = await response.json();
        
        if (result.success === true) {
            const select = document.getElementById('client');
            result.data.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = client.name;
                select.appendChild(option);
            });
        } else {
            showError(result.message || 'Failed to fetch clients');
        }
    } catch (error) {
        showError('Network error while fetching clients');
        console.error(error);
    }
}

// Fetch banks for dropdown
async function fetchBanks() {
    try {
        const response = await fetch(BANK_URL);
        const result = await response.json();
        
        if (result.status === 'success' && Array.isArray(result.data)) {
            const select = document.getElementById('bank');
            select.innerHTML = '<option value="">Select a bank</option>'; // Add default option
            result.data.forEach(bank => {
                const option = document.createElement('option');
                option.value = bank.id;
                option.textContent = bank.bank_name;
                select.appendChild(option);
            });
        } else {
            showError('Failed to fetch banks: ' + (result.message || 'Invalid response format'));
        }
    } catch (error) {
        showError('Network error while fetching banks');
        console.error(error);
    }
}

// Fetch all receipts
async function fetchReceipts() {
    toggleLoading(true);
    try {
        const response = await fetch(BASE_URL);
        const result = await response.json();

        if (result.success === true) {
            renderReceipts(result.data);
        } else {
            showError(result.message || 'Failed to fetch receipts');
        }
    } catch (error) {
        showError('Network error while fetching receipts');
        console.error(error);
    } finally {
        toggleLoading(false);
    }
}

// Handle form submission
async function handleSubmit() {
    const form = document.getElementById('receiptForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const clientId = document.getElementById('client').value;
    const bankId = document.getElementById('bank').value;
    const amount = document.getElementById('amount').value;
    const description = document.getElementById('description').value;

    if (!clientId || !bankId || !amount) {
        showError('Please fill all required fields');
        return;
    }

    const saveButton = document.getElementById('saveReceiptBtn');
    const originalText = saveButton.textContent;
    saveButton.textContent = 'Saving...';
    saveButton.disabled = true;

    try {
        const response = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: clientId,
                bank_id: bankId,
                amount: parseFloat(amount),
                description: description
            })
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            showSuccess(result.message);
            receiptModal.hide();
            document.getElementById('receiptForm').reset();
            fetchReceipts();
        } else {
            showError(result.message || 'Failed to save receipt');
        }
    } catch (error) {
        showError('Network error while saving receipt');
        console.error(error);
    } finally {
        saveButton.textContent = originalText;
        saveButton.disabled = false;
    }
}

// Render receipts table
function renderReceipts(receipts) {
    const tableBody = document.getElementById('receiptsTableBody');
    const emptyState = document.getElementById('emptyState');
    const tableContainer = document.querySelector('.table-responsive');

    if (!receipts || receipts.length === 0) {
        tableContainer.classList.add('d-none');
        emptyState.classList.remove('d-none');
        return;
    }

    tableContainer.classList.remove('d-none');
    emptyState.classList.add('d-none');
    
    tableBody.innerHTML = receipts.map(receipt => `
        <tr>
            <td>${receipt.client_name || 'Unknown'}</td>
            <td>${receipt.bank_name || 'Unknown'}</td>
            <td>₹ ${parseFloat(receipt.amount).toFixed(2)}</td>
            <td>${receipt.description || '-'}</td>
        </tr>
    `).join('');
}

// Toggle loading spinner
function toggleLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const tableContainer = document.querySelector('.table-responsive');
    const emptyState = document.getElementById('emptyState');
    
    if (show) {
        spinner.classList.remove('d-none');
        tableContainer.classList.add('d-none');
        emptyState.classList.add('d-none');
    } else {
        spinner.classList.add('d-none');
    }
}

// Show success message
function showSuccess(message) {
    alert(message);
}

// Show error message
function showError(message) {
    alert(message);
}
