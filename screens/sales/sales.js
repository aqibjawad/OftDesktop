const { API_BASE_URL } = require('../../config');

let saleModal;
let isEditMode = false;
let sales = [];

document.addEventListener('DOMContentLoaded', () => {
    saleModal = new bootstrap.Modal(document.getElementById('saleModal'));
    
    // Initialize empty state and table visibility
    const tableContainer = document.querySelector('.table-responsive');
    const emptyState = document.getElementById('emptyState');
    if (tableContainer) tableContainer.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    
    document.getElementById('addSaleBtn').addEventListener('click', handleAddSale);
    document.getElementById('saveSaleBtn').addEventListener('click', handleSubmit);
    document.getElementById('backToHome').addEventListener('click', () => {
        window.location.href = '../home/home.html';
    });
    
    // Product type radio buttons
    document.querySelectorAll('input[name="productType"]').forEach(radio => {
        radio.addEventListener('change', handleProductTypeChange);
    });
    
    // Loose type inputs
    document.getElementById('quantity').addEventListener('input', calculateLooseTotalPrice);
    document.getElementById('pricePerKg').addEventListener('input', calculateLooseTotalPrice);
    
    // Ready type inputs
    ['pieces', 'gramsPerPiece', 'ratePerGram', 'packingCost', 'dozensPerBox', 'totalBoxes'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', calculateReadyTotalPrice);
    });
    
    // Add date filter event listeners
    document.getElementById('fromDate')?.addEventListener('change', fetchSales);
    document.getElementById('toDate')?.addEventListener('change', fetchSales);
    
    // Initial data load
    initializeData();
});

async function initializeData() {
    try {
        await Promise.all([fetchClients(), fetchProducts(), fetchSales()]);
    } catch (error) {
        console.error('Error initializing data:', error);
    }
}

function handleProductTypeChange(event) {
    const isReady = event.target.value === 'ready';
    
    // Toggle visibility of sections
    document.getElementById('looseQuantitySection').classList.toggle('d-none', isReady);
    document.getElementById('loosePriceSection').classList.toggle('d-none', isReady);
    document.getElementById('readyQuantitySection').classList.toggle('d-none', !isReady);
    document.getElementById('readyPriceSection').classList.toggle('d-none', !isReady);
    
    // Update required attributes
    document.getElementById('quantity').required = !isReady;
    document.getElementById('pricePerKg').required = !isReady;
    document.getElementById('dozenQuantity').required = isReady;
    
    // Calculate total price based on type
    if (isReady) {
        calculateReadyTotalPrice();
    } else {
        calculateLooseTotalPrice();
    }
}

function calculateLooseTotalPrice() {
    const quantity = parseFloat(document.getElementById('quantity').value) || 0;
    const pricePerKg = parseFloat(document.getElementById('pricePerKg').value) || 0;
    const total = quantity * pricePerKg;
    document.getElementById('totalPrice').textContent = `₹ ${total.toFixed(2)}`;
}

function calculateReadyTotalPrice() {
    const pieces = parseFloat(document.getElementById('pieces').value) || 0;
    const gramsPerPiece = parseFloat(document.getElementById('gramsPerPiece').value) || 0;
    const ratePerGram = parseFloat(document.getElementById('ratePerGram').value) || 0;
    const packingCost = parseFloat(document.getElementById('packingCost').value) || 0;
    const totalBoxes = parseFloat(document.getElementById('totalBoxes').value) || 0;
    const dozensPerBox = parseFloat(document.getElementById('dozensPerBox').value) || 0;
    
    // Calculate weight value: (piece * gram * rate) / 1000
    const weight = (pieces * gramsPerPiece * ratePerGram) / 1000;
    
    // Calculate per dozen cost (weight + packing cost)
    const perDozen = weight + packingCost;
    
    // Calculate box price (no of dozens * per dozen)
    const boxPrice = dozensPerBox * perDozen;
    
    // Calculate total price (box price * total boxes)
    const totalPrice = boxPrice * totalBoxes;
    
    // Update displays
    document.getElementById('weightValue').value = weight.toFixed(2);
    document.getElementById('perDozen').value = perDozen.toFixed(2);
    document.getElementById('boxPrice').value = boxPrice.toFixed(2);
    document.getElementById('totalPrice').textContent = `₹ ${totalPrice.toFixed(2)}`;
    
    // For backend compatibility
    const totalKg = (pieces * gramsPerPiece * totalBoxes) / 1000;
    const pricePerKg = totalPrice / totalKg;
    
    return {
        quantity: totalKg,
        pricePerKg: pricePerKg,
        totalPrice: totalPrice,
        pieces: pieces,
        gramsPerPiece: gramsPerPiece,
        ratePerGram: ratePerGram,
        packingCost: packingCost,
        dozensPerBox: dozensPerBox,
        totalBoxes: totalBoxes
    };
}

