import JevEntriesAPI from "../../../../api/endpoints/jev-entries.api.js";

// A fund account (cAccountType "F") shows its running balance in the account
// chain: the sum of ACTIVE JEV lines posted on it or anywhere beneath it —
// the same rule the ledger uses. The map is shared by the account-chain
// selector and the JEV entry list so both print the same figure without each
// firing its own request.
const CACHE_MS = 15_000;
const cache = {
  data: null,
  at: 0,
  key: "",
  promise: null,
  promiseKey: "",
};

const asList = (res) => (Array.isArray(res) ? res : (res?.data ?? []));

const computeFundBalances = (accounts, entries, jevActiveKey) => {
  const childrenOf = {};
  accounts.forEach((account) => {
    const id = Number(account.nJournalAccountId);
    const parentId = Number(account.nParentAccountId);
    if (id && parentId) (childrenOf[parentId] ||= []).push(id);
  });

  const active = String(jevActiveKey ?? "").trim() || "A";
  const ownSums = {};
  entries.forEach((entry) => {
    if (String(entry?.jev?.cStatus ?? "").trim() !== active) return;
    const id = Number(entry.nJournalAccountId);
    if (!id) return;
    ownSums[id] = (ownSums[id] || 0) + (Number(entry.dAmount) || 0);
  });

  const balances = {};
  accounts.forEach((account) => {
    if (account.cAccountType !== "F") return;
    const rootId = Number(account.nJournalAccountId);
    if (!rootId) return;

    let total = 0;
    const seen = new Set();
    const stack = [rootId];
    while (stack.length) {
      const id = stack.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      total += ownSums[id] || 0;
      (childrenOf[id] || []).forEach((childId) => stack.push(childId));
    }
    balances[rootId] = Math.round((total + Number.EPSILON) * 100) / 100;
  });
  return balances;
};

// Returns { [fundAccountId]: balance }. A fund with no posted lines still gets
// an entry (₱0.00); an account that is not a fund never does, so callers can
// simply skip the suffix.
export const loadFundBalances = (
  accountsResponse,
  { jevActiveKey = "A", force = false } = {},
) => {
  const key = String(jevActiveKey ?? "").trim() || "A";
  const fresh =
    !force &&
    cache.key === key &&
    cache.data != null &&
    Date.now() - cache.at < CACHE_MS;

  if (fresh) return Promise.resolve(cache.data);
  if (!force && cache.promise && cache.promiseKey === key) {
    return cache.promise;
  }

  const promise = (async () => {
    try {
      const accounts = asList(accountsResponse);
      // No fund accounts → don't download every JEV line for nothing.
      if (!accounts.some((a) => a.cAccountType === "F")) return {};
      const entries = asList(await JevEntriesAPI.getAll());
      return computeFundBalances(accounts, entries, key);
    } catch (err) {
      console.error("Fund balance lookup failed:", err);
      return cache.key === key && cache.data ? cache.data : {};
    }
  })();

  cache.promise = promise;
  cache.promiseKey = key;

  promise.then(
    (map) => {
      // A forced refresh may have replaced this request — only the newest
      // result may become the cache.
      if (cache.promise !== promise) return;
      cache.key = key;
      cache.data = map;
      cache.at = Date.now();
      cache.promise = null;
      cache.promiseKey = "";
    },
    () => {
      if (cache.promise !== promise) return;
      cache.promise = null;
      cache.promiseKey = "";
    },
  );

  return promise;
};
