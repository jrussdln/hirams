import { DEFAULT_FALLBACK } from "../../../../constants/tableDataFallbacks";

/**
 * The address and TIN lines of a contact block (a supplier or an
 * assignee).
 *
 * A contact with nothing on file still gets a line, so the block never
 * looks half-empty: the address falls back to "No Address attached.", the
 * TIN to "No TIN attached.", and when BOTH are missing a single
 * "No Address & TIN attached." says it once.
 */
export const contactFallbacks = (address, tin) => {
  const hasAddress = Boolean(address);
  const hasTin = Boolean(tin);
  return {
    address: address || DEFAULT_FALLBACK,
    tin: hasTin ? `TIN: ${tin}` : DEFAULT_FALLBACK,
    combined: !hasAddress && !hasTin ? DEFAULT_FALLBACK : null,
  };
};
