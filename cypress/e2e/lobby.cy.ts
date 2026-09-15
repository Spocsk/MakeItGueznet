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

  it("laisse l’hôte régler filtre, durée et manches", () => {
    const { host, guest } = ids("settings");
    createHostRoom(host);
    cy.get("[data-testid=filter-recent]").click();
    cy.get("[data-testid=filter-recent]").should("have.attr", "aria-pressed", "true");
    cy.get("[data-testid=caption-seconds]").select("30");
    cy.get("[data-testid=round-count]").select("2");
    cy.get("@code").then((code) => {
      cy.visitAs(guest, "/");
      cy.get("[data-testid=home-name]").type("Invite");
      cy.get("[data-testid=home-code]").type(String(code));
      cy.get("[data-testid=home-submit]").click();
      cy.get("[data-testid=settings-readonly]").should("contain", "Récents");
      cy.get("[data-testid=settings-readonly]").should("contain", "30s");
      cy.get("[data-testid=settings-readonly]").should("contain", "2 manche");
      cy.get("[data-testid=caption-seconds]").should("not.exist");
      cy.task("updateSettings", {
        sessionId: guest,
        code,
        roundCount: 8,
      }).then((result) => {
        const payload = result as { ok: boolean; message?: string };
        expect(payload.ok).to.equal(false);
        expect(payload.message).to.match(/hôte/i);
      });
    });
  });

  it("ajoute un template catalogue dans le pool", () => {
    const { host, guest } = ids("catalog");
    createHostRoom(host);
    cy.get("@code").then((code) => {
      cy.task("refreshCatalog").then((result) => {
        const payload = result as { ok: boolean; message?: string };
        expect(payload.ok, payload.message).to.equal(true);
      });
      cy.task("guestLoopStart", {
        sessionId: guest,
        code,
        name: "Invite",
      });
      cy.get("[data-testid=player-Invite]");
      cy.get("[data-testid=catalog-item]", { timeout: 25000 }).first().click();
      cy.get("[data-testid=pool-count]").should("contain", "1 fichier");
      cy.get("[data-testid=start-round]").click();
      cy.get("[data-testid=phase-caption]");
      cy.get("[data-testid=caption-timer]").should("be.visible");
      cy.task("tryCloseCaption", { sessionId: host, code }).then((result) => {
        const payload = result as { ok: boolean; closed?: boolean };
        expect(payload.ok).to.equal(true);
        expect(payload.closed).to.equal(false);
      });
      cy.task("guestLoopStop", guest);
    });
  });

  it("mélange catalogue, bibliothèque et dépôt de salle", () => {
    const { host, guest } = ids("mix");
    cy.visitAs(host, "/bibliotheque");
    cy.get("[data-testid=library-upload]").selectFile(
      "cypress/fixtures/tiny.png",
    );
    cy.get("[data-testid=library-item]").should("contain", "tiny.png");
    createHostRoom(host);
    cy.get("[data-testid=library-to-pool]").click();
    cy.get("[data-testid=pool-count]").should("contain", "1 fichier");
    cy.get("[data-testid=lobby-upload]").selectFile(
      "cypress/fixtures/tiny.gif",
    );
    cy.get("[data-testid=pool-count]").should("contain", "2 fichier");
    cy.get("@code").then((code) => {
      cy.task("addFirstCatalog", { sessionId: host, code }).then((result) => {
        const payload = result as { ok: boolean; message?: string };
        expect(payload.ok, payload.message).to.equal(true);
      });
    });
    cy.get("[data-testid=pool-count]").should("contain", "3 fichier");
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
