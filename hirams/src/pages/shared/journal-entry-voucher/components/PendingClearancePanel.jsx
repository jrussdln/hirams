import CustomSearchField from "../../../../components/ui/form/SearchField";
import CustomTable from "../../../../components/ui/form/Table";
import SyncMenu from "../../../../components/ui/form/SyncMenu";

/**
 * Content of the Collection / Pending Clearance view. The list owns the data,
 * filtering and row actions; this panel only renders the search row and the
 * JEV table so the pending-clearance screen has its own home instead of
 * borrowing the all-status list body.
 */
export default function PendingClearancePanel({
  search,
  onSearchChange,
  onSync,
  columns,
  rows,
  page,
  loading,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onRowClick,
}) {
  return (
    <>
      <section className="flex items-center gap-2 mb-3">
        <div className="flex-grow">
          <CustomSearchField
            label="Search JEV No. / Payee / Company"
            value={search}
            onChange={onSearchChange}
          />
        </div>
        <SyncMenu onSync={onSync} />
      </section>

      <section>
        <CustomTable
          columns={columns}
          rows={rows}
          page={page}
          loading={loading}
          rowsPerPage={rowsPerPage}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
          onRowClick={onRowClick}
        />
      </section>
    </>
  );
}
