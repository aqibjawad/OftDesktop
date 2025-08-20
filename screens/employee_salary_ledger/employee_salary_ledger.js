const API_BASE_URL = 'https://oftbrothers.com/backend/api';
const SALARY_URL = `${API_BASE_URL}/salaries.php`;
const BANK_URL = `${API_BASE_URL}/bank.php`;
const EMPLOYEE_URL = `${API_BASE_URL}/employee.php`;

// Get employee ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const employeeId = urlParams.get('id');
const employeeName = decodeURIComponent(urlParams.get('name') || '');

// Store employee data
let currentEmployee = null;

// Update page title with employee name
document.title = `${employeeName} - Salary Ledger`;

// Initialize filters
let currentFilters = {
    bankId: null,
    status: null,
    startDate: null,
    endDate: null
};

document.addEventListener('DOMContentLoaded', function() {
    // Set up PDF download button
    document.getElementById('downloadPdfBtn').addEventListener('click', handleDownloadPdf);
    // Set up back button
    document.getElementById('backButton').addEventListener('click', () => {
        window.location.href = '../employee/employee.html';
    });

    // Set up filter listeners
    document.getElementById('startDate').addEventListener('change', handleFilterChange);
    document.getElementById('endDate').addEventListener('change', handleFilterChange);
    
    document.getElementById('statusFilterMenu').addEventListener('click', (e) => {
        if (e.target.classList.contains('dropdown-item')) {
            e.preventDefault();
            const status = e.target.dataset.status;
            document.getElementById('statusFilter').textContent = 
                status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1);
            currentFilters.status = status === 'all' ? null : status;
            fetchSalaryData();
        }
    });

    // Fetch initial data
    fetchBanks();
    fetchSalaryData();
});

async function fetchBanks() {
    try {
        const response = await fetch(BANK_URL);
        const result = await response.json();
        
        if (result.status === 'success') {
            const menu = document.getElementById('bankFilterMenu');
            menu.innerHTML = '<li><a class="dropdown-item" href="#" data-bank-id="all">All Banks</a></li>';
            
            result.data.forEach(bank => {
                const item = document.createElement('li');
                item.innerHTML = `<a class="dropdown-item" href="#" data-bank-id="${bank.id}">${bank.bank_name}</a>`;
                menu.appendChild(item);
            });

            menu.addEventListener('click', (e) => {
                if (e.target.classList.contains('dropdown-item')) {
                    e.preventDefault();
                    const bankId = e.target.dataset.bankId;
                    document.getElementById('bankFilter').textContent = e.target.textContent;
                    currentFilters.bankId = bankId === 'all' ? null : bankId;
                    fetchSalaryData();
                }
            });
        }
    } catch (error) {
        console.error('Error fetching banks:', error);
        showError('Failed to load banks');
    }
}

function handleFilterChange() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    currentFilters.startDate = startDate ? `${startDate}-01` : null;
    currentFilters.endDate = endDate ? `${endDate}-31` : null;
    
    fetchSalaryData();
}

async function fetchSalaryData() {
    toggleLoading(true);
    try {
        // Fetch salary data
        let salaryUrl = `${SALARY_URL}?employee_id=${employeeId}`;
        
        if (currentFilters.bankId) salaryUrl += `&bank_id=${currentFilters.bankId}`;
        if (currentFilters.status) salaryUrl += `&status=${currentFilters.status}`;
        if (currentFilters.startDate) salaryUrl += `&start_date=${currentFilters.startDate}`;
        if (currentFilters.endDate) salaryUrl += `&end_date=${currentFilters.endDate}`;
        
        const [salaryResponse, employeeResponse] = await Promise.all([
            fetch(salaryUrl),
            fetch(`${EMPLOYEE_URL}?id=${employeeId}`)
        ]);

        const [salaryResult, employeeResult] = await Promise.all([
            salaryResponse.json(),
            employeeResponse.json()
        ]);
        
        if (salaryResult.status === 'success' && employeeResult.status === 'success') {
            currentEmployee = employeeResult.data.find(emp => emp.id === parseInt(employeeId));
            updateSummary(salaryResult.summary, currentEmployee?.salary || 0);
            renderSalaryTable(salaryResult.data);
        } else {
            throw new Error(salaryResult.message || employeeResult.message || 'Failed to fetch data');
        }
    } catch (error) {
        console.error('Error fetching salary data:', error);
        showError('Failed to load salary data');
    } finally {
        toggleLoading(false);
    }
}

function updateSummary(summary, employeeSalary) {
    document.getElementById('totalPaid').textContent = `PKR ${formatCurrency(summary.total_paid)}`;
    document.getElementById('totalPending').textContent = `PKR ${formatCurrency(summary.total_pending)}`;
    
    // Show employee's total salary from employee data
    document.getElementById('totalSalary').textContent = `PKR ${formatCurrency(employeeSalary)}`;
    
    // Calculate remaining balance (total salary - paid amount)
    const remainingBalance = Math.max(0, employeeSalary - parseFloat(summary.total_paid));
    document.getElementById('remainingBalance').textContent = `PKR ${formatCurrency(remainingBalance)}`;
}

function renderSalaryTable(salaries) {
    const tableBody = document.getElementById('salaryTableBody');
    const emptyState = document.getElementById('emptyState');

    if (!salaries || salaries.length === 0) {
        tableBody.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
    }
    
    emptyState.classList.add('d-none');
    const baseSalary = currentEmployee?.salary || 0;
    
    tableBody.innerHTML = salaries.map(salary => `
        <tr>
            <td>${formatDate(salary.payment_date) || formatDate(salary.month)}</td>
            <td>${salary.bank_name}</td>
            <td>PKR ${formatCurrency(baseSalary)}</td>
            <td>PKR ${formatCurrency(salary.amount)}</td>
            <td>${salary.payment_date ? formatDate(salary.payment_date) : '-'}</td>
            <td><span class="badge ${salary.status === 'paid' ? 'bg-success' : 'bg-warning'}">${salary.status}</span></td>
            <td>${salary.notes || '-'}</td>
        </tr>
    `).join('');
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
    });
}

