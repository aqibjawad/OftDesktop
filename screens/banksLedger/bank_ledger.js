// API endpoints
const API_BASE_URL = 'https://oftbrothers.com/backend/api';
const BANK_LEDGER_URL = `${API_BASE_URL}/bank_ledger.php`;

let currentBankId;
let currentBank;

document.addEventListener('DOMContentLoaded', () => {
    // Get bank ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentBankId = urlParams.get('id');

    if (!currentBankId) {
        showError('Bank ID is required');
        return;
    }

    // Add event listeners
    document.getElementById('filterForm').addEventListener('submit', handleFilterSubmit);
    document.getElementById('downloadPdfBtn').addEventListener('click', handleDownloadPdf);

    // Initial data fetch
    fetchBankLedger();
});

async function fetchBankLedger(filters = {}) {
    try {
        let url = `${BANK_LEDGER_URL}?bank_id=${currentBankId}`;
        
        if (filters.partyType && filters.partyId) {
            url += `&party_type=${filters.partyType}&party_id=${filters.partyId}`;
        }
        
        if (filters.fromDate) url += `&from_date=${filters.fromDate}`;
        if (filters.toDate) url += `&to_date=${filters.toDate}`;

        const response = await fetch(url);
        const result = await response.json();
        
        if (result.status === 'success') {
            const { bank, ledger, filters: filterOptions } = result.data;
            currentBank = bank;
            
            // Update bank details
            document.getElementById('bankName').innerHTML = `
                <i class="bi bi-bank"></i> ${bank.bank_name}
            `;
            document.getElementById('bankBalance').textContent = 
                parseFloat(bank.balance).toLocaleString();
            
            // Update filter options
            updateFilterOptions(filterOptions);
            
            // Render ledger
            renderLedger(ledger);
            
            // Update totals
            updateTotals(ledger);
        } else {
            showError('Failed to fetch bank ledger: ' + result.message);
        }
    } catch (error) {
        showError('Network error while fetching bank ledger');
        console.error(error);
    }
}

function updateFilterOptions(options) {
    const partySelect = document.getElementById('partyFilter');
    partySelect.innerHTML = '<option value="">All</option>';
    
    // Add clients group
    if (options.clients && options.clients.length > 0) {
        const clientsGroup = document.createElement('optgroup');
        clientsGroup.label = 'Clients';
        options.clients.forEach(client => {
            const option = document.createElement('option');
            option.value = `client-${client.id}`;
            option.textContent = client.name;
            clientsGroup.appendChild(option);
        });
        partySelect.appendChild(clientsGroup);
    }
    
    // Add vendors group
    if (options.vendors && options.vendors.length > 0) {
        const vendorsGroup = document.createElement('optgroup');
        vendorsGroup.label = 'Vendors';
        options.vendors.forEach(vendor => {
            const option = document.createElement('option');
            option.value = `vendor-${vendor.id}`;
            option.textContent = vendor.name;
            vendorsGroup.appendChild(option);
        });
        partySelect.appendChild(vendorsGroup);
    }
}

