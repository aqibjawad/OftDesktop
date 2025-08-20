const API_BASE_URL = 'https://oftbrothers.com/backend/api';
const API_URL = `${API_BASE_URL}/employee.php`;

// Bootstrap Modal instance
let employeeModal;
let isEditMode = false;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap modal
    employeeModal = new bootstrap.Modal(document.getElementById('employeeModal'));
    
    // Add event listeners
    document.getElementById('addEmployeeBtn').addEventListener('click', handleAddEmployee);
    document.getElementById('saveEmployeeBtn').addEventListener('click', handleSubmit);
    document.getElementById('backToHome').addEventListener('click', () => {
        window.location.href = '../home/home.html';
    });
    
    // Fetch employees on load
    fetchEmployees();
});

// Fetch all employees
async function fetchEmployees() {
    toggleLoading(true);
    try {
        const response = await fetch(API_URL);
        const result = await response.json();

        if (result.status === 'success') {
            renderEmployees(result.data);
        } else {
            showError(result.message || 'Failed to fetch employees');
        }
    } catch (error) {
        showError('Network error. Please check your connection.');
        console.error(error);
    } finally {
        toggleLoading(false);
    }
}

// Render employee cards
function renderEmployees(employees) {
    const employeeList = document.getElementById('employeeList');
    const emptyState = document.getElementById('emptyState');

    if (employees.length === 0) {
        employeeList.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
    }

    emptyState.classList.add('d-none');
    employeeList.innerHTML = employees.map(employee => `
        <div class="col-md-6 col-lg-4">
            <div class="employee-card">
                <div class="employee-info">
                    <h3 class="employee-name">${employee.name}</h3>
                    <div class="employee-details">💰 $${employee.salary}</div>
                    ${employee.phone ? `<div class="employee-details">📞 ${employee.phone}</div>` : ''}
                    ${employee.designation ? `<div class="employee-designation">${employee.designation}</div>` : ''}
                </div>
                <div class="action-buttons">
                    <button class="btn btn-info" onclick="handleViewLedger(${employee.id}, '${employee.name.replace(/'/g, "&#39;")}')">
                        View Ledger
                    </button>
                    <button class="btn btn-edit" onclick='handleEdit(${JSON.stringify(employee).replace(/'/g, "&#39;")})'>
                        Edit
                    </button>
                    <button class="btn btn-delete" onclick="handleDelete(${employee.id})">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Handle add employee button click
function handleAddEmployee() {
    isEditMode = false;
    document.getElementById('modalTitle').textContent = 'Add New Employee';
    document.getElementById('employeeForm').reset();
    employeeModal.show();
}

// Handle edit employee button click
function handleEdit(employee) {
    isEditMode = true;
    document.getElementById('modalTitle').textContent = 'Edit Employee';
    
    // Fill form with employee data
    document.getElementById('employeeId').value = employee.id;
    document.getElementById('name').value = employee.name;
    document.getElementById('salary').value = employee.salary || '';
    document.getElementById('phone').value = employee.phone || '';
    document.getElementById('designation').value = employee.designation || '';
    
    employeeModal.show();
}

// Handle form submission
async function handleSubmit() {
    const form = document.getElementById('employeeForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = {
        name: document.getElementById('name').value,
        salary: document.getElementById('salary').value,
        phone: document.getElementById('phone').value,
        designation: document.getElementById('designation').value
    };

    if (isEditMode) {
        formData.id = document.getElementById('employeeId').value;
    }

    toggleLoading(true);
    try {
        const method = isEditMode ? 'PUT' : 'POST';
        const response = await fetch(API_URL, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.status === 'success') {
            showSuccess(result.message);
            employeeModal.hide();
            fetchEmployees();
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

// Handle delete employee
function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this employee?')) {
        return;
    }

    toggleLoading(true);
    fetch(API_URL, {
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
            fetchEmployees();
        } else {
            showError(result.message || 'Failed to delete employee');
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
    alert(message);
}

// Handle view ledger button click
function handleViewLedger(employeeId, employeeName) {
    window.location.href = `../employee_salary_ledger/employee_salary_ledger.html?id=${employeeId}&name=${encodeURIComponent(employeeName)}`;
}
