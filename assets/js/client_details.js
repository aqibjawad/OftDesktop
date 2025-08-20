// Get client ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const clientId = urlParams.get('id');

const API_BASE_URL = 'http://localhost/app/backend/api';

// DOM Elements
const clientInfo = document.getElementById('clientInfo');
const salesTable = document.getElementById('salesTable');
const paymentsTable = document.getElementById('paymentsTable');
const productSelect = document.getElementById('productSelect');
const bankSelect = document.getElementById('bankSelect');

// Load initial data
document.addEventListener('DOMContentLoaded', () => {
    loadClientDetails();
    loadSalesHistory();
    loadPaymentHistory();
    loadProducts();
    loadBanks();
});

// Load client details
async function loadClientDetails() {
    try {
        const response = await fetch(`${API_BASE_URL}/client.php?action=client_sales&client_id=${clientId}`);
        const data = await response.json();

        if (data.success && data.client_details) {
            const client = data.client_details;
            clientInfo.innerHTML = `
                <div class="col-md-3">
                    <p class="mb-1"><strong>Name:</strong> ${client.name}</p>
                </div>
                <div class="col-md-3">
                    <p class="mb-1"><strong>Contact:</strong> ${client.contact || 'N/A'}</p>
                </div>
                <div class="col-md-3">
                    <p class="mb-1"><strong>Firm:</strong> ${client.firm_name || 'N/A'}</p>
                </div>
                <div class="col-md-3">
                    <p class="mb-1"><strong>Balance:</strong> Rs. ${client.opening_balance || '0'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading client details:', error);
        alert('Error loading client details');
    }
}

// Load sales history
async function loadSalesHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/client.php?action=client_sales&client_id=${clientId}`);
        const data = await response.json();

        if (data.success && data.sales_data) {
            salesTable.innerHTML = data.sales_data.map(sale => `
                <tr>
                    <td>${new Date(sale.sale_date).toLocaleDateString()}</td>
                    <td>${sale.product_name}</td>
                    <td>${sale.quantity}</td>
                    <td>Rs. ${sale.price_per_kg}</td>
                    <td>Rs. ${sale.total_price}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editSale(${JSON.stringify(sale).replace(/"/g, '&quot;')})">
                            Edit
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading sales history:', error);
        alert('Error loading sales history');
    }
}

// Load payment history
async function loadPaymentHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/receives.php?client_id=${clientId}`);
        const data = await response.json();

        if (data.success) {
            paymentsTable.innerHTML = data.data.map(payment => `
                <tr>
                    <td>${new Date(payment.created_at).toLocaleDateString()}</td>
                    <td>${payment.bank_name}</td>
                    <td>Rs. ${payment.amount}</td>
                    <td>${payment.description || 'N/A'}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading payment history:', error);
        alert('Error loading payment history');
    }
}

// Load products for dropdown
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/product.php`);
        const data = await response.json();

        if (data.success) {
            productSelect.innerHTML = data.data.map(product =>
                `<option value="${product.id}">${product.name}</option>`
            ).join('');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        alert('Error loading products');
    }
}

// Load banks for dropdown
async function loadBanks() {
    try {
        const response = await fetch(`${API_BASE_URL}/bank.php`);
        const data = await response.json();

        if (data.success) {
            bankSelect.innerHTML = data.data.map(bank =>
                `<option value="${bank.id}">${bank.bank_name}</option>`
            ).join('');
        }
    } catch (error) {
        console.error('Error loading banks:', error);
        alert('Error loading banks');
    }
}

// Edit sale
function editSale(sale) {
    document.getElementById('saleId').value = sale.sale_id;
    document.getElementById('productSelect').value = sale.product_id;
    document.getElementById('quantity').value = sale.quantity;
    document.getElementById('pricePerKg').value = sale.price_per_kg;
    document.getElementById('packing').value = sale.packing || '';
    
    new bootstrap.Modal(document.getElementById('updateSaleModal')).show();
}

// Update sale
document.getElementById('updateSaleBtn').addEventListener('click', async () => {
    const saleData = {
        id: document.getElementById('saleId').value,
        product_id: document.getElementById('productSelect').value,
        quantity: document.getElementById('quantity').value,
        price_per_kg: document.getElementById('pricePerKg').value,
        packing: document.getElementById('packing').value,
        client_id: clientId
    };

    try {
        const response = await fetch(`${API_BASE_URL}/sales.php`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(saleData)
        });

        const data = await response.json();

        if (data.success) {
            alert('Sale updated successfully');
            bootstrap.Modal.getInstance(document.getElementById('updateSaleModal')).hide();
            loadSalesHistory();
            loadClientDetails(); // Refresh client details to show updated balance
        } else {
            alert(data.message || 'Error updating sale');
        }
    } catch (error) {
        console.error('Error updating sale:', error);
        alert('Error updating sale');
    }
});

// Add payment
document.getElementById('addPaymentBtn').addEventListener('click', async () => {
    const paymentData = {
        client_id: clientId,
        bank_id: document.getElementById('bankSelect').value,
        amount: document.getElementById('paymentAmount').value,
        description: document.getElementById('paymentDescription').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/receives.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });

        const data = await response.json();

        if (data.success) {
            alert('Payment added successfully');
            bootstrap.Modal.getInstance(document.getElementById('addPaymentModal')).hide();
            loadPaymentHistory();
            loadClientDetails(); // Refresh client details to show updated balance
        } else {
            alert(data.message || 'Error adding payment');
        }
    } catch (error) {
        console.error('Error adding payment:', error);
        alert('Error adding payment');
    }
});