async function fetchClients() {
    try {
        const response = await fetch(`${API_BASE_URL}/client.php`);
        const result = await response.json();
        
        if (result.success === true) {
            const select = document.getElementById('client');
            select.innerHTML = '<option value="">Select a client</option>';
            result.data.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = client.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error fetching clients:', error);
        showError('Failed to fetch clients');
    }
}

async function fetchProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/product.php`);
        const result = await response.json();
        
        if (result.status === 'success') {
            const select = document.getElementById('product');
            select.innerHTML = '<option value="">Select a product</option>';
            result.data.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (Available: ${product.quantity}kg)`;
                option.dataset.availableQuantity = product.quantity;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error fetching products:', error);
        showError('Failed to fetch products');
    }
}

async function fetchSales() {
    try {
        // Get date filter values
        const fromDate = document.getElementById('fromDate')?.value;
        const toDate = document.getElementById('toDate')?.value;
        
        // Build URL with date filters
        let url = `${API_BASE_URL}/sale.php`;
        if (fromDate || toDate) {
            const params = new URLSearchParams();
            if (fromDate) params.append('from', fromDate);
            if (toDate) params.append('to', toDate);
            url += `?${params.toString()}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('API Response:', result);

        if (result.status === 'success' && Array.isArray(result.data)) {
            // Ensure each sale has client_name and product_name
            sales = result.data.map(sale => {
                if (!sale.client_name && sale.client_id) {
                    const clientSelect = document.getElementById('client');
                    const clientOption = Array.from(clientSelect.options).find(opt => opt.value === sale.client_id.toString());
                    sale.client_name = clientOption ? clientOption.textContent : 'Unknown Client';
                }
                if (!sale.product_name && sale.product_id) {
                    const productSelect = document.getElementById('product');
                    const productOption = Array.from(productSelect.options).find(opt => opt.value === sale.product_id.toString());
                    sale.product_name = productOption ? productOption.textContent.split(' (')[0] : 'Unknown Product';
                }
                return sale;
            });
            
            renderSales();
            
            // Toggle empty state
            const tableContainer = document.querySelector('.table-responsive');
            const emptyState = document.getElementById('emptyState');
            if (sales.length > 0) {
                if (tableContainer) tableContainer.style.display = 'block';
                if (emptyState) emptyState.style.display = 'none';
            } else {
                if (tableContainer) tableContainer.style.display = 'none';
                if (emptyState) emptyState.style.display = 'block';
            }
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error fetching sales:', error);
        showError('Failed to fetch sales');
    }
}

function renderSales() {
    const tableBody = document.getElementById('salesTableBody');
    const emptyState = document.getElementById('emptyState');
    const tableContainer = document.querySelector('.table-responsive');

    // Clear any existing content
    if (tableBody) tableBody.innerHTML = '';

    // Debug log to check sales data
    console.log('Sales data:', sales);

    if (!Array.isArray(sales) || sales.length === 0) {
        console.log('No sales data, showing empty state');
        if (tableContainer) tableContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    console.log('Displaying sales data in table');
    if (tableContainer) tableContainer.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    
    const rows = sales.map(sale => {
        if (!sale) return '';
        return `
            <tr>
                <td>${sale.client_name || 'Unknown'}</td>
                <td>${sale.product_name || 'Unknown'}</td>
                <td>${parseFloat(sale.quantity || 0).toFixed(1)}</td>
                <td>₹ ${parseFloat(sale.price_per_kg || 0).toFixed(2)}</td>
                <td>₹ ${parseFloat(sale.total_price || 0).toFixed(2)}</td>
                <td>${sale.packing || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick='handleEdit(${JSON.stringify(sale).replace(/'/g, "&#39;")})'>
                            Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="handleDelete(${sale.id})">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).filter(row => row !== '');

    if (tableBody) {
        tableBody.innerHTML = rows.join('');
        console.log('Table updated with', rows.length, 'rows');
    }
}

