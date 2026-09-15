import { createHostRoom, ids } from "./helpers";

describe("partie", () => {
  it("joue une manche complète puis la suivante", () => {
    const { host, guest } = ids("game");
    createHostRoom(host);
    cy.get("@code").then((code) => {
      cy.task("guestLoopStart", {
        sessionId: guest,
        code,
        name: "Invite",
      });
    });
    cy.get("[data-testid=player-Invite]");
    cy.get("[data-testid=kit-noyer]").click();
    cy.get("[data-testid=kit-lait]").click();
    cy.get("[data-testid=start-round]").click();
    cy.get("[data-testid=phase-caption]");
    cy.get("[data-testid=caption-input]").clear().type("un café trop chaud");
    cy.get("[data-testid=caption-submit]").click();
    cy.finishVoting();
    cy.get("[data-testid=phase-score]");
    cy.get("[data-testid=ranking]").should("contain", "Hote");
    cy.get("[data-testid=ranking]").should("contain", "Invite");
    cy.get("[data-testid=score-print]").should("have.length.at.least", 2);
    cy.get("[data-testid=score-print]").first().click();
    cy.get("[data-testid=next-round]").click();
    cy.get("[data-testid=phase-caption]", { timeout: 20000 });
    cy.get("[data-testid=caption-input]").clear().type("deuxième bande");
    cy.get("[data-testid=caption-submit]").click();
    cy.finishVoting();
    cy.get("[data-testid=phase-score]");
    cy.get("[data-testid=next-round]").should("exist");
    cy.task("guestLoopStop", guest);
  });

  it("interdit de noter son propre tirage", () => {
    const { host, guest } = ids("own");
    createHostRoom(host);
    cy.get("@code").then((code) => {
      cy.task("guestLoopStart", {
        sessionId: guest,
        code,
        name: "Invite",
      });
    });
    cy.get("[data-testid=player-Invite]");
    cy.get("[data-testid=start-round]").click();
    cy.get("[data-testid=caption-input]").type("la mienne");
    cy.get("[data-testid=caption-submit]").click();
    cy.get("[data-testid=phase-vote]", { timeout: 30000 });
    cy.get("[data-testid=vote-own], [data-testid=star-5]", { timeout: 20000 });
    cy.get("body").then(($body) => {
      if ($body.find("[data-testid=vote-own]").length) {
        cy.get("[data-testid=star-5]").should("not.exist");
        cy.get("@code").then((code) => {
          cy.task("rateCurrent", {
            sessionId: host,
            code,
            stars: 4,
          }).then((result) => {
            const payload = result as { ok: boolean; message?: string };
            expect(payload.ok).to.equal(false);
            expect(payload.message).to.match(/tien/i);
          });
        });
      }
    });
    cy.finishVoting();
    cy.task("guestLoopStop", guest);
  });

  it("arrête la partie après le nombre de manches réglé", () => {
    const { host, guest } = ids("end");
    createHostRoom(host);
    cy.get("[data-testid=round-count]").select("1");
    cy.get("@code").then((code) => {
      cy.task("guestLoopStart", {
        sessionId: guest,
        code,
        name: "Invite",
      });
    });
    cy.get("[data-testid=player-Invite]");
    cy.get("[data-testid=start-round]").click();
    cy.get("[data-testid=caption-timer]").should("contain", "s");
    cy.get("[data-testid=caption-input]").type("dernière bande");
    cy.get("[data-testid=caption-submit]").click();
    cy.finishVoting();
    cy.get("[data-testid=phase-score]");
    cy.get("[data-testid=match-over]").should("contain", "terminée");
    cy.get("[data-testid=next-round]").should("not.exist");
    cy.task("guestLoopStop", guest);
  });
});
