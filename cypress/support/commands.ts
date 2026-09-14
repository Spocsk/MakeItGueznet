export {};

declare global {
  namespace Cypress {
    interface Chainable {
      visitAs(sessionId: string, path?: string): Chainable<void>;
      finishVoting(): Chainable<void>;
      clientLogs(): Chainable<Array<{ event: string }>>;
    }
  }
}

Cypress.Commands.add("visitAs", (sessionId: string, path = "/") => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem("gueznet-session", sessionId);
    },
  });
});

Cypress.Commands.add("clientLogs", () => {
  return cy.window().then((win) => {
    try {
      return JSON.parse(win.sessionStorage.getItem("gueznet-logs") || "[]");
    } catch {
      return [];
    }
  });
});

Cypress.Commands.add("finishVoting", () => {
  cy.get("[data-testid=phase-vote], [data-testid=phase-score]", {
    timeout: 40000,
  });
  cy.get("body").then(($body) => {
    if ($body.find("[data-testid=phase-score]").length) return;
    if ($body.find("[data-testid=vote-own]").length) {
      cy.get("[data-testid=star-5]").should("not.exist");
      cy.get("[data-testid=star-5], [data-testid=phase-score]", {
        timeout: 30000,
      });
      cy.finishVoting();
      return;
    }
    if ($body.find("[data-testid=star-5].on").length) {
      cy.get("[data-testid=vote-own], [data-testid=phase-score]", {
        timeout: 30000,
      });
      cy.finishVoting();
      return;
    }
    cy.get("[data-testid=star-5]").click();
    cy.get(
      "[data-testid=vote-own], [data-testid=phase-score], [data-testid=star-5].on",
      { timeout: 15000 },
    );
    cy.finishVoting();
  });
});
