// Custom Cypress commands can be added here

// Example: Custom command to wait for API loading
Cypress.Commands.add('waitForApi', () => {
  cy.get('[data-testid="loading"]').should('not.exist');
});

// Example: Custom command to check if element is visible and has text
Cypress.Commands.add('shouldBeVisibleAndContain', { prevSubject: 'element' }, (subject, text: string) => {
  cy.wrap(subject).should('be.visible').and('contain', text);
});

// Example: Custom command to check if element is disabled
Cypress.Commands.add('shouldBeDisabled', { prevSubject: 'element' }, (subject) => {
  cy.wrap(subject).should('be.disabled');
});

// Example: Custom command to check if element is enabled
Cypress.Commands.add('shouldBeEnabled', { prevSubject: 'element' }, (subject) => {
  cy.wrap(subject).should('not.be.disabled');
});
