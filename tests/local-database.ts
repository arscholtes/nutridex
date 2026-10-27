// Database tests that commit rows, run the seed or create databases refuse any server that is not
// on this machine; tests that only read, or write in a rolled-back transaction, need no such check.

/**
 * The database DATABASE_URL names, when it is on this machine.
 * @param what [string] what the test does to the database, for the refusal
 * @return [URL] the database's address
 * @throws when the database's host is not this machine
 */
export function localDatabaseUrl(what: string): URL {
  const url = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error(`${what}; refusing ${url.hostname}, which is not this machine`);
  }
  return url;
}
