const BASE_URL = "https://oftbrothers.com/backend/api/vendor.php";

// Helper function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Get vendor ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const vendorId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners
    document.getElementById('backButton').addEventListener('click', () => {
        window.location.href = '../vendor/vendor.html';
    });

    document.getElementById('downloadPdfBtn').addEventListener('click', generatePDF);

    // Fetch data
    if (vendorId) {
        fetchVendorDetails();
        fetchVendorPurchases();
        loadPaymentHistory();
    } else {
        alert('Vendor ID not provided');
        window.location.href = '../vendor/vendor.html';
    }
});

// Fetch vendor details
async function fetchVendorDetails() {
    toggleLoading(true);
    try {
        const response = await fetch(`${BASE_URL}?id=${vendorId}`);
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            displayVendorDetails(result.data[0]);
        } else {
            alert('Failed to fetch vendor details');
        }
    } catch (error) {
        console.error('Error fetching vendor details:', error);
        alert('Network error. Please check your connection.');
    } finally {
        toggleLoading(false);
    }
}

// Fetch vendor purchases
async function fetchVendorPurchases() {
    toggleLoading(true);
    try {
        const response = await fetch(`${BASE_URL}?vendor_purchases&vendor_id=${vendorId}`);
        const result = await response.json();

        if (result.success) {
            displayPurchases(result.data || []);
        } else {
            document.getElementById('purchaseTableBody').innerHTML = 
                '<tr><td colspan="6" class="text-center">No purchase history found</td></tr>';
        }
    } catch (error) {
        console.error('Error fetching purchases:', error);
        alert('Network error. Please check your connection.');
    } finally {
        toggleLoading(false);
    }
}

// Display vendor details
function displayVendorDetails(vendor) {
    document.querySelector('.vendor-name').textContent = vendor.name;
    document.getElementById('firmName').textContent = vendor.firm_name || 'N/A';
    document.getElementById('contact').textContent = vendor.contact || 'N/A';
    document.getElementById('openingBalance').textContent = vendor.opening_balance || '0';
    document.getElementById('address').textContent = vendor.address || 'N/A';
    
    const descContainer = document.getElementById('descriptionContainer');
    if (vendor.description) {
        document.getElementById('description').textContent = vendor.description;
    } else {
        descContainer.style.display = 'none';
    }
}

// Display purchases in table
function displayPurchases(purchases) {
    const tableBody = document.getElementById('purchaseTableBody');
    
    if (purchases.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No purchase history found</td></tr>';
        return;
    }

    tableBody.innerHTML = purchases.map((purchase, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>Product ${purchase.product_id}</td>
            <td>${purchase.quantity}</td>
            <td>${parseFloat(purchase.price_per_kg).toFixed(2)}</td>
            <td>${parseFloat(purchase.total_price).toFixed(2)}</td>
            <td>${new Date(purchase.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

// Generate PDF
function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Check which tab is active
    const isPaymentTab = document.querySelector('#payments.active') !== null;
    const title = isPaymentTab ? 'Payment History' : 'Purchase History';

    // Add title
    doc.setFontSize(18);
    doc.text(title, 105, 15, { align: 'center' });

    // Add vendor info
    doc.setFontSize(12);
    const vendorName = document.querySelector('.vendor-name').textContent;
    const firmName = document.getElementById('firmName').textContent;
    doc.text(`Vendor: ${vendorName}`, 20, 30);
    doc.text(`Firm: ${firmName}`, 20, 37);

    if (!isPaymentTab) {
        // Purchase History
        // Get table data
        const purchases = Array.from(document.querySelectorAll('#purchaseTableBody tr')).map(row => {
            const cells = Array.from(row.cells);
            return cells.map(cell => cell.textContent);
        });

        // Add table
        doc.autoTable({
            head: [['No.', 'Product', 'Quantity', 'Price/kg', 'Total Price', 'Date']],
            body: purchases,
            startY: 50,
            theme: 'grid',
            styles: { fontSize: 10 },
            headStyles: { fillColor: [41, 128, 185] }
        });

        // Save the PDF
        doc.save(`${vendorName}_purchase_history.pdf`);
    } else {
        // Payment History
        // Get payment data from the table
        const paymentRows = Array.from(document.getElementById('paymentsTableBody').getElementsByTagName('tr'));
        const headers = ['Date', 'Bank', 'Amount', 'Description'];
        const data = paymentRows.map(row => {
            const cells = Array.from(row.getElementsByTagName('td'));
            return cells.map(cell => cell.textContent);
        });

        // Generate table
        doc.autoTable({
            startY: 50,
            head: [headers],
            body: data,
            theme: 'grid',
            styles: { fontSize: 10 },
            headStyles: { fillColor: [41, 128, 185] }
        });

        // Save the PDF
        doc.save(`${vendorName}_payment_history.pdf`);
    }
}

// Load payment history
async function loadPaymentHistory() {
    toggleLoading(true);
    try {
        const response = await fetch(`https://oftbrothers.com/backend/api/payments.php?vendor_id=${vendorId}`);
        const data = await response.json();

        if (data.status === 'success') {
            const tbody = document.getElementById('paymentsTableBody');
            
            if (data.data && data.data.length > 0) {
                tbody.innerHTML = data.data.map(payment => `
                    <tr>
                        <td>${new Date(payment.created_at).toLocaleDateString()}</td>
                        <td>${payment.bank_name}</td>
                        <td>${formatCurrency(payment.amount)}</td>
                        <td>${payment.description || 'N/A'}</td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">No payment history found</td></tr>';
            }
        } else {
            document.getElementById('paymentsTableBody').innerHTML = 
                '<tr><td colspan="4" class="text-center">No payment history found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading payment history:', error);
        document.getElementById('paymentsTableBody').innerHTML = 
            '<tr><td colspan="4" class="text-center">Error loading payment history</td></tr>';
    } finally {
        toggleLoading(false);
    }
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
