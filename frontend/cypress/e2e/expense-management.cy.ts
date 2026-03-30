describe('Expense Management', () => {
  beforeEach(() => {
    // Mock authentication
    cy.window().then((win) => {
      win.localStorage.setItem('amplify-authenticator-authState', 'signedIn');
    });
    
    // Mock API responses
    cy.intercept('GET', '/expenses', { fixture: 'expenses.json' }).as('getExpenses');
    cy.intercept('POST', '/expenses', { fixture: 'expense-created.json' }).as('createExpense');
    cy.intercept('DELETE', '/expenses/*', { message: 'Expense deleted successfully' }).as('deleteExpense');
  });

  it('should display expenses list', () => {
    cy.visit('/');
    cy.wait('@getExpenses');
    
    cy.get('[data-testid="expenses-list"]').should('be.visible');
    cy.get('[data-testid="expense-item"]').should('have.length.greaterThan', 0);
  });

  it('should create a new expense', () => {
    cy.visit('/');
    
    // Click add expense button
    cy.get('[data-testid="add-expense-btn"]').click();
    
    // Fill out expense form
    cy.get('[data-testid="expense-amount"]').type('50.00');
    cy.get('[data-testid="expense-category"]').select('Food');
    cy.get('[data-testid="expense-date"]').type('2026-01-15');
    cy.get('[data-testid="expense-notes"]').type('Test expense');
    
    // Submit form
    cy.get('[data-testid="save-expense-btn"]').click();
    
    // Wait for API call
    cy.wait('@createExpense');
    
    // Verify success message
    cy.get('[data-testid="success-message"]').should('contain', 'Expense created');
  });

  it('should delete an expense', () => {
    cy.visit('/');
    cy.wait('@getExpenses');
    
    // Find first expense and delete it
    cy.get('[data-testid="expense-item"]').first().within(() => {
      cy.get('[data-testid="delete-expense-btn"]').click();
    });
    
    // Confirm deletion
    cy.get('[data-testid="confirm-delete-btn"]').click();
    
    // Wait for API call
    cy.wait('@deleteExpense');
    
    // Verify success message
    cy.get('[data-testid="success-message"]').should('contain', 'deleted');
  });

  it('should validate expense form inputs', () => {
    cy.visit('/');
    
    // Click add expense button
    cy.get('[data-testid="add-expense-btn"]').click();
    
    // Try to submit without required fields
    cy.get('[data-testid="save-expense-btn"]').click();
    
    // Should show validation errors
    cy.get('[data-testid="error-message"]').should('contain', 'required');
    
    // Fill with invalid amount
    cy.get('[data-testid="expense-amount"]').type('-50');
    cy.get('[data-testid="save-expense-btn"]').click();
    
    // Should show amount validation error
    cy.get('[data-testid="error-message"]').should('contain', 'positive number');
  });
});
