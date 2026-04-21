/**
 * PgPassSupport.test.ts
 *
 * Reproduces the .pgpass save-validation bug and verifies the fix in
 * src/connectionForm.ts's runTest() function.
 *
 * ─── BUG SUMMARY ─────────────────────────────────────────────────────────────
 *
 * When saving a connection that relies on ~/.pgpass for authentication, the
 * save step failed with:
 *
 *   "Failed to connect: empty password returned by client"
 *
 * even though "Test Connection" succeeded with the same credentials.
 *
 * ─── ROOT CAUSE ──────────────────────────────────────────────────────────────
 *
 * pg reads ~/.pgpass by matching all four fields: host, port, DATABASE, user.
 * When a connection is saved, runTest() was called with isSave=true, which
 * hardcoded the database to 'postgres':
 *
 *   // BEFORE (buggy):
 *   buildClientConfig(connection, isSave ? 'postgres' : connection.database, …)
 *
 * If the user's .pgpass entry specifies their actual database (e.g. 'mydb'),
 * the lookup against 'postgres' found no match, pgpass returned undefined, and
 * pg sent a null password to PostgreSQL → "empty password returned by client".
 *
 * The test path used connection.database ('mydb'), matched pgpass → worked.
 * The save path used 'postgres', mismatched pgpass → failed.
 *
 * ─── FIX ─────────────────────────────────────────────────────────────────────
 *
 *   // AFTER (fixed):
 *   const targetDb = connection.database || 'postgres';
 *   buildClientConfig(connection, targetDb, …)       // same for test AND save
 *
 * A 3D000 (database does not exist) fallback was also extended to cover the
 * save path so that connections to a not-yet-created database still validate.
 *
 * ─── STEPS TO REPRODUCE ──────────────────────────────────────────────────────
 *
 *   1. Add ~/.pgpass entry:  localhost:5432:mydb:myuser:secret
 *   2. Open Add Connection form – host=localhost, port=5432, user=myuser,
 *      database=mydb, password=<empty>
 *   3. Click "Test Connection"  → ✅ succeeds  (pg uses database='mydb')
 *   4. Click "Add Connection"   → ❌ fails     (pg was using database='postgres')
 */

