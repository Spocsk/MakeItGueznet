import { createHostRoom, ids } from "./helpers";

describe("bibliothèque vers le pool", () => {
  it("pose un tirage perso dans la salle", () => {
    const { host, guest } = ids("libpool");
    cy.visitAs(host, "/bibliotheque");
    cy.get("[data-testid=library-upload]").selectFile(
      "cypress/fixtures/tiny.png",
    );
    cy.get("[data-testid=library-item]").should("contain", "tiny.png");
    createHostRoom(host);
    cy.get("[data-testid=library-to-pool]").click();
    cy.get("[data-testid=pool-count]").should("contain", "1 fichier");
    cy.get("@code").then((code) => {
      cy.task("guestLoopStart", {
        sessionId: guest,
        code,
        name: "Invite",
      });
    });
    cy.get("[data-testid=player-Invite]");
    cy.get("[data-testid=start-round]").click();
    cy.get("[data-testid=phase-caption]");
    cy.task("guestLoopStop", guest);
  });
});
