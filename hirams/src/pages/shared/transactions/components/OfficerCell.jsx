import { NOT_YET_ASSIGNED } from "../../../../constants/tableDataFallbacks";

/**
 * The "OFFICER" cell — who raised the transaction (PO) over who owns it
 * (AO), with no date line. Two stacked rows:
 *
 *   PO: <procurement officer nickname>
 *   AO: <account officer nickname>
 *
 * Shared by the For Collection view and the Archive tabs so the three
 * tables print the identical shape. Falls back to "—" per line, and to
 * the shared italic placeholder when both are missing.
 */
const OfficerCell = ({ aoName, createdBy, mutedColor }) => {
  const lineClass =
    "truncate uppercase tracking-wide text-[0.625rem] font-medium leading-tight";
  const ao = aoName?.trim() ? aoName : "—";
  // procurement rows carry "--" as the creator placeholder
  const po = createdBy?.trim() && createdBy !== "--" ? createdBy : "—";

  if (ao === "—" && po === "—") {
    return (
      <span className="text-xs font-light italic" style={{ color: mutedColor }}>
        {NOT_YET_ASSIGNED}
      </span>
    );
  }

  return (
    <div className="min-w-0 text-left">
      <div className={lineClass}>PO: {po}</div>
      <div className={`${lineClass} -mt-0.5`}>AO: {ao}</div>
    </div>
  );
};

export default OfficerCell;
