import { createHostRoom, ids } from "./helpers";

describe("journal", () => {
  it("écrit les logs client et les events Convex", () => {
    const { host, guest } = ids("log");
    createHostRoom(host);
    cy.clientLogs().then((logs) => {
      expect(logs.map((row) => row.event)).to.include("room.create");
    });
    cy.get("@code").then((code) => {
      cy.task("guestLoopStart", {
        sessionId: guest,
        code,
        name: "Invite",
      });
    });
    cy.get("[data-testid=player-Invite]");
    cy.get("[data-testid=start-round]").click();
    cy.get("[data-testid=caption-input]").type("journal de table");
    cy.get("[data-testid=caption-submit]").click();
    cy.finishVoting();
    cy.get("[data-testid=phase-score]");
    cy.clientLogs().then((logs) => {
      const events = logs.map((row) => row.event);
      expect(events).to.include("caption.submit");
      expect(events).to.include("vote.rate");
    });
    cy.get("@code").then((code) => {
      cy.task("listRoomEvents", code).then((rows) => {
        const types = (rows as { type: string }[]).map((row) => row.type);
        expect(types).to.include("room.create");
        expect(types).to.include("room.join");
        expect(types).to.include("round.start");
        expect(types).to.include("caption.submit");
        expect(types).to.include("vote.rate");
      });
      cy.task("listSessionEvents", host).then((rows) => {
        const types = (rows as { type: string }[]).map((row) => row.type);
        expect(types.length).to.be.greaterThan(0);
      });
    });
    cy.task("guestLoopStop", guest);
  });
});
