const { API_BASE_URL } = require('../../config');
const API_URL = `${API_BASE_URL}/payments.php`;
const VENDORS_URL = `${API_BASE_URL}/vendor.php`;
const BANK_URL = `${API_BASE_URL}/bank.php`;

let vendors = []; // Store vendors data
let banks = []; // Store banks data
let paymentModal;

document.addEventListener('DOMContentLoaded', () => {
    paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
    
    document.getElementById('addPaymentBtn').addEventListener('click', () => {
        document.getElementById('paymentForm').reset();
        paymentModal.show();
    });
    
    document.getElementById('savePaymentBtn').addEventListener('click', handleSubmit);
    
    // Fetch initial data
    Promise.all([fetchVendors(), fetchBanks(), fetchPayments()]);
});

async function fetchVendors() {
    try {
        const response = await fetch(VENDORS_URL);
        const result = await response.json();
        
        // Handle both old and new response formats
        const isSuccess = result.status === 'success' || result.success === true;
        const data = result.data;
        
        if (isSuccess && Array.isArray(data)) {
            vendors = data; // Store vendors data
            const select = document.getElementById('vendor');
            select.innerHTML = '<option value="">Select a vendor</option>';
            vendors.forEach(vendor => {
                const option = document.createElement('option');
                option.value = vendor.id;
                option.textContent = vendor.name;
                select.appendChild(option);
            });
        } else {
            showError('Failed to fetch vendors: ' + (result.message || 'Invalid response format'));
        }
    } catch (error) {
        showError('Network error while fetching vendors');
        console.error(error);
    }
}

async function fetchBanks() {
    try {
        const response = await fetch(BANK_URL);
        const result = await response.json();
        
        if (result.status === 'success' && Array.isArray(result.data)) {
            banks = result.data; // Store banks data
            const select = document.getElementById('bank');
            select.innerHTML = '<option value="">Select a bank</option>';
            banks.forEach(bank => {
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

async function fetchPayments() {
    try {
        const response = await fetch(API_URL);
        const result = await response.json();

        if (result.status === 'success' && Array.isArray(result.data)) {
            renderPayments(result.data);
        } else {
            showError(result.message || 'Failed to fetch payments');
        }
    } catch (error) {
        showError('Network error while fetching payments');
        console.error(error);
    }
}

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
        
        if (result.status === 'success') {
            showSuccess('Payment saved successfully');
            paymentModal.hide();
            document.getElementById('paymentForm').reset();
            await Promise.all([fetchPayments(), fetchBanks()]);
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

function renderPayments(payments) {
    const tableBody = document.getElementById('paymentsTableBody');
    
    if (!payments || payments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No payments found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = payments.map(payment => `
        <tr>
            <td>${payment.vendor_name || 'N/A'}</td>
            <td>${payment.bank_name || 'N/A'}</td>
            <td>${payment.amount}</td>
            <td>${payment.description || ''}</td>
        </tr>
    `).join('');
}

function showSuccess(message) {
    alert(message); // Replace with better UI feedback
}

function showError(message) {
    alert(message); // Replace with better UI feedback
}
