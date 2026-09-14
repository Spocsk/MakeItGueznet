describe("accueil", () => {
  it("exige un prénom", () => {
    cy.visit("/");
    cy.get("[data-testid=home-submit]").should("not.be.disabled").click();
    cy.get("[data-testid=home-name]:invalid").should("exist");
  });

  it("refuse un code inconnu", () => {
    cy.visit("/");
    cy.get("[data-testid=home-name]").type("Dylan");
    cy.get("[data-testid=home-code]").type("12AB");
    cy.get("[data-testid=home-submit]").should("not.be.disabled").click();
    cy.get("[data-testid=error-banner]").should(
      "contain",
      "Aucune salle avec ce code",
    );
  });

  it("crée une salle et affiche le code", () => {
    cy.visitAs(`home-${Date.now()}`);
    cy.get("[data-testid=home-name]").type("Hote");
    cy.get("[data-testid=home-create]").should("not.be.disabled").click();
    cy.get("[data-testid=phase-lobby]");
    cy.get("[data-testid=room-code]").invoke("text").should("have.length", 4);
    cy.get("[data-testid=start-round]").should("exist");
  });
});
