export function ids(prefix = "cy") {
  const n = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return {
    host: `${prefix}-host-${n}`,
    guest: `${prefix}-guest-${n}`,
    third: `${prefix}-third-${n}`,
  };
}

export function createHostRoom(sessionId: string, name = "Hote") {
  cy.visitAs(sessionId);
  cy.get("[data-testid=home-name]").type(name);
  cy.get("[data-testid=home-create]").should("not.be.disabled").click();
  cy.get("[data-testid=room-code]", { timeout: 20000 })
    .invoke("text")
    .then((text) => {
      const code = String(text).trim();
      expect(code).to.have.length(4);
      cy.wrap(code).as("code");
    });
  cy.get("[data-testid=catalog-item]", { timeout: 40000 }).should(
    "have.length.at.least",
    1,
  );
}
