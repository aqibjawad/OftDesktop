const { API_BASE_URL } = require('../../config');
const EMPLOYEE_URL = `${API_BASE_URL}/employee.php`;
const BANK_URL = `${API_BASE_URL}/bank.php`;
const API_URL = `${API_BASE_URL}/salaries.php`;

// Bootstrap Modal instance
let salaryModal = null;
let editingSalaryId = null;
let isEditMode = false;

document.addEventListener('DOMContentLoaded', function() {
    salaryModal = new bootstrap.Modal(document.getElementById('salaryModal'));
    
    // Add event listeners
    document.getElementById('addSalaryBtn').addEventListener('click', handleAddSalary);
    document.getElementById('saveSalaryBtn').addEventListener('click', handleSubmit);
    document.getElementById('backToHome').addEventListener('click', () => {
        window.location.href = '../home/home.html';
    });
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('month').value = today.substring(0, 7);
    document.getElementById('paymentDate').value = today;
    
    // Fetch initial data
    fetchEmployees();
    fetchBanks();
    fetchSalaries();
});

// Fetch all employees for the dropdown
async function fetchEmployees() {
    try {
        const response = await fetch(EMPLOYEE_URL);
        const result = await response.json();
        
        if (result.status === 'success') {
            const select = document.getElementById('employee');
            result.data.forEach(employee => {
                const option = document.createElement('option');
                option.value = employee.id;
                option.textContent = employee.name;
                select.appendChild(option);
            });
        } else {
            showError(result.message || 'Failed to fetch employees');
        }
    } catch (error) {
        showError('Network error while fetching employees');
        console.error(error);
    }
}

// Fetch all banks for the dropdown
async function fetchBanks() {
    try {
        const response = await fetch(BANK_URL);
        const result = await response.json();
        
        if (result.status === 'success') {
            const select = document.getElementById('bank');
            result.data.forEach(bank => {
                const option = document.createElement('option');
                option.value = bank.id;
                option.textContent = bank.bank_name;
                select.appendChild(option);
            });
        } else {
            showError(result.message || 'Failed to fetch banks');
        }
    } catch (error) {
        showError('Network error while fetching banks');
        console.error(error);
    }
}

// Fetch all salaries
async function fetchSalaries() {
    toggleLoading(true);
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get raw text first to check for any issues
        const text = await response.text();
        
        // Find the first complete JSON object by matching balanced braces
        let depth = 0;
        let startIndex = text.indexOf('{');
        let endIndex = -1;
        
        for (let i = startIndex; i < text.length; i++) {
            if (text[i] === '{') depth++;
            if (text[i] === '}') depth--;
            
            if (depth === 0) {
                endIndex = i + 1;
                break;
            }
        }
        
        // Extract the first complete JSON object
        const firstJsonResponse = text.substring(startIndex, endIndex);
        
        let result = JSON.parse(firstJsonResponse);
        
        if (result.status === 'success') {
            renderSalaries(result.data);
        } else {
            showError(result.message || 'Failed to fetch salaries');
        }
    } catch (error) {
        if (error.name === 'SyntaxError') {
            showError('Invalid JSON format from server');
        } else {
            showError('Network error while fetching salaries');
        }
        console.error('Error details:', error);
    } finally {
        toggleLoading(false);
    }
}

// Render salary table rows
function renderSalaries(salaries) {
    const container = document.getElementById('salaryList');
    const emptyState = document.getElementById('emptyState');
    
    if (!salaries || salaries.length === 0) {
        container.innerHTML = '<tr><td colspan="8" class="text-center">No salary entries found</td></tr>';
        emptyState.classList.remove('d-none');
        return;
    }
    
    emptyState.classList.add('d-none');
    container.innerHTML = salaries.map(salary => `
        <tr>
            <td>${salary.employee_name}</td>
            <td>${salary.bank_name}</td>
            <td>${salary.amount}</td>
            <td>${new Date(salary.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</td>
            <td>${new Date(salary.payment_date).toLocaleDateString()}</td>
            <td><span class="badge ${salary.status === 'paid' ? 'bg-success' : 'bg-warning'}">${salary.status}</span></td>
            <td>${salary.notes || '-'}</td>
        </tr>
    `).join('');
}
    


// Handle add salary button click
function handleAddSalary() {
    isEditMode = false;
    editingSalaryId = null;
    document.getElementById('modalTitle').textContent = 'Add New Salary Entry';
    document.getElementById('salaryForm').reset();
    
    // Set default values
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('month').value = today.substring(0, 7);
    document.getElementById('paymentDate').value = today;
    document.getElementById('status').value = 'pending';
    
    salaryModal.show();
}

// Handle edit salary button click
function handleEdit(salary) {
    isEditMode = true;
    document.getElementById('modalTitle').textContent = 'Edit Salary Entry';
    
    // Fill form with salary data
    document.getElementById('salaryId').value = salary.id;
    document.getElementById('employee').value = salary.employee_id;
    document.getElementById('bank').value = salary.bank_id;
    document.getElementById('amount').value = salary.amount;
    document.getElementById('month').value = salary.month.substring(0, 7);
    document.getElementById('paymentDate').value = salary.payment_date;
    document.getElementById('status').value = salary.status;
    document.getElementById('notes').value = salary.notes || '';
    
    salaryModal.show();
}

// Handle form submission
async function handleSubmit() {
    const form = document.getElementById('salaryForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = {
        employee_id: document.getElementById('employee').value,
        bank_id: document.getElementById('bank').value,
        amount: document.getElementById('amount').value,
        month: document.getElementById('month').value + '-01', // Add day for proper date format
        payment_date: document.getElementById('paymentDate').value,
        status: document.getElementById('status').value,
        notes: document.getElementById('notes').value
    };

    if (isEditMode) {
        formData.id = document.getElementById('salaryId').value;
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
            salaryModal.hide();
            fetchSalaries();
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

// Handle delete salary
function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this salary entry?')) {
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
            fetchSalaries();
        } else {
            showError(result.message || 'Failed to delete salary entry');
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
