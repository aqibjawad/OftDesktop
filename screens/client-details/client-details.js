const BASE_URL = "https://oftbrothers.com/backend/api";
let salesData = [];
let clientDetails = null;

document.addEventListener('DOMContentLoaded', () => {
    const clientId = localStorage.getItem('selectedClientId');
    if (!clientId) {
        showError("No client selected");
        return;
    }

    setupEventListeners();
    fetchClientSalesDetails(clientId);
});

function setupEventListeners() {
    document.getElementById('filterBtn').addEventListener('click', handleDateFilter);
    document.getElementById('downloadPdfBtn').addEventListener('click', generatePDF);
    document.getElementById('updateSaleBtn').addEventListener('click', handleSaleUpdate);

    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    document.getElementById('startDate').value = formatDate(startDate);
    document.getElementById('endDate').value = formatDate(endDate);

    // Load products and payment history
    loadProducts();
    loadPaymentHistory();
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

async function fetchClientSalesDetails(clientId, startDate = null, endDate = null) {
    showLoading(true);
    hideError();

    try {
        console.log('Fetching client sales details for ID:', clientId);
        let url = `${BASE_URL}/client.php?action=client_sales&client_id=${clientId}`;
        if (startDate && endDate) {
            url += `&start_date=${startDate}&end_date=${endDate}`;
        }

        const response = await fetch(url);
        const data = await response.json();
        console.log('Client sales details response:', data);

        if (data.success) {
            clientDetails = data.client_details;
            salesData = data.sales_data || [];
            updateUI();
        } else {
            showError(data.message || "Failed to fetch sales details");
        }
    } catch (error) {
        console.error(error);
        showError("Network error. Please check your connection.");
    } finally {
        showLoading(false);
    }
}

async function updateUI() {
    // Update client details
    document.getElementById('clientName').textContent = clientDetails.name;
    document.getElementById('firmName').textContent = clientDetails.firm_name || 'N/A';
    document.getElementById('contact').textContent = clientDetails.contact || 'N/A';
    
    const totalSales = calculateTotalSales();
    document.getElementById('totalSales').textContent = formatCurrency(totalSales);

    // Get total received amount
    try {
        const clientId = localStorage.getItem('selectedClientId');
        console.log('Fetching receives for client ID:', clientId);
        const response = await fetch(`${BASE_URL}/receives.php?client_id=${clientId}`);
        const data = await response.json();
        console.log('Receives data:', data);
        
        if (data.success) {
            // Calculate total received by summing up all receives
            const totalReceived = data.data.reduce((sum, receive) => sum + parseFloat(receive.amount), 0);
            const remainingBalance = totalSales - totalReceived;
            console.log('Total received:', totalReceived);
            console.log('Total sales:', totalSales);
            console.log('Remaining balance:', remainingBalance);
            
            document.getElementById('totalReceived').textContent = formatCurrency(totalReceived);
            document.getElementById('remainingBalance').textContent = formatCurrency(remainingBalance);
        }
    } catch (error) {
        console.error('Error fetching total received:', error);
        document.getElementById('totalReceived').textContent = 'Error';
        document.getElementById('remainingBalance').textContent = 'Error';
    }

    // Show/hide containers
    document.getElementById('clientDetails').style.display = 'block';
    document.getElementById('downloadPdfBtn').disabled = salesData.length === 0;

    if (salesData.length === 0) {
        document.getElementById('salesTableContainer').style.display = 'none';
        document.getElementById('noDataContainer').style.display = 'flex';
    } else {
        document.getElementById('salesTableContainer').style.display = 'block';
        document.getElementById('noDataContainer').style.display = 'none';
        renderSalesTable();
    }
}

function calculateTotalSales() {
    return salesData.reduce((sum, sale) => sum + parseFloat(sale.total_price || 0), 0);
}

function formatCurrency(amount) {
    return `$${parseFloat(amount).toFixed(2)}`;
}

function renderSalesTable() {
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = '';

    salesData.forEach(sale => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sale.sale_id}</td>
            <td>${sale.product_name}</td>
            <td>${sale.quantity}</td>
            <td>${formatCurrency(sale.price_per_kg)}</td>
            <td>${formatCurrency(sale.total_price)}</td>
            <td>${sale.sale_date}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editSale(${sale.sale_id})">
                    <span class="material-icons">edit</span>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function handleDateFilter() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        showError("Please select both start and end dates");
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        showError("Start date cannot be after end date");
        return;
    }

    const clientId = localStorage.getItem('selectedClientId');
    fetchClientSalesDetails(clientId, startDate, endDate);
}