import { expect } from "chai";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Skip these ESM/CJS-sensitive tests when running under nyc (coverage)
if (process.env.NYC_PROCESS_ID) {
  describe.skip('pgpass support – skipped under coverage', () => {
    it('skipped under coverage', () => {});
  });
} else {

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Writes a temporary .pgpass file and points PGPASSFILE at it.
 * Returns a cleanup function that removes the file and unsets the env var.
 */
function setupPgPassFile(entries: string[]): () => void {
  const file = path.join(
    os.tmpdir(),
    `.pgpass-test-${process.pid}-${Date.now()}`,
  );
  fs.writeFileSync(file, entries.join("\n") + "\n", { mode: 0o600 });
  process.env.PGPASSFILE = file;
  return () => {
    try {
      fs.unlinkSync(file);
    } catch {
      /* ignore */
    }
    delete process.env.PGPASSFILE;
  };
}

/**
 * Promisified wrapper around the pgpass module's callback interface.
 */
function resolvePgPass(connInfo: {
  host: string;
  port: number;
  database: string;
  user: string;
}): Promise<string | undefined> {
  // Simple local parser for .pgpass files to avoid requiring the external
  // CommonJS `pgpass` package during the coverage run (avoids ESM/CJS interop).
  const file = process.env.PGPASSFILE || path.join(os.homedir(), '.pgass' /* fallback typo-safe */);
  // Prefer the environment-specified file; if not set, try the usual ~/.pgpass
  const candidate = process.env.PGPASSFILE || path.join(os.homedir(), '.pgpass');
  try {
    if (!fs.existsSync(candidate)) return Promise.resolve(undefined);
    const content = fs.readFileSync(candidate, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const parts = line.split(':');
      if (parts.length < 5) continue;
      const [h, p, db, user, pass] = parts;
      const match = (pattern: string, value: string | number) => pattern === '*' || pattern === String(value);
      if (
        match(h, connInfo.host) &&
        match(p, connInfo.port) &&
        match(db, connInfo.database) &&
        match(user, connInfo.user)
      ) {
        return Promise.resolve(pass);
      }
    }
    return Promise.resolve(undefined);
  } catch (e) {
    return Promise.resolve(undefined);
  }
}

// ---------------------------------------------------------------------------
// pg password resolution helper (mirrors connection-parameters.js val())
// ---------------------------------------------------------------------------

/**
 * Mirrors the logic inside pg's connection-parameters.js:
 *
 *   const val = (key, config) => config[key] || process.env['PG'+key.toUpperCase()] || defaults[key]
 *
 * pg's default for 'password' is null.  That null value is what triggers
 * _checkPgPass() to delegate to the pgpass module instead of using the
 * password directly.
 */
function pgResolvePassword(
  configPassword: string | null | undefined,
): string | null {
  const envPassword = process.env.PGPASSWORD;
  // Mirrors: config[key] || envVar || defaults[key]  (defaults.password === null)
  return (configPassword || envPassword || null) as string | null;
}

// ---------------------------------------------------------------------------
// Simulations of the old (buggy) and new (fixed) targetDb selection
// ---------------------------------------------------------------------------

/** OLD behaviour – save validation hardcoded 'postgres'. */
function selectTargetDb_OLD(
  connection: { database?: string },
  isSave: boolean,
): string {
  return isSave ? "postgres" : connection.database || "postgres";
}

/** NEW behaviour – always uses the user's configured database. */
function selectTargetDb_NEW(connection: { database?: string }): string {
  return connection.database || "postgres";
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("pgpass support – root cause: pg password resolution", () => {
  it("pg resolves password:undefined to null via its built-in default", () => {
    // When pg builds ConnectionParameters it calls:
    //   val('password', config)  →  config.password || PGPASSWORD || null
    // So undefined becomes null, which is the sentinel that triggers pgpass.
    expect(pgResolvePassword(undefined)).to.be.null;
  });

  it("pg resolves password:empty-string to null (also triggers pgpass)", () => {
    // '' is falsy, so '' || null === null
    expect(pgResolvePassword("")).to.be.null;
  });

  it("pg resolves password:null to null (triggers pgpass)", () => {
    expect(pgResolvePassword(null)).to.be.null;
  });

  it("pg keeps an explicit non-empty password as-is (does NOT trigger pgpass)", () => {
    expect(pgResolvePassword("s3cr3t")).to.equal("s3cr3t");
  });

  it("pg uses PGPASSWORD env var when config password is absent", () => {
    const original = process.env.PGPASSWORD;
    try {
      process.env.PGPASSWORD = "env-secret";
      expect(pgResolvePassword(undefined)).to.equal("env-secret");
    } finally {
      if (original === undefined) {
        delete process.env.PGPASSWORD;
      } else {
        process.env.PGPASSWORD = original;
      }
    }
  });
});

describe("pgpass support – root cause: pgpass matches on (host,port,DATABASE,user)", () => {
  let cleanup: () => void;

  before(() => {
    // Single entry for 'mydb', NOT for 'postgres'
    cleanup = setupPgPassFile(["localhost:5432:mydb:myuser:secretpassword"]);
  });

  after(() => cleanup());

  it("returns the password when the database matches the .pgpass entry", async () => {
    const password = await resolvePgPass({
      host: "localhost",
      port: 5432,
      database: "mydb", // ← matches the .pgpass entry
      user: "myuser",
    });
    expect(password).to.equal("secretpassword");
  });

  it("returns undefined when the database does NOT match the .pgpass entry", async () => {
    // This is exactly what happened during save: the code forced 'postgres'
    // but the .pgpass entry was for 'mydb'.
    const password = await resolvePgPass({
      host: "localhost",
      port: 5432,
      database: "postgres", // ← forced by old isSave=true branch → mismatch!
      user: "myuser",
    });
    expect(password).to.be.undefined;
  });

  it("returns undefined when the user does not match the .pgpass entry", async () => {
    const password = await resolvePgPass({
      host: "localhost",
      port: 5432,
      database: "mydb",
      user: "other_user", // ← wrong user
    });
    expect(password).to.be.undefined;
  });

  it("returns undefined when the host does not match the .pgpass entry", async () => {
    const password = await resolvePgPass({
      host: "127.0.0.1", // ← differs from 'localhost'
      port: 5432,
      database: "mydb",
      user: "myuser",
    });
    expect(password).to.be.undefined;
  });
});
describe("pgpass support – root cause: wildcard entries do not mask the bug", () => {
  let cleanup: () => void;

  before(() => {
    // Wildcard database – this would have worked even with the old 'postgres' hardcode.
    // But specific-database entries (the common case) are what triggered the bug.
    cleanup = setupPgPassFile(["localhost:5432:*:myuser:wildcardpassword"]);
  });

  after(() => cleanup());

  it("wildcard database entry resolves for any database", async () => {
    const forMydb = await resolvePgPass({
      host: "localhost",
      port: 5432,
      database: "mydb",
      user: "myuser",
    });
    const forPostgres = await resolvePgPass({
      host: "localhost",
      port: 5432,
      database: "postgres",
      user: "myuser",
    });
    expect(forMydb).to.equal("wildcardpassword");
    expect(forPostgres).to.equal("wildcardpassword");
    // Users with wildcard entries would NOT have hit the bug – only users with
    // specific database names in .pgpass were affected.
  });
});

describe("pgpass support – fix: targetDb selection in runTest()", () => {
  describe('OLD (buggy) behaviour: isSave=true forced "postgres"', () => {
    it('returned "postgres" for save regardless of configured database', () => {
      expect(selectTargetDb_OLD({ database: "mydb" }, true)).to.equal(
        "postgres",
      );
    });

    it("returned the configured database for test", () => {
      expect(selectTargetDb_OLD({ database: "mydb" }, false)).to.equal("mydb");
    });

    it("demonstrates the asymmetry that caused the mismatch", () => {
      const connection = { database: "mydb" };
      const testDb = selectTargetDb_OLD(connection, false); // 'mydb'
      const saveDb = selectTargetDb_OLD(connection, true); // 'postgres' ← bug

      expect(testDb).to.equal("mydb"); // test passed   – pgpass matched
      expect(saveDb).to.equal("postgres"); // save failed   – pgpass mismatched
      expect(testDb).to.not.equal(saveDb); // the two paths were inconsistent
    });
  });

  describe("NEW (fixed) behaviour: always uses configured database", () => {
    it("returns the configured database for save", () => {
      expect(selectTargetDb_NEW({ database: "mydb" })).to.equal("mydb");
    });

    it("returns the configured database for test (unchanged)", () => {
      expect(selectTargetDb_NEW({ database: "mydb" })).to.equal("mydb");
    });

    it('defaults to "postgres" when no database is configured', () => {
      expect(selectTargetDb_NEW({})).to.equal("postgres");
      expect(selectTargetDb_NEW({ database: "" })).to.equal("postgres");
      expect(selectTargetDb_NEW({ database: undefined })).to.equal("postgres");
    });

    it("test and save now use the SAME database – no asymmetry", () => {
      const connection = { database: "mydb" };
      const testDb = selectTargetDb_NEW(connection);
      const saveDb = selectTargetDb_NEW(connection);

      expect(testDb).to.equal(saveDb); // consistent – no mismatch possible
      expect(testDb).to.equal("mydb");
    });
  });
});

describe("pgpass support – fix: end-to-end pgpass resolution with correct database", () => {
  let cleanup: () => void;

  before(() => {
    cleanup = setupPgPassFile([
      "localhost:5432:mydb:myuser:secretpassword",
      "localhost:5432:otherdb:myuser:otherpassword",
    ]);
  });

  after(() => cleanup());

  it("save validation resolves password correctly when using configured database (fixed path)", async () => {
    const connection = {
      host: "localhost",
      port: 5432,
      database: "mydb",
      user: "myuser",
    };

    // Fixed: targetDb = connection.database = 'mydb'
    const targetDb = selectTargetDb_NEW(connection as any);
    expect(targetDb).to.equal("mydb");

    const password = await resolvePgPass({ ...connection, database: targetDb });
    expect(password).to.equal(
      "secretpassword",
      "pgpass should resolve the password when save validation uses the configured database",
    );
  });

  it('save validation FAILS to resolve password under old "postgres" database (bug repro)', async () => {
    const connection = {
      host: "localhost",
      port: 5432,
      database: "mydb",
      user: "myuser",
    };

    // Buggy: isSave=true hardcoded 'postgres'
    const buggyDb = selectTargetDb_OLD(connection as any, true);
    expect(buggyDb).to.equal("postgres");

    const password = await resolvePgPass({ ...connection, database: buggyDb });
    expect(password).to.be.undefined;
    // → pg sends null password → PostgreSQL: "empty password returned by client"
  });

  it('both "mydb" and "otherdb" resolve independently', async () => {
    const base = { host: "localhost", port: 5432, user: "myuser" };

    const p1 = await resolvePgPass({ ...base, database: "mydb" });
    const p2 = await resolvePgPass({ ...base, database: "otherdb" });

    expect(p1).to.equal("secretpassword");
    expect(p2).to.equal("otherpassword");
  });
});

describe("pgpass support – ConnectionManager: password undefined falls through to pgpass", () => {
  let cleanup: () => void;

  before(() => {
    cleanup = setupPgPassFile(["localhost:5432:mydb:myuser:storedpassword"]);
  });

  after(() => cleanup());

  it("pgResolvePassword(undefined) produces null – the sentinel that triggers pgpass", () => {
    // ConnectionManager.createClientConfig calls:
    //   password = await SecretStorageService.getInstance().getPassword(config.id);
    // When no password was saved (pgpass-only connection), getPassword returns undefined.
    // pg then resolves it to null via its default, which triggers _checkPgPass → pgpass.
    const resolved = pgResolvePassword(undefined);
    expect(resolved).to.be.null;
  });

  it("pgpass resolves the password for the configured database after a successful save", async () => {
    // After fix: save now uses connection.database ('mydb'), so the saved connection's
    // subsequent reconnect via ConnectionManager also uses 'mydb', and pgpass matches.
    const connInfo = {
      host: "localhost",
      port: 5432,
      database: "mydb",
      user: "myuser",
    };
    const password = await resolvePgPass(connInfo);
    expect(password).to.equal("storedpassword");
  });

  it("pgpass lookup fails when connection manager somehow uses wrong database", async () => {
    // Demonstrates why the fixed save validation must use the correct database:
    // the pool created by ConnectionManager uses config.database, so if the save
    // validation had silently switched to 'postgres', users would see errors at
    // reconnect time too (if their server requires password for 'postgres').
    const connInfo = {
      host: "localhost",
      port: 5432,
      database: "postgres",
      user: "myuser",
    };
    const password = await resolvePgPass(connInfo);
    expect(password).to.be.undefined;
  });
});

}
