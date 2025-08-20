const { API_BASE_URL } = require('../../config');
const BASE_URL = `${API_BASE_URL}/vendor.php`;

// Bootstrap Modal instance
let vendorModal;
let isEditMode = false;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap modal
    vendorModal = new bootstrap.Modal(document.getElementById('vendorModal'));
    
    // Add event listeners
    document.getElementById('addVendorBtn').addEventListener('click', handleAddVendor);
    document.getElementById('saveVendorBtn').addEventListener('click', handleSubmit);
    document.getElementById('backToHome').addEventListener('click', () => {
        window.location.href = '../home/home.html';
    });
    
    // Fetch vendors on load
    fetchVendors();
});

// Fetch all vendors
async function fetchVendors() {
    toggleLoading(true);
    try {
        const response = await fetch(BASE_URL);
        const result = await response.json();

        if (result.status === 'success' && Array.isArray(result.data)) {
            renderVendors(result.data);
        } else {
            showError(result.message || 'Failed to fetch vendors');
        }
    } catch (error) {
        showError('Network error. Please check your connection.');
        console.error(error);
    } finally {
        toggleLoading(false);
    }
}

// Render vendor cards
function renderVendors(vendors) {
    const vendorList = document.getElementById('vendorList');
    const emptyState = document.getElementById('emptyState');

    if (vendors.length === 0) {
        vendorList.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
    }

    emptyState.classList.add('d-none');
    vendorList.innerHTML = vendors.map(vendor => `
        <div class="col-md-6 col-lg-4">
            <div class="vendor-card">
                <div class="card-header">
                    <h3 class="vendor-name">${vendor.name}</h3>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-view" onclick="handleViewDetails(${vendor.id}, '${vendor.name}')">
                            View Details
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="handleEditVendor(${JSON.stringify(vendor).replace(/"/g, '&quot;')})">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="handleDeleteVendor(${vendor.id})">
                            Delete
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="info-row">
                        <span class="info-label">Firm:</span>
                        <span class="info-value">${vendor.firm_name || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Contact:</span>
                        <span class="info-value">${vendor.contact || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Balance:</span>
                        <span class="info-value">${vendor.opening_balance || '0'}</span>
                    </div>
                    ${vendor.address ? `
                        <div class="info-row">
                            <span class="info-label">Address:</span>
                            <span class="info-value">${vendor.address}</span>
                        </div>
                    ` : ''}
                    ${vendor.description ? `
                        <div class="description-box">
                            <p class="description-text">${vendor.description}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Handle add vendor button click
function handleAddVendor() {
    isEditMode = false;
    document.getElementById('modalTitle').textContent = 'Add New Vendor';
    document.getElementById('vendorForm').reset();
    vendorModal.show();
}

// Handle edit vendor button click
function handleEditVendor(vendor) {
    isEditMode = true;
    document.getElementById('modalTitle').textContent = 'Edit Vendor';
    
    // Fill form with vendor data
    document.getElementById('vendorId').value = vendor.id;
    document.getElementById('name').value = vendor.name;
    document.getElementById('firmName').value = vendor.firm_name || '';
    document.getElementById('contact').value = vendor.contact || '';
    document.getElementById('openingBalance').value = vendor.opening_balance || '';
    document.getElementById('address').value = vendor.address || '';
    document.getElementById('description').value = vendor.description || '';
    
    vendorModal.show();
}

// Handle form submission
async function handleSubmit() {
    const form = document.getElementById('vendorForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = {
        id: document.getElementById('vendorId').value,
        name: document.getElementById('name').value,
        firmName: document.getElementById('firmName').value,
        contact: document.getElementById('contact').value,
        openingBalance: document.getElementById('openingBalance').value,
        address: document.getElementById('address').value,
        description: document.getElementById('description').value
    };

    toggleLoading(true);
    try {
        const method = isEditMode ? 'PUT' : 'POST';
        const response = await fetch(BASE_URL, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            showSuccess(result.message);
            vendorModal.hide();
            fetchVendors();
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

// Handle delete vendor
function handleDeleteVendor(id) {
    if (!confirm('Are you sure you want to delete this vendor?')) {
        return;
    }

    toggleLoading(true);
    fetch(BASE_URL, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showSuccess(result.message);
            fetchVendors();
        } else {
            showError(result.message || 'Failed to delete vendor');
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

// Handle view details
function handleViewDetails(vendorId, vendorName) {
    window.location.href = `../vendor-details/vendor-details.html?id=${vendorId}&name=${encodeURIComponent(vendorName)}`;
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
    // You can implement a toast or alert system here
    alert(message);
}

// Show error message
function showError(message) {
    // You can implement a toast or alert system here
    alert(message);
}
