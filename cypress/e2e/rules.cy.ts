import { createHostRoom, ids } from "./helpers";

describe("règles", () => {
  it("empêche l’invité de lancer", () => {
    const { host, guest } = ids("hostonly");
    createHostRoom(host);
    cy.get("@code").then((code) => {
      cy.task("guestLoopStart", {
        sessionId: guest,
        code,
        name: "Invite",
      });
      cy.get("[data-testid=player-Invite]");
      cy.task("startRound", { sessionId: guest, code }).then((result) => {
        const payload = result as { ok: boolean; message?: string };
        expect(payload.ok).to.equal(false);
        expect(payload.message).to.contain("hôte");
      });
      cy.task("guestLoopStop", guest);
    });
  });

  it("autorise le retour avec la même session", () => {
    const { host, guest } = ids("rejoin");
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
    cy.get("[data-testid=phase-caption]");
    cy.get("@code").then((code) => {
      cy.visitAs(host, "/");
      cy.get("[data-testid=home-name]").type("Hote");
      cy.get("[data-testid=home-code]").type(String(code));
      cy.get("[data-testid=home-submit]").click();
      cy.get("[data-testid=phase-caption], [data-testid=phase-vote]", {
        timeout: 20000,
      });
      cy.task("listRoomEvents", code).then((events) => {
        const types = (events as { type: string }[]).map((e) => e.type);
        expect(types).to.include("room.rejoin");
      });
      cy.task("guestLoopStop", guest);
    });
  });

  it("refuse un nouveau joueur après le lancement", () => {
    const { host, guest, third } = ids("late");
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
    cy.get("[data-testid=phase-caption]");
    cy.get("@code").then((code) => {
      cy.visitAs(third, "/");
      cy.get("[data-testid=home-name]").type("TropTard");
      cy.get("[data-testid=home-code]").type(String(code));
      cy.get("[data-testid=home-submit]").click();
      cy.get("[data-testid=error-banner]").should(
        "contain",
        "déjà commencé",
      );
      cy.task("joinRoom", {
        sessionId: third,
        name: "TropTard",
        code,
      }).then((result) => {
        const payload = result as { ok: boolean; message?: string };
        expect(payload.ok).to.equal(false);
        expect(payload.message).to.contain("déjà commencé");
      });
      cy.task("guestLoopStop", guest);
    });
  });
});
