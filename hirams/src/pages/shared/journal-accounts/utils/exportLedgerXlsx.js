/**
 * The Ledger report → Excel (.xlsx).
 *
 * One sheet per export, laid out like the on-screen report:
 *   • title rows — the account's full path and the chosen date window
 *   • header row — Date · JEV No. · Particulars · From · To · Balance
 *   • one block per account (the reported account first, then its linked
 *     accounts depth-first, exactly the order the panel draws them),
 *     entries oldest → newest with a running Balance column
 *   • a From / To / Balance total under each block and a GRAND TOTAL row
 *
 * The SAME filter rules the panel applies before drawing rows:
 *   • only entries whose JEV is ACTIVE (jevActiveKey)
 *   • only entries whose JEV day falls inside the chosen window (the
 *     "YYYY-MM-DD" prefix is compared, so no timezone shift can move an
 *     entry across a range edge)
 *   • only entries whose JEV belongs to a chosen company, when the filter
 *     window carries companyIds — resolved from the nested JEV payload
 *     first, then the voucher / inventory map (companyIdByJevId) the panel
 *     passes down, exactly the chain LedgerPanel uses on screen
 *
 * Particulars mirrors the panel's resolution: the JEV's own title leads,
 * falling back to the counterpart account names, and a journal saved
 * without a title says so.
 */
