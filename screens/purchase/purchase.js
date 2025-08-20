const { API_BASE_URL } = require('../../config');

// Bootstrap Modal instance
let purchaseModal;
let isEditMode = false;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap modal
    purchaseModal = new bootstrap.Modal(document.getElementById('purchaseModal'));
    
    // Add event listeners
    document.getElementById('addPurchaseBtn').addEventListener('click', handleAddPurchase);
    document.getElementById('savePurchaseBtn').addEventListener('click', handleSubmit);
    document.getElementById('backToHome').addEventListener('click', () => {
        window.location.href = '../home/home.html';
    });
    
    // Add input event listeners for total price calculation
    document.getElementById('quantity').addEventListener('input', calculateTotalPrice);
    document.getElementById('pricePerKg').addEventListener('input', calculateTotalPrice);
    
    // Fetch initial data
    fetchVendors();
    fetchProducts();
    fetchPurchases();
});

// Calculate total price
function calculateTotalPrice() {
    const quantity = parseFloat(document.getElementById('quantity').value) || 0;
    const pricePerKg = parseFloat(document.getElementById('pricePerKg').value) || 0;
    const total = quantity * pricePerKg;
    document.getElementById('totalPrice').textContent = `₹ ${total.toFixed(2)}`;
}

// Fetch vendors for dropdown
async function fetchVendors() {
    try {
        const response = await fetch(`${API_BASE_URL}/vendor.php`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Vendor API Response:', result);
        
        if (result && result.status === 'success' && Array.isArray(result.data)) {
            const select = document.getElementById('vendor');
            select.innerHTML = '<option value="">Select Vendor</option>';
            select.disabled = false;
            
            result.data.forEach(vendor => {
                if (vendor && vendor.id && vendor.name) {
                    const option = document.createElement('option');
                    option.value = vendor.id;
                    option.textContent = `${vendor.name} (${vendor.firm_name || 'No Firm'})`;
                    select.appendChild(option);
                }
            });

            if (select.options.length <= 1) {
                throw new Error('No vendors available');
            }
        } else {
            throw new Error('Invalid response format from server');
        }
    } catch (error) {
        console.error('Vendor fetch error:', error);
        showError(`Failed to fetch vendors: ${error.message}`);
        
        const select = document.getElementById('vendor');
        select.innerHTML = '<option value="">No vendors available</option>';
        select.disabled = true;
    }
}

// Fetch products for dropdown
async function fetchProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/product.php`);
        const result = await response.json();
        
        if (result.status === 'success') {
            const select = document.getElementById('product');
            result.data.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = product.name;
                select.appendChild(option);
            });
        } else {
            showError(result.message || 'Failed to fetch products');
        }
    } catch (error) {
        showError('Network error while fetching products');
        console.error(error);
    }
}

// Fetch all purchases
async function fetchPurchases() {
    toggleLoading(true);
    try {
        console.log('Fetching purchases from:', `${API_BASE_URL}/order.php`);
        const response = await fetch(`${API_BASE_URL}/order.php`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        // Log response details
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        let result;
        try {
            result = JSON.parse(responseText);
            console.log('Parsed response:', result);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.log('Invalid JSON received:', responseText);
            throw new Error('Invalid JSON response from server');
        }

        if (result.status === 'success') {
            console.log('Rendering purchases:', result.data);
            renderPurchases(result.data);
        } else {
            const errorMsg = result.message || 'Failed to fetch purchases';
            console.error('API Error:', errorMsg);
            showError(errorMsg);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        showError('Network error while fetching purchases');
    } finally {
        toggleLoading(false);
    }
}

// Render purchases table
function renderPurchases(purchases) {
    const tableBody = document.getElementById('purchaseTableBody');
    const emptyState = document.getElementById('emptyState');
    const tableContainer = document.querySelector('.table-responsive');

    if (!purchases || purchases.length === 0) {
        tableContainer.classList.add('d-none');
        emptyState.classList.remove('d-none');
        return;
    }

    tableContainer.classList.remove('d-none');
    emptyState.classList.add('d-none');
    
    tableBody.innerHTML = purchases.map(purchase => `
        <tr>
            <td>${purchase.vendor_name || 'Unknown'}</td>
            <td>${purchase.product_name || 'Unknown'}</td>
            <td>${parseFloat(purchase.quantity).toFixed(1)}</td>
            <td>₹ ${parseFloat(purchase.price_per_kg).toFixed(2)}</td>
            <td>₹ ${parseFloat(purchase.total_price).toFixed(2)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-edit" onclick='handleEdit(${JSON.stringify(purchase).replace(/'/g, "&#39;")})'>
                        Edit
                    </button>
                    <button class="btn btn-delete" onclick="handleDelete(${purchase.id})">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Handle add purchase button click
function handleAddPurchase() {
    isEditMode = false;
    document.getElementById('purchaseForm').reset();
    document.getElementById('totalPrice').textContent = '₹ 0.00';
    purchaseModal.show();
}

// Handle edit purchase button click
function handleEdit(purchase) {
    isEditMode = true;
    
    // Fill form with purchase data
    document.getElementById('vendor').value = purchase.vendor_id;
    document.getElementById('product').value = purchase.product_id;
    document.getElementById('quantity').value = purchase.quantity;
    document.getElementById('pricePerKg').value = purchase.price_per_kg;
    calculateTotalPrice();
    
    purchaseModal.show();
}

// Handle form submission
async function handleSubmit() {
    const form = document.getElementById('purchaseForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = {
        vendor_id: document.getElementById('vendor').value,
        product_id: document.getElementById('product').value,
        quantity: parseFloat(document.getElementById('quantity').value),
        price_per_kg: parseFloat(document.getElementById('pricePerKg').value),
        total_price: parseFloat(document.getElementById('totalPrice').textContent.replace('₹ ', ''))
    };

    toggleLoading(true);
    try {
        const method = isEditMode ? 'PUT' : 'POST';
        const response = await fetch(`${API_BASE_URL}/order.php`, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        if (result.status === 'success') {
            showSuccess(result.message);
            purchaseModal.hide();
            fetchPurchases();
        } else {
            showError(result.message || 'Operation failed');
        }
    } catch (error) {
        showError('Network error. Please check your connection.');
        console.error(error);
    } finally {
        toggleLoading(false);
    }
}

// Handle delete purchase
function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this purchase?')) {
        return;
    }

    toggleLoading(true);
    fetch(`${API_BASE_URL}/order.php`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
    })
    .then(response => response.json())
    .then(result => {
        if (result.status === 'success') {
            showSuccess(result.message);
            fetchPurchases();
        } else {
            showError(result.message || 'Failed to delete purchase');
        }
    })
    .catch(error => {
        showError('Network error. Please check your connection.');
        console.error(error);
    })
    .finally(() => {
        toggleLoading(false);
    });
}

// Toggle loading spinner
function toggleLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.remove('d-none');
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
    const errorToast = document.getElementById('errorToast');
    if (errorToast) {
        const toastBody = errorToast.querySelector('.toast-body');
        if (toastBody) {
            toastBody.textContent = message;
            const toast = new bootstrap.Toast(errorToast);
            toast.show();
        }
    } else {
        // Fallback to alert if toast element doesn't exist
        alert(message);
    }
}