function handleAddSale() {
    isEditMode = false;
    document.getElementById('saleForm').reset();
    document.getElementById('totalPrice').textContent = '₹ 0.00';
    
    // Reset calculated values
    document.getElementById('weightValue').value = '0.00';
    document.getElementById('perDozen').value = '0.00';
    document.getElementById('boxPrice').value = '0.00';
    
    // Reset to loose type by default
    document.getElementById('typeLoose').checked = true;
    handleProductTypeChange({ target: { value: 'loose' } });
    
    saleModal.show();
}

function handleEdit(sale) {
    isEditMode = true;
    document.getElementById('client').value = sale.client_id;
    document.getElementById('product').value = sale.product_id;
    document.getElementById('packing').value = sale.packing || '';

    // Set product type
    const productType = sale.product_type || 'loose';
    document.getElementById(productType === 'ready' ? 'typeReady' : 'typeLoose').checked = true;

    if (productType === 'ready') {
        document.getElementById('dozenQuantity').value = sale.dozen_quantity;
        document.getElementById('gramsPerDozen').value = 300; // Fixed at 300 grams per dozen
        document.getElementById('pricePerGram').value = sale.price_per_gram;
        document.getElementById('pricePerCarton').value = sale.price_per_carton;
        calculateReadyTotalPrice();
    } else {
        document.getElementById('quantity').value = sale.quantity;
        document.getElementById('pricePerKg').value = sale.price_per_kg;
        calculateLooseTotalPrice();
    }

    handleProductTypeChange({ target: { value: productType } });
    saleModal.show();
}

function validateQuantity(quantity, productId) {
    const productSelect = document.getElementById('product');
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const availableQuantity = parseFloat(selectedOption.dataset.availableQuantity);
    
    if (quantity > availableQuantity) {
        showError(`Cannot sell more than available quantity (${availableQuantity}kg)`);
        return false;
    }
    return true;
}

async function handleSubmit() {
    const form = document.getElementById('saleForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const clientSelect = document.getElementById('client');
    const productSelect = document.getElementById('product');
    const productType = document.querySelector('input[name="productType"]:checked').value;

    let saleData;
    if (productType === 'ready') {
        const readyCalc = calculateReadyTotalPrice();
        saleData = {
            quantity: readyCalc.quantity,
            price_per_kg: readyCalc.pricePerKg,
            total_price: readyCalc.totalPrice,
            product_type: 'ready',
            dozen_quantity: parseFloat(document.getElementById('dozenQuantity').value),
            grams_per_dozen: 300, // Fixed at 300 grams per dozen
            price_per_gram: parseFloat(document.getElementById('pricePerGram').value),
            price_per_carton: parseFloat(document.getElementById('pricePerCarton').value)
        };
    } else {
        saleData = {
            quantity: parseFloat(document.getElementById('quantity').value),
            price_per_kg: parseFloat(document.getElementById('pricePerKg').value),
            total_price: parseFloat(document.getElementById('totalPrice').textContent.replace('₹ ', '')),
            product_type: 'loose'
        };
    }

    const formData = {
        client_id: clientSelect.value,
        client_name: clientSelect.options[clientSelect.selectedIndex].text,
        product_id: productSelect.value,
        product_name: productSelect.options[productSelect.selectedIndex].text.split(' (')[0],
        ...saleData,
        packing: document.getElementById('packing').value
    };

    if (!validateQuantity(formData.quantity, formData.product_id)) {
        return;
    }

    const saveButton = document.getElementById('saveSaleBtn');
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    try {
        const method = isEditMode ? 'PUT' : 'POST';
        const response = await fetch(`${API_BASE_URL}/sale.php`, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            saleModal.hide();
            form.reset();
            await Promise.all([fetchSales(), fetchProducts()]);
            showSuccess('Sale saved successfully');
        } else {
            showError(result.message || 'Failed to save sale');
        }
    } catch (error) {
        console.error('Error saving sale:', error);
        showError('Failed to save sale');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Save';
    }
}

async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this sale?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/sale.php?id=${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            await Promise.all([fetchSales(), fetchProducts()]);
            showSuccess('Sale deleted successfully');
        } else {
            showError(result.message || 'Failed to delete sale');
        }
    } catch (error) {
        console.error('Error deleting sale:', error);
        showError('Failed to delete sale');
    }
}

function showSuccess(message) {
    alert(message);
}

function showError(message) {
    alert(message);
}
