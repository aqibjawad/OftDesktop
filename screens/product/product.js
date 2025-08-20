const { API_BASE_URL } = require('../../config');
const PRODUCTS_API = `${API_BASE_URL}/product.php`;

let editingId = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    setupEventListeners();
});

function setupEventListeners() {
    const addButton = document.getElementById('addButton');
    addButton.addEventListener('click', handleAddProduct);

    const cancelDelete = document.getElementById('cancelDelete');
    cancelDelete.addEventListener('click', () => {
        document.getElementById('confirmModal').classList.remove('show');
    });
}

async function fetchProducts() {
    try {
        const response = await fetch(PRODUCTS_API);
        const data = await response.json();
        if (data.status === "success") {
            renderProducts(data.data);
        }
    } catch (error) {
        showError("Failed to fetch products");
    }
}

function renderProducts(products) {
    const container = document.getElementById('productsContainer');
    container.innerHTML = '';

    products.forEach(product => {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
            <div class="row-text" style="flex: 2">${product.name}</div>
            <div class="row-text" style="flex: 1">${product.weight}</div>
            <div class="row-text" style="flex: 1">${product.quantity}</div>
            <div class="actions-container" style="width: 100px">
                <button class="icon-button edit" onclick="handleEdit(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                    <span class="material-icons">edit</span>
                </button>
                <button class="icon-button delete" onclick="handleDelete(${product.id})">
                    <span class="material-icons">delete</span>
                </button>
            </div>
        `;
        container.appendChild(row);
    });
}

async function handleAddProduct() {
    const nameInput = document.getElementById('productName');
    const weightInput = document.getElementById('productWeight');
    const name = nameInput.value.trim();
    const weight = weightInput.value.trim();

    if (name && weight) {
        try {
            const weightValue = parseFloat(weight);

            if (isNaN(weightValue)) {
                showError("Weight must be a valid number");
                return;
            }

            const method = editingId ? "PUT" : "POST";
            const payload = editingId
                ? { id: editingId, name, weight: weightValue }
                : { name, weight: weightValue };

            const response = await fetch(PRODUCTS_API, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (result.status === "success") {
                fetchProducts();
                nameInput.value = "";
                weightInput.value = "";
                editingId = null;
                document.getElementById('addButton').textContent = "Add Product";
            } else {
                showError(result.message);
            }
        } catch (error) {
            showError("Failed to add/update product");
        }
    } else {
        showError("Please enter product name and weight");
    }
}

function handleEdit(product) {
    document.getElementById('productName').value = product.name;
    document.getElementById('productWeight').value = product.weight;
    editingId = product.id;
    document.getElementById('addButton').textContent = "Update Product";
}

function handleDelete(id) {
    const modal = document.getElementById('confirmModal');
    modal.classList.add('show');

    const confirmDelete = document.getElementById('confirmDelete');
    confirmDelete.onclick = async () => {
        try {
            const response = await fetch(PRODUCTS_API, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id })
            });

            const result = await response.json();
            if (result.status === "success") {
                fetchProducts();
            } else {
                showError(result.message);
            }
        } catch (error) {
            showError("Failed to delete product");
        }
        modal.classList.remove('show');
    };
}

function showError(message) {
    // You can implement a better error notification system here
    alert(message);
}
