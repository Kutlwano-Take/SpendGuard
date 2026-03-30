// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      createExpense(expense: {
        amount: number;
        category: string;
        date: string;
        notes?: string;
      }): Chainable<void>;
    }
  }
}

// Custom command for login
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.window().then((win) => {
    win.localStorage.setItem('amplify-authenticator-authState', 'signedIn');
    win.localStorage.setItem('amplify-authenticator-user', JSON.stringify({
      attributes: {
        email,
        sub: 'test-user-id'
      }
    }));
  });
});

// Custom command for creating expense
Cypress.Commands.add('createExpense', (expense) => {
  cy.get('[data-testid="add-expense-btn"]').click();
  cy.get('[data-testid="expense-amount"]').type(expense.amount.toString());
  cy.get('[data-testid="expense-category"]').select(expense.category);
  cy.get('[data-testid="expense-date"]').type(expense.date);
  if (expense.notes) {
    cy.get('[data-testid="expense-notes"]').type(expense.notes);
  }
  cy.get('[data-testid="save-expense-btn"]').click();
});

// Global beforeEach setup
beforeEach(() => {
  // Clear localStorage before each test
  cy.clearLocalStorage();
  
  // Mock console methods to reduce noise in test output
  cy.on('uncaught:exception', (err, runnable) => {
    // Prevent Cypress from failing on uncaught exceptions in certain cases
    if (err.message.includes('ResizeObserver loop limit exceeded')) {
      return false;
    }
    return true;
  });
});
