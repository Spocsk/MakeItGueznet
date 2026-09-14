import { createHostRoom, ids } from "./helpers";

describe("mobile", () => {
  it("tient en 390×844", () => {
    cy.viewport(390, 844);
    const { host, guest } = ids("mob");
    createHostRoom(host);
    cy.get("[data-testid=phase-lobby]").should("be.visible");
    cy.get("[data-testid=home-root]").should("not.exist");
    cy.get("@code").then((code) => {
      cy.task("guestLoopStart", {
        sessionId: guest,
        code,
        name: "Invite",
      });
    });
    cy.get("[data-testid=player-Invite]");
    cy.get("[data-testid=start-round]").click();
    cy.get("[data-testid=caption-input]").should("be.visible").type("format poche");
    cy.get("[data-testid=caption-submit]").click();
    cy.finishVoting();
    cy.get("[data-testid=phase-score]").should("be.visible");
    cy.task("guestLoopStop", guest);
  });
});
