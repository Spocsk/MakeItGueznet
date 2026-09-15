import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "refresh imgflip catalog",
  { hours: 6 },
  internal.catalogActions.refreshCatalog,
  {},
);

export default crons;
