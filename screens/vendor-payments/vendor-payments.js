const { API_BASE_URL } = require('../../config');
const API_URL = `${API_BASE_URL}/payments.php`;
const VENDORS_URL = `${API_BASE_URL}/vendor.php`;
const BANKS_URL = `${API_BASE_URL}/bank.php`;

// Bootstrap Modal instance
let paymentModal;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap modal
    paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
    
    // Add event listeners
    document.getElementById('addPaymentBtn').addEventListener('click', () => {
        document.getElementById('paymentForm').reset();
        paymentModal.show();
    });
    
    document.getElementById('savePaymentBtn').addEventListener('click', handleSubmit);
    
    // Fetch initial data
    fetchVendors();
    fetchBanks();
    fetchPayments();
});

// Fetch vendors for dropdown
async function fetchVendors() {
    try {
        const response = await fetch(VENDORS_URL);
        const result = await response.json();
        
        if (result.success === true) {
            const select = document.getElementById('vendor');
            result.data.forEach(vendor => {
                const option = document.createElement('option');
                option.value = vendor.id;
                option.textContent = vendor.name;
                select.appendChild(option);
            });
        } else {
            showError(result.message || 'Failed to fetch vendors');
        }
    } catch (error) {
        showError('Network error while fetching vendors');
        console.error(error);
    }
}

// Fetch banks for dropdown
async function fetchBanks() {
    try {
        const response = await fetch(BANKS_URL);
        const result = await response.json();
        
        if (Array.isArray(result)) {
            const select = document.getElementById('bank');
            result.forEach(bank => {
                const option = document.createElement('option');
                option.value = bank.id;
                option.textContent = `${bank.bank_name} (Balance: ₹${parseFloat(bank.balance).toFixed(2)})`;
                select.appendChild(option);
            });
        } else {
            showError('Failed to fetch banks');
        }
    } catch (error) {
        showError('Network error while fetching banks');
        console.error(error);
    }
}

// Fetch all payments
async function fetchPayments() {
    toggleLoading(true);
    try {
        const response = await fetch(API_URL);
        const result = await response.json();

        if (result.success === true) {
            renderPayments(result.data);
        } else {
            showError(result.message || 'Failed to fetch payments');
        }
    } catch (error) {
        showError('Network error while fetching payments');
        console.error(error);
    } finally {
        toggleLoading(false);
    }
}

// Handle form submission
async function handleSubmit() {
    const form = document.getElementById('paymentForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const vendorId = document.getElementById('vendor').value;
    const bankId = document.getElementById('bank').value;
    const amount = document.getElementById('amount').value;
    const description = document.getElementById('description').value;

    if (!vendorId || !bankId || !amount) {
        showError('Please fill all required fields');
        return;
    }

    const saveButton = document.getElementById('savePaymentBtn');
    const originalText = saveButton.textContent;
    saveButton.textContent = 'Saving...';
    saveButton.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                vendor_id: vendorId,
                bank_id: bankId,
                amount: parseFloat(amount),
                description: description
            })
        });

        const result = await response.json();
        
        if (result.success === true) {
            showSuccess(result.message || 'Payment saved successfully');
            paymentModal.hide();
            document.getElementById('paymentForm').reset();
            fetchPayments();
            // Refresh banks to update balances
            document.getElementById('bank').innerHTML = '<option value="">Select a bank</option>';
            fetchBanks();
        } else {
            showError(result.message || 'Failed to save payment');
        }
    } catch (error) {
        showError('Network error while saving payment');
        console.error(error);
    } finally {
        saveButton.textContent = originalText;
        saveButton.disabled = false;
    }
}

// Render payments table
function renderPayments(payments) {
    const tableBody = document.getElementById('paymentsTableBody');
    const emptyState = document.getElementById('emptyState');
    const tableContainer = document.querySelector('.table-responsive');

    if (!payments || payments.length === 0) {
        tableContainer.classList.add('d-none');
        emptyState.classList.remove('d-none');
        return;
    }

    tableContainer.classList.remove('d-none');
    emptyState.classList.add('d-none');
    
    tableBody.innerHTML = payments.map(payment => `
        <tr>
            <td>${payment.vendor_name || 'Unknown'}</td>
            <td>${payment.bank_name || 'Unknown'}</td>
            <td>₹ ${parseFloat(payment.amount).toFixed(2)}</td>
            <td>${payment.description || '-'}</td>
            <td>${new Date(payment.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

// Toggle loading spinner
function toggleLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const tableContainer = document.querySelector('.table-responsive');
    const emptyState = document.getElementById('emptyState');
    
    if (show) {
        spinner.style.display = 'block';
        tableContainer.classList.add('d-none');
        emptyState.classList.add('d-none');
    } else {
        spinner.style.display = 'none';
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
