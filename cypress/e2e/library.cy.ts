import { ids } from "./helpers";

describe("bibliothèque", () => {
  it("est vide, accepte image et GIF, puis retire", () => {
    const { host } = ids("lib");
    cy.visitAs(host, "/bibliotheque");
    cy.get("[data-testid=library-empty]").should("contain", "Encore vide");
    cy.get("[data-testid=library-upload]").selectFile(
      "cypress/fixtures/tiny.png",
    );
    cy.get("[data-testid=library-item]").should("contain", "tiny.png");
    cy.get("[data-testid=library-upload]").selectFile(
      "cypress/fixtures/tiny.gif",
    );
    cy.get("[data-testid=library-item]").should("have.length", 2);
    cy.get("[data-testid=library-remove]").first().click();
    cy.get("[data-testid=library-item]").should("have.length", 1);
  });

  it("refuse un fichier qui n’est pas une image", () => {
    const { host } = ids("libbad");
    cy.visitAs(host, "/bibliotheque");
    cy.get("[data-testid=library-upload]").selectFile({
      contents: Cypress.Buffer.from("hello"),
      fileName: "note.txt",
      mimeType: "text/plain",
    });
    cy.get("[data-testid=error-banner]").should("contain", "Images et GIF");
  });
});
