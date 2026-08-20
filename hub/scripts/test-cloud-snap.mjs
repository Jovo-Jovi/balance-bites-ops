function classifyRemoteSnapshot(input) {
  if (!input.exists) return "empty";
  if (input.pendingHasWriteId) return "own";
  if (input.writeId && input.writeId === input.lastApplied) return "echo";
  if (!input.alreadyWatching) return "hydrate";
  if (input.hasPendingWrites) return "echo";
  return "conflict";
}

const cases = [
  {
    name: "own write: cache snapshot still pending",
    want: "own",
    input: {
      exists: true,
      writeId: "w1",
      pendingHasWriteId: true,
      lastApplied: "",
      alreadyWatching: true,
      hasPendingWrites: true,
    },
  },
  {
    name: "own write: server echo after pending is still tracked",
    want: "own",
    input: {
      exists: true,
      writeId: "w1",
      pendingHasWriteId: true,
      lastApplied: "w1",
      alreadyWatching: true,
      hasPendingWrites: false,
    },
  },
  {
    name: "own write: second server echo after pending cleared",
    want: "echo",
    input: {
      exists: true,
      writeId: "w1",
      pendingHasWriteId: false,
      lastApplied: "w1",
      alreadyWatching: true,
      hasPendingWrites: false,
    },
  },
  {
    name: "first snapshot after watch is hydrate, not a toast",
    want: "hydrate",
    input: {
      exists: true,
      writeId: "w2",
      pendingHasWriteId: false,
      lastApplied: "",
      alreadyWatching: false,
      hasPendingWrites: false,
    },
  },
  {
    name: "other tab writes a new id while watching",
    want: "conflict",
    input: {
      exists: true,
      writeId: "other",
      pendingHasWriteId: false,
      lastApplied: "w1",
      alreadyWatching: true,
      hasPendingWrites: false,
    },
  },
];

let failed = 0;
for (const c of cases) {
  const got = classifyRemoteSnapshot(c.input);
  if (got !== c.want) {
    failed += 1;
    console.error(`FAIL ${c.name}: got ${got}, want ${c.want}`);
  }
}

if (failed) process.exit(1);
console.log(`cloud-snap ok (${cases.length} cases)`);