function renderLedger(entries) {
    const tableBody = document.getElementById('ledgerTableBody');
    
    if (!entries || entries.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No transactions found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = entries.map(entry => `
        <tr>
            <td>${new Date(entry.created_at).toLocaleDateString()}</td>
            <td>${entry.party_name || '-'}</td>
            <td>
                <span class="badge ${entry.transaction_type === 'credit' ? 'bg-success' : 'bg-danger'}">
                    ${entry.transaction_type.toUpperCase()}
                </span>
            </td>
            <td class="transaction-amount ${entry.transaction_type}">
                ${entry.transaction_type === 'credit' ? '+' : '-'} Rs. ${parseFloat(entry.amount).toLocaleString()}
            </td>
            <td>${entry.description || '-'}</td>
            <td>${entry.reference_id ? `#${entry.reference_id}` : '-'}</td>
        </tr>
    `).join('');
}

function updateTotals(entries) {
    let totalCredits = 0;
    let totalDebits = 0;

    entries.forEach(entry => {
        if (entry.transaction_type === 'credit') {
            totalCredits += parseFloat(entry.amount);
        } else {
            totalDebits += parseFloat(entry.amount);
        }
    });

    const netChange = totalCredits - totalDebits;

    document.getElementById('totalCredits').textContent = 
        'Rs. ' + totalCredits.toLocaleString();
    document.getElementById('totalDebits').textContent = 
        'Rs. ' + totalDebits.toLocaleString();
    
    const netChangeElement = document.getElementById('netChange');
    netChangeElement.textContent = 'Rs. ' + Math.abs(netChange).toLocaleString();
    netChangeElement.className = netChange >= 0 ? 'text-success' : 'text-danger';
}

async function handleFilterSubmit(event) {
    event.preventDefault();
    
    const partyFilter = document.getElementById('partyFilter').value;
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    
    const filters = {};
    
    if (partyFilter) {
        const [type, id] = partyFilter.split('-');
        filters.partyType = type;
        filters.partyId = id;
    }
    
    if (fromDate) filters.fromDate = fromDate;
    if (toDate) filters.toDate = toDate;
    
    await fetchBankLedger(filters);
}

async function handleDownloadPdf() {
    try {
        // Create new jsPDF instance
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const margin = 10;

        // Add title
        doc.setFontSize(16);
        doc.text(`Bank Ledger - ${currentBank.bank_name}`, pageWidth/2, 20, { align: 'center' });

        // Add bank details
        doc.setFontSize(12);
        doc.text(`Balance: Rs. ${parseFloat(currentBank.balance).toLocaleString()}`, pageWidth/2, 30, { align: 'center' });

        // Add date range if specified
        const fromDate = document.getElementById('fromDate').value;
        const toDate = document.getElementById('toDate').value;
        if (fromDate || toDate) {
            const dateRange = `Period: ${fromDate || 'Start'} to ${toDate || 'End'}`;
            doc.text(dateRange, pageWidth/2, 40, { align: 'center' });
        }

        // Table configuration
        const startY = 50;
        const rowHeight = 8;
        const colWidths = [25, 30, 25, 35, 45, 20];
        const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
        let currentY = startY;

        // Helper function to draw cell with border
        const drawCell = (text, x, width, y, options = {}) => {
            const { align = 'left', bold = false, fillColor } = options;
            
            // Draw cell background if specified
            if (fillColor) {
                doc.setFillColor(...fillColor);
                doc.rect(x, y, width, rowHeight, 'F');
            }

            // Draw cell borders
            doc.rect(x, y, width, rowHeight);

            // Set text style
            if (bold) doc.setFont(undefined, 'bold');
            else doc.setFont(undefined, 'normal');

            // Calculate text position
            let textX = x + 1; // Default left align with padding
            const textY = y + (rowHeight/2) + 2; // Vertically center

            if (align === 'right') textX = x + width - 1;
            else if (align === 'center') textX = x + width/2;

            // Draw text
            doc.text(String(text).substring(0, Math.floor(width/2)), textX, textY, { align });
        };

        // Draw table headers
        const headers = ['Date', 'Party', 'Type', 'Amount', 'Description', 'Ref#'];
        let currentX = margin;
        headers.forEach((header, i) => {
            drawCell(header, currentX, colWidths[i], currentY, { 
                bold: true, 
                fillColor: [240, 240, 240],
                align: i === 3 ? 'right' : 'left'
            });
            currentX += colWidths[i];
        });
        currentY += rowHeight;

        // Get and draw table data
        const tableBody = document.getElementById('ledgerTableBody');
        const rows = tableBody.getElementsByTagName('tr');

        Array.from(rows).forEach((row) => {
            // Add new page if needed
            if (currentY > 270) {
                doc.addPage();
                currentY = margin;
                
                // Redraw headers on new page
                currentX = margin;
                headers.forEach((header, i) => {
                    drawCell(header, currentX, colWidths[i], currentY, { 
                        bold: true, 
                        fillColor: [240, 240, 240],
                        align: i === 3 ? 'right' : 'left'
                    });
                    currentX += colWidths[i];
                });
                currentY += rowHeight;
            }

            const cells = row.getElementsByTagName('td');
            currentX = margin;

            // Draw each cell in the row
            drawCell(cells[0].textContent, currentX, colWidths[0], currentY); // Date
            currentX += colWidths[0];
            
            drawCell(cells[1].textContent, currentX, colWidths[1], currentY); // Party
            currentX += colWidths[1];
            
            drawCell(cells[2].textContent.trim(), currentX, colWidths[2], currentY, { // Type
                align: 'center'
            }); 
            // Amount - Extract and format the amount properly
            const amountText = cells[3].textContent.trim();
            const isDebit = cells[2].textContent.trim() === 'DEBIT';
            const amount = amountText.replace('Rs.', '').trim(); // Remove 'Rs.' and trim spaces
            const formattedAmount = `${isDebit ? '-' : '+'} Rs. ${amount}`;
            drawCell(formattedAmount, currentX, colWidths[3], currentY, { // Amount
                align: 'right'
            });
            currentX += colWidths[3];
            
            drawCell(cells[4].textContent, currentX, colWidths[4], currentY); // Description
            currentX += colWidths[4];
            
            drawCell(cells[5].textContent, currentX, colWidths[5], currentY, { // Reference
                align: 'center'
            });

            currentY += rowHeight;
        });

        // Add totals section
        currentY += 10;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(11);
        
        const totalsStartX = margin;
        const totalsWidth = tableWidth / 3;

        // Credits
        doc.setFillColor(240, 255, 240);
        doc.rect(totalsStartX, currentY, totalsWidth, rowHeight * 1.5, 'F');
        doc.rect(totalsStartX, currentY, totalsWidth, rowHeight * 1.5);
        doc.text(`Total Credits: ${document.getElementById('totalCredits').textContent}`, 
            totalsStartX + 5, currentY + rowHeight);

        // Debits
        doc.setFillColor(255, 240, 240);
        doc.rect(totalsStartX + totalsWidth, currentY, totalsWidth, rowHeight * 1.5, 'F');
        doc.rect(totalsStartX + totalsWidth, currentY, totalsWidth, rowHeight * 1.5);
        doc.text(`Total Debits: ${document.getElementById('totalDebits').textContent}`, 
            totalsStartX + totalsWidth + 5, currentY + rowHeight);

        // Net Change
        doc.setFillColor(240, 240, 255);
        doc.rect(totalsStartX + (totalsWidth * 2), currentY, totalsWidth, rowHeight * 1.5, 'F');
        doc.rect(totalsStartX + (totalsWidth * 2), currentY, totalsWidth, rowHeight * 1.5);
        doc.text(`Net Change: ${document.getElementById('netChange').textContent}`, 
            totalsStartX + (totalsWidth * 2) + 5, currentY + rowHeight);

        // Save the PDF
        doc.save(`${currentBank.bank_name}_ledger.pdf`);
    } catch (error) {
        console.error('Error generating PDF:', error);
        showError(error.message || 'Failed to generate PDF. Please try again later.');
    }
}

function showError(message) {
    // Create or get error alert container
    let alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alertContainer';
        alertContainer.style.position = 'fixed';
        alertContainer.style.top = '20px';
        alertContainer.style.right = '20px';
        alertContainer.style.zIndex = '1050';
        document.body.appendChild(alertContainer);
    }

    // Create alert element
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    // Add to container
    alertContainer.appendChild(alert);

    // Auto remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}
