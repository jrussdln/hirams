import React, { useMemo, useState } from "react";
import { useTheme } from "@mui/material";
import PageLayout from "../../../../../components/layouts/page/content-page";
import CustomTable from "../../../../../components/ui/form/Table";
import CustomSearchField from "../../../../../components/ui/form/SearchField";
import SyncMenu from "../../../../../components/ui/form/SyncMenu";
import BaseButton from "../../../../../components/ui/form/BaseButton";
import { Add, Edit, Delete, ArrowBack } from "@mui/icons-material";
import BankAEModal from "../../modal/BankAEModal";
import DeleteVerificationModal from "../../../transactions/modal/DeleteVerificationModal";
import Toast from "../../../../../components/ui/banner/Toast.jsx";
import getThemeColors from "../../../../../utils/style/getThemeColors";
import useSupplierBank from "./useSupplierBank";

export default function SupplierBankView() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);

  const vu = useSupplierBank();

  const [search, setSearch] = useState("");
  const filteredBanks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vu.banks;
    return (vu.banks || []).filter((b) =>
      [b.strBankName, b.strAccountName, b.strAccountNumber]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [vu.banks, search]);

  const columns = useMemo(
    () => [
      {
        key: "strBankName",
        label: "Bank Name",
        xs: 3,
        render: (val) => val || "—",
      },
      {
        key: "strAccountName",
        label: "Account Name",
        xs: 3,
        render: (val) => val || "—",
      },
      {
        key: "strAccountNumber",
        label: "Account Number",
        xs: 3,
        render: (val) => val || "—",
      },
      {
        key: "actions",
        label: "Actions",
        align: "center",
        xs: 2,
        render: (_, row) => (
          <div className="flex items-center justify-center gap-1">
            <BaseButton
              icon={<Edit fontSize="small" />}
              tooltip="Edit Bank"
              actionColor="edit"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                vu.handleEdit(row);
              }}
            />
            <BaseButton
              icon={<Delete fontSize="small" />}
              tooltip="Delete Bank"
              actionColor="delete"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                vu.handleDelete(row);
              }}
            />
          </div>
        ),
      },
    ],
    [vu],
  );

  return (
    <PageLayout
      title="Supplier"
      subtitle={`Bank / ${
        vu.supplier?.supplierNickName ||
        vu.supplier?.strSupplierNickName ||
        (vu.supplierId ? `#${vu.supplierId}` : "")
      }`}
      footerLActions={
        <BaseButton
          label="Back"
          icon={<ArrowBack fontSize="small" />}
          onClick={vu.handleBack}
          actionColor="back"
          size="small"
        />
      }
    >
      <section className="flex items-center gap-2 mb-3">
        <div className="flex-grow">
          <CustomSearchField
            label="Search Banks"
            value={search}
            onChange={setSearch}
          />
        </div>
        <SyncMenu onSync={() => vu.fetchBanks(true)} />
        <BaseButton
          label="Add Bank"
          icon={<Add fontSize="small" />}
          onClick={vu.handleAdd}
          variant="contained"
          actionColor="approve"
          size="medium"
        />
      </section>

      <section>
        <CustomTable
          columns={columns}
          rows={filteredBanks}
          loading={vu.loading}
          page={0}
          rowsPerPage={filteredBanks.length || 10}
          onPageChange={() => {}}
          onRowsPerPageChange={() => {}}
        />
      </section>

      <BankAEModal
        open={vu.bankModalOpen}
        onClose={vu.handleCloseModal}
        supplierId={vu.supplierId}
        bank={vu.selectedBank}
        onSuccess={() => vu.fetchBanks(true, true)}
      />
      <DeleteVerificationModal
        open={vu.deleteModalOpen}
        onClose={vu.handleCloseDelete}
        entityToDelete={vu.entityToDelete}
        onSuccess={vu.handleDeleteSuccess}
      />
      <Toast
        open={vu.toast.open}
        message={vu.toast.message}
        severity={vu.toast.severity}
        onClose={vu.handleCloseToast}
      />
    </PageLayout>
  );
}
