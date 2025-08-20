const { API_BASE_URL } = require('../../config');
const Payment_URL = `${API_BASE_URL}/payments.php`;
const Recieve_URL = `${API_BASE_URL}/receives.php`;
const Product_URL = `${API_BASE_URL}/product.php`;
const Expense_URL = `${API_BASE_URL}/expense.php`;
const Salary_URL = `${API_BASE_URL}/salaries.php`;

let paymentStats = {
    received: 0,
    paid: 0,
    totalQuantity: 0,
    totalExpenses: 0,
    totalSalaries: 0
};

const { BrowserWindow } = require('@electron/remote');

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupCards();

    // Window control functionality
    document.getElementById('minimize-btn').addEventListener('click', () => {
        BrowserWindow.getFocusedWindow().minimize();
    });

    document.getElementById('maximize-btn').addEventListener('click', () => {
        const win = BrowserWindow.getFocusedWindow();
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    });

    document.getElementById('close-btn').addEventListener('click', () => {
        BrowserWindow.getFocusedWindow().close();
    });
});

async function fetchData() {
    try {
        showLoading(true);
        const [paymentsResponse, receivesResponse, productsResponse, expensesResponse, salariesResponse] = await Promise.all([
            fetch(Payment_URL),
            fetch(Recieve_URL),
            fetch(Product_URL),
            fetch(Expense_URL),
            fetch(Salary_URL)
        ]);

        // Helper function to safely parse JSON response
        const safeParseJSON = async (response, endpoint) => {
            const text = await response.text();
            try {
                console.log(`Response from ${endpoint}:`, text);
                
                // Find the first complete JSON object
                let depth = 0;
                let start = text.indexOf('{');
                let end = -1;
                
                if (start === -1) {
                    console.error(`No JSON object found in ${endpoint} response`);
                    throw new Error('No JSON object found');
                }
                
                // Scan through the text to find matching braces
                for (let i = start; i < text.length; i++) {
                    if (text[i] === '{') depth++;
                    if (text[i] === '}') {
                        depth--;
                        if (depth === 0) {
                            end = i + 1;
                            break;
                        }
                    }
                }
                
                if (end === -1) {
                    console.error(`No complete JSON object found in ${endpoint} response`);
                    throw new Error('No complete JSON object found');
                }
                
                // Extract and parse the first complete JSON object
                const jsonStr = text.slice(start, end);
                console.log(`Extracted JSON from ${endpoint}:`, jsonStr);
                
                const result = JSON.parse(jsonStr);
                console.log(`Parsed result from ${endpoint}:`, result);
                return result;
            } catch (e) {
                console.error(`JSON Parse Error for ${endpoint}:`, e);
                console.error('Full response:', text);
                throw new Error(`Invalid JSON response from ${endpoint}`);
            }
        };

        // Parse all responses
        const [
            paymentsData,
            receivesData,
            productsData,
            expensesData,
            salariesData
        ] = await Promise.all([
            safeParseJSON(paymentsResponse, 'payments'),
            safeParseJSON(receivesResponse, 'receives'),
            safeParseJSON(productsResponse, 'products'),
            safeParseJSON(expensesResponse, 'expenses'),
            safeParseJSON(salariesResponse, 'salaries')
        ]);

        if ((paymentsData.success || paymentsData.status === "success") && 
            (receivesData.success || receivesData.status === "success") &&
            (productsData.success || productsData.status === "success") &&
            (expensesData.success || expensesData.status === "success") &&
            (salariesData.success || salariesData.status === "success")) {
            
            const totalPayments = paymentsData.data.reduce(
                (sum, payment) => sum + parseFloat(payment.amount),
                0
            );

            const totalReceives = receivesData.data.reduce(
                (sum, receive) => sum + parseFloat(receive.amount),
                0
            );

            const totalQuantity = productsData.data.reduce(
                (sum, product) => sum + parseFloat(product.quantity),
                0
            );

            const totalExpenses = expensesData.data.reduce(
                (sum, expense) => sum + parseFloat(expense.amount),
                0
            );

            const totalSalaries = salariesData.data.reduce(
                (sum, salary) => sum + parseFloat(salary.amount),
                0
            );

            paymentStats = {
                received: totalReceives,
                paid: totalPayments,
                totalQuantity: totalQuantity,
                totalExpenses: totalExpenses,
                totalSalaries: totalSalaries
            };

            updateStats();
        } else {
            showError("Failed to fetch data");
        }
    } catch (err) {
        showError("Network error: " + err.message);
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
    document.getElementById('content').style.display = show ? 'none' : 'block';
}

function showError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function updateStats() {
    document.getElementById('received-amount').textContent = 
        `Rs. ${parseFloat(paymentStats.received).toLocaleString()}`;
    document.getElementById('paid-amount').textContent = 
        `Rs. ${parseFloat(paymentStats.paid).toLocaleString()}`;
    
    // Update expenses
    document.getElementById('total-expenses').textContent = 
        `Rs. ${parseFloat(paymentStats.totalExpenses).toLocaleString()}`;

    // Update salaries
    document.getElementById('total-salaries').textContent = 
        `Rs. ${parseFloat(paymentStats.totalSalaries).toLocaleString()}`;
    
    // Update the quantity at the top
    document.getElementById('total-quantity').textContent = 
        `${paymentStats.totalQuantity.toLocaleString()} kg`;
    
    // Update the balance at the bottom with formula
    const balance = paymentStats.received - paymentStats.paid - paymentStats.totalExpenses - paymentStats.totalSalaries;
    document.getElementById('balance-text').textContent = 
        `Balance: Rs. ${balance.toLocaleString()}`;
}

const cardData = [
    {
        title: "Expense Category",
        description: "Categorize expenses",
        iconName: "category",
        screen: "../expenseCategory/index.html"
    },
    {
        title: "Expenses",
        description: "Record and view expenses",
        iconName: "receipt_long",
        screen: "../expense/index.html"
    },
    {
        title: "Product",
        description: "Manage inventory",
        iconName: "inventory",
        screen: "../product/product.html"
    },
    {
        title: "Client",
        description: "Manage clients",
        iconName: "person",
        screen: "../client/client.html"
    },
    {
        title: "Vendor",
        description: "Manage vendors",
        iconName: "store",
        screen: "../vendor/vendor.html"
    },
    {
        title: "Employee",
        description: "HR management",
        iconName: "work",
        screen: "../employee/employee.html"
    },
    {
        title: "Salary",
        description: "Payroll system",
        iconName: "payments",
        screen: "../salary/salary.html"
    },
    {
        title: "Purchase Order",
        description: "Track orders",
        iconName: "assignment",
        screen: "../purchase/purchase.html"
    },
    {
        title: "Sale",
        description: "Sales dashboard",
        iconName: "shopping-cart",
        screen: "../sales/sales.html"
    },
    {
        title: "Banks",
        description: "Bank accounts",
        iconName: "account-balance",
        screen: "../bank/bank.html"
    },
    {
        title: "Receives",
        description: "Income tracking",
        iconName: "attach_money",
        screen: "../receives/receives.html"
    },
    {
        title: "Payments",
        description: "Expense tracking",
        iconName: "trending-down",
        screen: "../payments/payments.html"
    }
];

function setupCards() {
    const cardsContainer = document.getElementById('cards-container');
    cardData.forEach(card => {
        const cardElement = createCard(card);
        cardsContainer.appendChild(cardElement);
    });
}

function createCard({ title, description, iconName, screen }) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <div class="icon-container">
            <span class="material-icons">${iconName}</span>
        </div>
        <h3 class="card-title">${title}</h3>
        <p class="card-description">${description}</p>
    `;
    card.addEventListener('click', () => {
        window.location.href = screen;
    });
    return card;
}