import * as XLSX from "xlsx";

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// jev.dtOccur is a MySQL datetime — format the "YYYY-MM-DD" prefix by hand.
export const formatDay = (raw) => {
  const s = String(raw ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s ? s.slice(0, 10) : "";
  return `${MONTH_SHORT[Number(m[2]) - 1] ?? m[2]} ${Number(m[3])}, ${m[1]}`;
};

// The linked subtree of the reported account, rebuilt from the FULL chart
// so an active page search can never hide a link from the export — the
// same walk LedgerPanel does.
const linkedChildrenOf = (account, allAccounts) => {
  if (!account) return [];
  if (!allAccounts?.length) return account.children ?? [];

  const byParent = {};
  allAccounts.forEach((a) => {
    if (!a.nParentAccountId) return;
    (byParent[a.nParentAccountId] ||= []).push(a);
  });

  const seen = new Set();
  const walk = (parentId, depth) =>
    (byParent[parentId] ?? []).map((c) => {
      if (seen.has(c.id) || depth > 50) return { ...c, children: [] };
      seen.add(c.id);
      return { ...c, children: walk(c.id, depth + 1) };
    });

  return walk(account.id, 0);
};

// Flattened (node, depth) list — parent before its children.
const flatten = (nodes, depth = 0, out = []) => {
  nodes.forEach((n) => {
    out.push({ node: n, depth });
    flatten(n.children || [], depth + 1, out);
  });
  return out;
};

// The counterpart account names of an entry — the other lines of the same
// JEV that moved the money the opposite way. Only read when the journal
// carries no title of its own.
const counterpartNamesOf = (entry, byJev, nameById) => {
  const amt = Number(entry.dAmount) || 0;
  const isOut = amt < 0;
  return (byJev[entry.nJEVId] || [])
    .filter((s) => s !== entry && Number(s.dAmount) < 0 !== isOut)
    .map((s) => nameById[s.nJournalAccountId] ?? "—");
};

/**
 * Builds the workbook and downloads it. Returns the file name that was
 * written, so the caller can name it in the success toast.
 */
export const exportLedgerXlsx = ({
  account,
  allAccounts = [],
  jevEntries = [],
  jevActiveKey = "A",
  dateRange = null,
  // nJEVId → nCompanyId fallback map (built by LedgerPanel from the voucher
  // + inventory fetches) — used when the nested JEV payload can't name a
  // company. Same map the on-screen company filter consults.
  companyIdByJevId = {},
}) => {
  if (!account) return null;

  const activeStatus = String(jevActiveKey ?? "").trim() || "A";
  const { from, to, companyIds } = dateRange || {};

  // Company filter — mirrors LedgerPanel's matchesCompany: "all" (or an
  // empty selection) means every company; otherwise an entry passes only
  // when its JEV resolves to one of the chosen company ids — or when it
  // resolves to NONE at all and the "none" sentinel (No Company) is chosen.
  const hasCompanyFilter =
    Array.isArray(companyIds) &&
    !companyIds.includes("all") &&
    companyIds.length > 0;
  const companyIdOf = (e) => {
    const jId = e.nJEVId != null ? String(e.nJEVId) : null;
    return (
      e?.jev?.company?.nCompanyId ??
      e?.jev?.transactions?.[0]?.company?.nCompanyId ??
      e?.jev?.vouchers?.[0]?.company?.nCompanyId ??
      e?.jev?.inventories?.[0]?.purchaseOption?.transactionItem?.transaction
        ?.company?.nCompanyId ??
      (jId ? companyIdByJevId[jId] : null)
    );
  };
  const matchesCompany = (e) => {
    if (!hasCompanyFilter) return true;
    const compId = companyIdOf(e);

    // "No Company" — the JEV resolves to no company at all; it passes
    // only when the "none" sentinel is among the chosen ids.
    if (compId == null) return companyIds.includes("none");
    return companyIds
      .filter((x) => x !== "none")
      .map(Number)
      .includes(Number(compId));
  };

  const dayOf = (e) => String(e?.jev?.dtOccur ?? "").slice(0, 10);
  const inRange = (day) => {
    if (!from && !to) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  };

  // Active + in-window + in-company entries, indexed by account and JEV.
  const byAccount = {};
  const byJev = {};
  (jevEntries || []).forEach((e) => {
    if (String(e?.jev?.cStatus ?? "").trim() !== activeStatus) return;
    if (!inRange(dayOf(e))) return;
    if (!matchesCompany(e)) return;
    (byAccount[e.nJournalAccountId] ||= []).push(e);
    (byJev[e.nJEVId] ||= []).push(e);
  });

  const nameById = {};
  allAccounts.forEach((a) => {
    nameById[a.id] = a.accountName;
  });
  nameById[account.id] = account.accountName;

  // Account path — walk up the chart from the reported account.
  const byId = {};
  allAccounts.forEach((a) => {
    byId[a.id] = a;
  });
  const pathParts = [account.accountName];
  {
    const seen = new Set([account.id]);
    let pid = account.nParentAccountId;
    while (pid && byId[pid] && !seen.has(pid)) {
      seen.add(pid);
      pathParts.unshift(byId[pid].accountName);
      pid = byId[pid].nParentAccountId;
    }
  }
  const accountPath = pathParts.join(" / ");

  // The date window, in words — the same wording as the panel's date chip.
  const rangeActive = !!(from || to);
  const f = from ? formatDay(from) : null;
  const t = to ? formatDay(to) : null;
  const rangeText = !rangeActive
    ? "All dates"
    : f && t
      ? (f === t ? f : `${f} - ${t}`)
      : (f ? `From ${f}` : `To ${t}`);

  // ── Sheet body ──────────────────────────────────────────────────────
  const COLUMNS = ["Date", "JEV No.", "Particulars", "Debit", "Credit"];
  const aoa = [[accountPath], [rangeText], [], COLUMNS];

  const sections = [
    { node: account, depth: 0 },
    ...flatten(linkedChildrenOf(account, allAccounts)),
  ];

  const grand = { from: 0, to: 0, net: 0 };

  sections.forEach(({ node }) => {
    const entries = byAccount[node.id] || [];
    if (entries.length === 0) return;

    // Oldest first — the running balance accumulates DOWN the sheet.
    const sorted = [...entries].sort((a, b) => {
      const da = String(a?.jev?.dtOccur ?? "");
      const db = String(b?.jev?.dtOccur ?? "");
      if (da !== db) return da < db ? -1 : 1;
      return (Number(a.nJEVEntryId) || 0) - (Number(b.nJEVEntryId) || 0);
    });

    // Block label — the account's own name (its path shows in the title).
    aoa.push([`${node.accountName} — ${entries.length} entr${entries.length === 1 ? "y" : "ies"}`]);

    let running = 0;
    sorted.forEach((e) => {
      const amt = Number(e.dAmount) || 0;
      running += amt;
      const isOut = amt < 0;
      const title = String(e?.jev?.strTitle ?? "").trim();
      const counterparts = title ? [] : counterpartNamesOf(e, byJev, nameById);
      aoa.push([
        formatDay(e?.jev?.dtOccur),
        e?.jev?.strJEVNumber ?? "",
        title ||
          (counterparts.length
            ? counterparts.join(", ")
            : "Title is not yet added."),
        isOut ? Math.abs(amt) : 0, // Debit — money out, printed positive
        !isOut ? amt : 0, // Credit — money in
      ]);
    });

    // Block total. The block's net always keeps its real sign, matching
    // the row balance the ledger panel shows for the account.
    const blockFrom = sorted.reduce(
      (s, e) => s + Math.min(Number(e.dAmount) || 0, 0),
      0,
    );
    const blockTo = sorted.reduce(
      (s, e) => s + Math.max(Number(e.dAmount) || 0, 0),
      0,
    );
    grand.from += blockFrom;
    grand.to += blockTo;
    aoa.push(["TOTAL", "", "", Math.abs(blockFrom), blockTo]);
    aoa.push([]); // blank spacer between blocks
  });

  // GRAND TOTAL over every block the report holds — the real signed net,
  // same rule the violet banner's Total on screen follows. Amounts print
  // without a minus sign, like the ledger table.
  let balanceRow = -1;
  if (grand.from || grand.to) {
    aoa.push(["GRAND TOTAL", "", "", Math.abs(grand.from), grand.to]);
    // The row under it carries the net balance. The Debit and Credit cells
    // of THIS row are merged into one and hold that balance value.
    balanceRow = aoa.length;
    aoa.push(["TOTAL BALANCE", "", "", Math.abs(grand.to + grand.from)]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  if (balanceRow >= 0) {
    ws["!merges"] = [
      { s: { r: balanceRow, c: 3 }, e: { r: balanceRow, c: 4 } },
    ];
  }

  // Column widths — Particulars is the wide one, money columns fixed.
  ws["!cols"] = [
    { wch: 13 },
    { wch: 13 },
    { wch: 38 },
    { wch: 14 },
    { wch: 14 },
  ];

  // Money format on every numeric cell of the two amount columns.
  // (The free SheetJS build writes number formats — cell.z — but not
  // font styles, so section / total rows are distinguished by their
  // labels, not by weight.)
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = 3; c <= 4; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === "number") cell.z = "#,##0.00";
    }
  }

  const wb = XLSX.utils.book_new();
  // Excel caps sheet names at 31 characters.
  XLSX.utils.book_append_sheet(wb, ws, account.accountName.slice(0, 31) || "Ledger");

  // "Payables - EWT from Suppliers (Sep 1, 2026 - Sep 30, 2026).xlsx"
  const safeName = (s) => String(s).replace(/[\\/:*?"<>|]/g, "-").trim();
  const fileName = safeName(`${account.accountName} (${rangeText})`) + ".xlsx";
  XLSX.writeFile(wb, fileName);
  return fileName;
};

export default exportLedgerXlsx;