async function generatePDF() {
    const { jsPDF } = window.jspdf;
    try {
        showLoading(true);

        const doc = new jsPDF();
        const clientName = clientDetails.name;
        const firmName = clientDetails.firm_name || 'N/A';
        
        // Check which tab is active
        const isPaymentTab = document.querySelector('#payments.active') !== null;
        const title = isPaymentTab ? 'Payment History' : 'Sales Report';

        // Add title
        doc.setFontSize(18);
        doc.text(title, 105, 15, { align: 'center' });

        // Add client details
        doc.setFontSize(12);
        doc.text(`Client: ${clientName}`, 20, 30);
        doc.text(`Firm: ${firmName}`, 20, 37);

        if (!isPaymentTab) {
            // Sales Report
            // Add date range
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            doc.text(`Period: ${startDate} to ${endDate}`, 20, 44);

            // Add total amounts
            const totalSales = document.getElementById('totalSales').textContent;
            doc.text(`Total Sales: ${totalSales}`, 20, 51);

            // Add table headers
            const headers = ['Date', 'Product', 'Quantity', 'Price/Kg', 'Total'];
            const data = salesData.map(sale => [
                new Date(sale.sale_date).toLocaleDateString(),
                sale.product_name,
                sale.quantity,
                sale.price_per_kg,
                sale.total_price
            ]);

            // Generate table
            doc.autoTable({
                startY: 60,
                head: [headers],
                body: data,
                theme: 'grid'
            });

            // Save the PDF
            doc.save(`${clientName}_sales_report.pdf`);
        } else {
            // Payment History
            // Add total amounts
            const totalReceived = document.getElementById('totalReceived').textContent;
            doc.text(`Total Received: ${totalReceived}`, 20, 44);

            // Get payment data from the table
            const paymentRows = Array.from(document.getElementById('paymentsTableBody').getElementsByTagName('tr'));
            const headers = ['Date', 'Bank', 'Amount', 'Description'];
            const data = paymentRows.map(row => {
                const cells = Array.from(row.getElementsByTagName('td'));
                return cells.map(cell => cell.textContent);
            });

            // Generate table
            doc.autoTable({
                startY: 55,
                head: [headers],
                body: data,
                theme: 'grid'
            });

            // Save the PDF
            doc.save(`${clientName}_payment_history.pdf`);
        }
    } catch (error) {
        console.error('Error generating PDF:', error);
        showError('Error generating PDF');
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    document.getElementById('loadingContainer').style.display = show ? 'flex' : 'none';
    if (show) {
        document.getElementById('salesTableContainer').style.display = 'none';
        document.getElementById('noDataContainer').style.display = 'none';
        document.getElementById('clientDetails').style.display = 'none';
    }
}

function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    const errorText = document.getElementById('errorText');
    errorText.textContent = message;
    errorContainer.style.display = 'block';
}

function hideError() {
    document.getElementById('errorContainer').style.display = 'none';
}

// Load products for dropdown
async function loadProducts() {
    try {
        const response = await fetch(`${BASE_URL}/product.php`);
        const data = await response.json();

        if (data.success) {
            const productSelect = document.getElementById('productSelect');
            productSelect.innerHTML = data.data.map(product =>
                `<option value="${product.id}">${product.name}</option>`
            ).join('');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showError('Error loading products');
    }
}



// Load payment history
async function loadPaymentHistory() {
    try {
        const clientId = localStorage.getItem('selectedClientId');
        const response = await fetch(`${BASE_URL}/receives.php?client_id=${clientId}`);
        const data = await response.json();

        if (data.success) {
            const tbody = document.getElementById('paymentsTableBody');
            
            tbody.innerHTML = data.data.map(receive => `
                <tr>
                    <td>${new Date(receive.created_at).toLocaleDateString()}</td>
                    <td>${receive.bank_name}</td>
                    <td>${formatCurrency(receive.amount)}</td>
                    <td>${receive.description || 'N/A'}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading payment history:', error);
        showError('Error loading payment history');
    }
}

// Edit sale
function editSale(saleId) {
    const sale = salesData.find(s => s.sale_id == saleId);
    if (!sale) return;

    document.getElementById('saleId').value = sale.sale_id;
    document.getElementById('productSelect').value = sale.product_id;
    document.getElementById('quantity').value = sale.quantity;
    document.getElementById('pricePerKg').value = sale.price_per_kg;
    document.getElementById('packing').value = sale.packing || '';
    
    new bootstrap.Modal(document.getElementById('updateSaleModal')).show();
}

// Handle sale update
async function handleSaleUpdate() {
    const saleData = {
        id: document.getElementById('saleId').value,
        product_id: document.getElementById('productSelect').value,
        quantity: document.getElementById('quantity').value,
        price_per_kg: document.getElementById('pricePerKg').value,
        packing: document.getElementById('packing').value,
        client_id: localStorage.getItem('selectedClientId')
    };

    try {
        const response = await fetch(`${BASE_URL}/sales.php`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(saleData)
        });

        const data = await response.json();

        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('updateSaleModal')).hide();
            await fetchClientSalesDetails(localStorage.getItem('selectedClientId'));
            showError('Sale updated successfully');
        } else {
            showError(data.message || 'Error updating sale');
        }
    } catch (error) {
        console.error('Error updating sale:', error);
        showError('Error updating sale');
    }
}