function formatCurrency(amount) {
    return `PKR ${parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function toggleLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.remove('d-none');
    } else {
        spinner.classList.add('d-none');
    }
}

function showError(message) {
    alert(message);
}

async function handleDownloadPdf() {
    try {
        const downloadBtn = document.getElementById('downloadPdfBtn');
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Generating PDF...
        `;
        downloadBtn.disabled = true;

        // Fetch salary data with current filters
        let url = `${SALARY_URL}?employee_id=${employeeId}`;
        
        if (currentFilters.bankId) url += `&bank_id=${currentFilters.bankId}`;
        if (currentFilters.status) url += `&status=${currentFilters.status}`;
        if (currentFilters.startDate) url += `&start_date=${currentFilters.startDate}`;
        if (currentFilters.endDate) url += `&end_date=${currentFilters.endDate}`;

        const response = await fetch(url);
        const result = await response.json();

        if (result.status === 'success') {
            // Create PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Add title
            doc.setFontSize(18);
            doc.text('Salary Ledger', 105, 15, { align: 'center' });
            
            // Add employee name
            doc.setFontSize(14);
            doc.text(employeeName, 105, 25, { align: 'center' });
            
            // Add generation date
            doc.setFontSize(10);
            doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 32, { align: 'center' });

            // Add filters if any
            let yPos = 45;
            if (currentFilters.bankId || currentFilters.status || currentFilters.startDate || currentFilters.endDate) {
                doc.setFontSize(11);
                doc.text('Applied Filters:', 14, yPos);
                yPos += 7;
                doc.setFontSize(10);

                if (currentFilters.bankId) {
                    const bankName = document.getElementById('bankFilter').textContent;
                    doc.text(`Bank: ${bankName}`, 14, yPos);
                    yPos += 5;
                }
                if (currentFilters.status) {
                    const status = document.getElementById('statusFilter').textContent;
                    doc.text(`Status: ${status}`, 14, yPos);
                    yPos += 5;
                }
                if (currentFilters.startDate) {
                    doc.text(`From: ${formatDate(currentFilters.startDate)}`, 14, yPos);
                    yPos += 5;
                }
                if (currentFilters.endDate) {
                    doc.text(`To: ${formatDate(currentFilters.endDate)}`, 14, yPos);
                    yPos += 5;
                }
                yPos += 5;
            }

            // Add summary
            doc.setFontSize(12);
            doc.text('Summary', 14, yPos);
            yPos += 7;
            doc.setFontSize(10);
            doc.text(`Total Paid: ${formatCurrency(result.summary.total_paid)}`, 14, yPos);
            yPos += 5;
            doc.text(`Total Pending: ${formatCurrency(result.summary.total_pending)}`, 14, yPos);
            yPos += 5;
            doc.text(`Total Entries: ${result.data.length}`, 14, yPos);
            yPos += 10;

            // Add salary table
            doc.autoTable({
                startY: yPos,
                head: [['Month', 'Bank', 'Amount', 'Payment Date', 'Status', 'Notes']],
                body: result.data.map(salary => [
                    formatDate(salary.month),
                    salary.bank_name,
                    formatCurrency(salary.amount),
                    salary.payment_date ? new Date(salary.payment_date).toLocaleDateString() : '-',
                    salary.status.charAt(0).toUpperCase() + salary.status.slice(1),
                    salary.notes || '-'
                ]),
                styles: { fontSize: 9 },
                headStyles: { fillColor: [41, 128, 185] },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 20 },
                    5: { cellWidth: 'auto' }
                }
            });

            // Save the PDF
            const filename = `salary_ledger_${employeeId}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
        } else {
            throw new Error(result.message || 'Failed to generate PDF');
        }
    } catch (error) {
        console.error('Error generating PDF:', error);
        showError('Failed to generate PDF. Please try again.');
    } finally {
        const downloadBtn = document.getElementById('downloadPdfBtn');
        downloadBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-pdf me-2" viewBox="0 0 16 16">
                <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                <path d="M4.603 12.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.701 19.701 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.187-.012.395-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.065.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.716 5.716 0 0 1-.911-.95 11.642 11.642 0 0 0-1.997.406 11.311 11.311 0 0 1-1.021 1.51c-.29.35-.608.655-.926.787a.793.793 0 0 1-.58.029zm1.379-1.901c-.166.076-.32.156-.459.238-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361.01.022.02.036.026.044a.27.27 0 0 0 .035-.012c.137-.056.355-.235.635-.572a8.18 8.18 0 0 0 .45-.606zm1.64-1.33a12.647 12.647 0 0 1 1.01-.193 11.666 11.666 0 0 1-.51-.858 20.741 20.741 0 0 1-.5 1.05zm2.446.45c.15.162.296.3.435.41.24.19.407.253.498.256a.107.107 0 0 0 .07-.015.307.307 0 0 0 .094-.125.436.436 0 0 0 .059-.2.095.095 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a3.881 3.881 0 0 0-.612-.053zM8.078 5.8a6.7 6.7 0 0 0 .2-.828c.031-.188.043-.343.038-.465a.613.613 0 0 0-.032-.198.517.517 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.046.822.024.111.054.227.09.346z"/>
            </svg>
            Download PDF
        `;
        downloadBtn.disabled = false;
    }
}
