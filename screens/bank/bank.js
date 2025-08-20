const { ipcRenderer } = require('electron');
const API_URL = "https://oftbrothers.com/backend/api/bank.php";

function returnToDashboard() {
    window.location.href = '../../index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    fetchBanks();
    setupEventListeners();
});

function setupEventListeners() {
    const bankForm = document.getElementById('bankForm');
    bankForm.addEventListener('submit', handleAddBank);

    // Add input validation
    const openingBalance = document.getElementById('openingBalance');
    openingBalance.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (value < 0) {
            e.target.setCustomValidity('Balance cannot be negative');
        } else {
            e.target.setCustomValidity('');
        }
    });
}

async function fetchBanks() {
    const tableBody = document.getElementById('banksTableBody');
    tableBody.innerHTML = '<tr><td colspan="3" class="text-center"><div class="spinner-border text-primary" role="status"></div></td></tr>';

    try {
        const response = await fetch(API_URL);
        const result = await response.json();
        if (result.status === 'success') {
            displayBanks(result.data);
        } else {
            throw new Error(result.message || 'Failed to fetch banks');
        }
    } catch (error) {
        console.error('Error fetching banks:', error);
        showNotification('error', 'Failed to fetch banks');
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Failed to load banks</td></tr>';
    }
}

async function handleAddBank(event) {
    event.preventDefault();
    const bankName = document.getElementById('bankName').value.trim();
    const openingBalance = document.getElementById('openingBalance').value;

    if (!bankName || !openingBalance) {
        showNotification('error', 'Please fill all fields');
        return;
    }

    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bank_name: bankName,
                opening_balance: openingBalance
            })
        });

        const result = await response.json();
        if (result.status === 'success') {
            showNotification('success', result.message);
            document.getElementById('bankForm').reset();
            fetchBanks();
        } else {
            throw new Error(result.message || 'Failed to add bank');
        }
    } catch (error) {
        console.error('Error adding bank:', error);
        showNotification('error', error.message || 'Failed to add bank');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

function displayBanks(banks) {
    const tableBody = document.getElementById('banksTableBody');
    if (!banks || banks.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center empty-container">
                    <i class="fas fa-university fa-2x mb-3 text-muted"></i>
                    <p class="empty-text">No banks added yet</p>
                </td>
            </tr>`;
        return;
    }

    tableBody.innerHTML = banks.map(bank => `
        <tr class="fade-in">
            <td>
                <i class="fas fa-university me-2 text-primary"></i>
                ${bank.bank_name}
            </td>
            <td>Rs. ${parseFloat(bank.opening_balance).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}</td>
            <td class="text-end">
                <button onclick="handleViewDetails(${bank.id})" class="btn btn-primary btn-sm">
                    <i class="fas fa-eye me-1"></i> View Details
                </button>
            </td>
        </tr>
    `).join('');
}

async function handleViewDetails(id) {
    try {
        // Redirect to bank ledger page with the bank ID
        window.location.href = '../banksLedger/bank_ledger.html?id=' + id;
    } catch (error) {
        console.error('Error opening bank ledger:', error);
        showNotification('error', 'Failed to open bank ledger');
    }
}

function showNotification(type, message) {
    ipcRenderer.send('show-notification', {
        title: type === 'error' ? 'Error' : 'Success',
        body: message
    });
}
