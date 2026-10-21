import {
  NO_ADDRESS,
  NO_TIN,
  NO_ADDRESS_TIN,
} from "../../../../constants/tableDataFallbacks";

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
    address: address || NO_ADDRESS,
    tin: hasTin ? `TIN: ${tin}` : NO_TIN,
    combined: !hasAddress && !hasTin ? NO_ADDRESS_TIN : null,
  };
};
