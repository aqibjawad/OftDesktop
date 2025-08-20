const API_BASE_URL = 'https://oftbrothers.com/backend/api/';

document.addEventListener('DOMContentLoaded', function () {
    setupWindowControls();
    // Read query params
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const date = urlParams.get('date');
    const category = urlParams.get('category');

    // Update title if category is provided
    if (category) {
        document.querySelector('h2').textContent = `Expense Details - ${category}`;
    }

    if (date) {
        document.getElementById('filter-from').value = date;
        document.getElementById('filter-to').value = date;
    }
    fetchDetails(id, date, category);
    document.getElementById('filter-btn').onclick = () => fetchDetails();
    document.getElementById('download-pdf-btn').onclick = downloadPDF;
});

function fetchDetails(id, date, category) {
    let url = `${API_BASE_URL}/expense_details.php`;
    const from = document.getElementById('filter-from').value;
    const to = document.getElementById('filter-to').value;
    let params = [];
    if (id) params.push(`id=${id}`);
    else if (from && to) params.push(`from=${from}&to=${to}`);
    else if (date) params.push(`date=${date}`);
    if (params.length) url += '?' + params.join('&');
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if ((data.status && data.status === 'success') || (data.success === true)) {
                // Filter by category if provided
                let filteredData = category 
                    ? data.data.filter(exp => exp.category_name === category)
                    : data.data;
                renderTable(filteredData, id);

                // Update total amount if category is provided
                if (category) {
                    const total = filteredData.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
                    document.querySelector('h2').textContent = 
                        `Expense Details - ${category} (Total: ${total.toFixed(2)})`;
                }
            } else {
                renderTable([], id);
            }
        })
        .catch(() => renderTable([], id));
} 

function renderTable(expenses, highlightId) {
    const container = document.getElementById('expense-details-table');
    
    if (!expenses.length) {
        container.innerHTML = `
            <div class="alert alert-info text-center">
                <span class="material-icons">info</span>
                No expenses found for selected date(s).
            </div>`;
        return;
    }

    // If single expense, show its details at the top
    if (highlightId && expenses.length === 1) {
        const exp = expenses[0];
        container.innerHTML = `
            <div class="card mb-4">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0">Expense Details #${exp.id}</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Date:</strong> ${exp.date}</p>
                            <p><strong>Category:</strong> ${exp.category_name}</p>
                            <p><strong>Bank:</strong> ${exp.bank_name}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Amount:</strong> ${exp.amount}</p>
                            <p><strong>Description:</strong> ${exp.description || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    // Render the table
    let tableHtml = `
        <table class="table table-striped table-hover">
            <thead class="table-light">
                <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Bank</th>
                    <th>Amount</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>`;

    expenses.forEach(exp => {
        const highlight = highlightId && String(exp.id) === String(highlightId) ? 'table-warning' : '';
        tableHtml += `
            <tr class="${highlight}">
                <td>${exp.id}</td>
                <td>${exp.date}</td>
                <td>${exp.category_name}</td>
                <td>${exp.bank_name}</td>
                <td>${parseFloat(exp.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>${exp.description || '-'}</td>
            </tr>`;
    });

    tableHtml += '</tbody></table>';
    container.innerHTML += tableHtml;
}

async function downloadPDF() {
    try {
        const downloadBtn = document.getElementById('download-pdf-btn');
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<span class="material-icons">hourglass_top</span> Generating PDF...';
        downloadBtn.disabled = true;

        // Get dates and category
        const from = document.getElementById('filter-from').value;
        const to = document.getElementById('filter-to').value;
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');

        // Create a container for the PDF content
        const pdfContainer = document.createElement('div');
        pdfContainer.className = 'pdf-container p-4';

        // Add header
        const header = document.createElement('div');
        header.className = 'text-center mb-4';
        header.innerHTML = `
            <h2>Expense Report</h2>
            <p class="mb-1">Date Range: ${from || 'All'} to ${to || 'All'}</p>
            ${category ? `<p class="mb-1">Category: ${category}</p>` : ''}
        `;
        pdfContainer.appendChild(header);

        // Clone the table and remove any action buttons
        const table = document.querySelector('.table').cloneNode(true);
        table.classList.add('table-bordered');
        pdfContainer.appendChild(table);

        // Calculate and add total
        const expenses = Array.from(table.querySelectorAll('tbody tr')).map(row => {
            return parseFloat(row.cells[4].textContent.replace(/,/g, ''));
        });
        const total = expenses.reduce((sum, amount) => sum + amount, 0);
        
        const totalRow = document.createElement('div');
        totalRow.className = 'text-end mt-3';
        totalRow.innerHTML = `<strong>Total Amount: ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>`;
        pdfContainer.appendChild(totalRow);

        // Generate PDF
        const opt = {
            margin: 1,
            filename: `expense_report_${from || 'all'}_to_${to || 'all'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        // Add the container to the document temporarily
        document.body.appendChild(pdfContainer);
        
        // Generate and download PDF
        await html2pdf().set(opt).from(pdfContainer).save();
        
        // Clean up
        document.body.removeChild(pdfContainer);

        downloadBtn.innerHTML = '<span class="material-icons">check_circle</span> Downloaded!';
        setTimeout(() => {
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
        }, 2000);
    } catch (error) {
        console.error('Download error:', error);
        alert('Failed to generate PDF. Please try again.');
        const downloadBtn = document.getElementById('download-pdf-btn');
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
    }
}

function setupWindowControls() {
    // You may want to copy this from your other screens for minimize/maximize/close
}
