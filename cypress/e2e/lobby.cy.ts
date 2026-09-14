import { createHostRoom, ids } from "./helpers";

describe("lobby", () => {
  it("refuse de lancer à un joueur, puis accepte kits et deux joueurs", () => {
    const { host, guest } = ids("lobby");
    createHostRoom(host);
    cy.get("[data-testid=start-round]").click();
    cy.get("[data-testid=error-banner]").should("contain", "deux joueurs");
    cy.get("[data-testid=kit-grain]").click();
    cy.get("[data-testid=pool-count]").should("contain", "1 fichier");
    cy.get("@code").then((code) => {
      cy.task("guestLoopStart", {
        sessionId: guest,
        code,
        name: "Invite",
      });
    });
    cy.get("[data-testid=player-Invite]", { timeout: 20000 }).should("exist");
    cy.get("[data-testid=start-round]").click();
    cy.get("[data-testid=phase-caption]", { timeout: 20000 });
    cy.get("@code").then((code) => {
      cy.task("guestLoopStop", guest);
      cy.wrap(code);
    });
  });

  it("accepte un dépôt dans le pool de la partie", () => {
    const { host, guest } = ids("drop");
    createHostRoom(host);
    cy.get("@code").then((code) => {
      cy.task("guestLoopStart", {
        sessionId: guest,
        code,
        name: "Invite",
      });
    });
    cy.get("[data-testid=player-Invite]");
    cy.get("[data-testid=lobby-upload]").selectFile(
      "cypress/fixtures/tiny.gif",
    );
    cy.get("[data-testid=pool-count]").should("contain", "1 fichier");
    cy.get("[data-testid=start-round]").click();
    cy.get("[data-testid=phase-caption]");
    cy.task("guestLoopStop", guest);
  });

  it("rejoint depuis l’accueil sans bouton Lancer", () => {
    const { host, guest } = ids("uijoin");
    createHostRoom(host);
    cy.get("@code").then((code) => {
      cy.visitAs(guest, "/");
      cy.get("[data-testid=home-name]").type("Invite");
      cy.get("[data-testid=home-code]").type(String(code));
      cy.get("[data-testid=home-submit]").click();
      cy.get("[data-testid=phase-lobby]");
      cy.get("[data-testid=waiting-host]").should("exist");
      cy.get("[data-testid=start-round]").should("not.exist");
      cy.visitAs(host, `/salle/${code}`);
      cy.get("[data-testid=player-Invite]");
      cy.get("[data-testid=start-round]").click();
      cy.get("[data-testid=phase-caption]");
    });
  });
});
