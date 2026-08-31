import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, Timestamp } from "firebase/firestore";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const RULES = readFileSync(join(ROOT, "firestore.rules"), "utf8");
const PROJECT = "demo-balance-bites-ops";
const STAFF_UID = "staff-uid-1";
const OTHER_UID = "outsider-uid";
const STORED_ID = "version_aaa";

function payload(uid, opts = {}) {
  const { clientWriteId = "writeid01", prevWriteId, omitPrev } = opts;
  const row = {
    data: [],
    updatedAt: Timestamp.now(),
    updatedBy: uid,
    clientWriteId,
  };
  if (!omitPrev) row.prevWriteId = prevWriteId ?? "";
  return row;
}

function keyRef(db, key) {
  return doc(db, "tenants", "balance-bites", "keys", key);
}

let testEnv;

async function seedStaff() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "staff", STAFF_UID), {
      email: "staff@example.com",
      role: "staff",
    });
  });
}

async function seedKey(key, clientWriteId) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(keyRef(ctx.firestore(), key), {
      data: [],
      updatedAt: Timestamp.now(),
      updatedBy: "import-script",
      clientWriteId,
    });
  });
}

function staffDb() {
  return testEnv.authenticatedContext(STAFF_UID).firestore();
}

function outsiderDb() {
  return testEnv.authenticatedContext(OTHER_UID).firestore();
}

async function run(name, fn) {
  await testEnv.clearFirestore();
  await seedStaff();
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    console.error(err);
    throw err;
  }
}

async function main() {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { rules: RULES },
  });

  try {
    await run("staff create with prevWriteId: '' → allowed", async () => {
      await assertSucceeds(setDoc(keyRef(staffDb(), "bb_invoices"), payload(STAFF_UID, { prevWriteId: "" })));
    });

    await run("staff create with a non-empty prevWriteId → denied", async () => {
      await assertFails(
        setDoc(keyRef(staffDb(), "bb_customers"), payload(STAFF_UID, { prevWriteId: "writeid01" })),
      );
    });

    await run("staff update with prevWriteId matching the stored clientWriteId → allowed", async () => {
      await seedKey("bb_products", STORED_ID);
      await assertSucceeds(
        setDoc(
          keyRef(staffDb(), "bb_products"),
          payload(STAFF_UID, { clientWriteId: "version_bbb", prevWriteId: STORED_ID }),
        ),
      );
    });

    await run("staff update with a stale prevWriteId → DENIED", async () => {
      await seedKey("bb_invoices", STORED_ID);
      await assertFails(
        setDoc(
          keyRef(staffDb(), "bb_invoices"),
          payload(STAFF_UID, { clientWriteId: "version_bbb", prevWriteId: "stale_xxx" }),
        ),
      );
    });

    await run("staff update omitting prevWriteId → denied", async () => {
      await seedKey("bb_categories", STORED_ID);
      await assertFails(
        setDoc(
          keyRef(staffDb(), "bb_categories"),
          payload(STAFF_UID, { clientWriteId: "version_bbb", omitPrev: true }),
        ),
      );
    });

    await run("non-staff update with a correct prevWriteId → denied", async () => {
      await seedKey("bb_returns", STORED_ID);
      await assertFails(
        setDoc(
          keyRef(outsiderDb(), "bb_returns"),
          payload(OTHER_UID, { clientWriteId: "version_bbb", prevWriteId: STORED_ID }),
        ),
      );
    });

    await run("unknown key with everything else correct → denied", async () => {
      await assertFails(
        setDoc(keyRef(staffDb(), "bb_not_a_real_key"), payload(STAFF_UID, { prevWriteId: "" })),
      );
    });

    await run("staff create bb_church_status with prevWriteId: '' → allowed", async () => {
      await assertSucceeds(
        setDoc(keyRef(staffDb(), "bb_church_status"), payload(STAFF_UID, { prevWriteId: "" })),
      );
    });
  } finally {
    await testEnv.cleanup();
  }

  console.log("\n8 rules tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
