import React, { useMemo, useState } from "react";
import { useTheme } from "@mui/material";
import {
  Box,
  Typography,
} from "@mui/material";
import PageLayout from "../../../../../components/layouts/page/content-page";
import CustomTable from "../../../../../components/ui/form/Table";
import CustomSearchField from "../../../../../components/ui/form/SearchField";
import SyncMenu from "../../../../../components/ui/form/SyncMenu";
import BaseButton from "../../../../../components/ui/form/BaseButton";
import { Add, Edit, Delete, ArrowBack } from "@mui/icons-material";
import ContactAEModal from "../../modal/ContactAEModal";
import DeleteVerificationModal from "../../../transactions/modal/DeleteVerificationModal";
import Toast from "../../../../../components/ui/banner/Toast.jsx";
import getThemeColors from "../../../../../utils/style/getThemeColors";
import useSupplierContact from "./useSupplierContact";
import {
  NO_NAME,
} from "../../../../../constants/tableDataFallbacks";

export default function SupplierContactView() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);

  const vu = useSupplierContact();

  const [search, setSearch] = useState("");
  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vu.contacts;
    return (vu.contacts || []).filter((c) =>
      [c.strName, c.strNumber, c.strPosition, c.strDepartment]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [vu.contacts, search]);

  const columns = useMemo(
    () => [
      {
        key: "strName",
        label: "Name",
        xs: 2,
        render: (val) => val || NO_NAME,
      },
      {
        key: "strNumber",
        label: "Number",
        xs: 2,
        render: (val) => val || "—",
      },
      {
        key: "strPosition",
        label: "Position",
        xs: 2,
        render: (val) => val || "—",
      },
      {
        key: "strDepartment",
        label: "Department",
        xs: 2,
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
              tooltip="Edit Contact"
              actionColor="edit"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                vu.handleEdit(row);
              }}
            />
            <BaseButton
              icon={<Delete fontSize="small" />}
              tooltip="Delete Contact"
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
      subtitle={`Contact / ${
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
            label="Search Contacts"
            value={search}
            onChange={setSearch}
          />
        </div>
        <SyncMenu onSync={() => vu.fetchContacts(true)} />
        <BaseButton
          label="Add Contact"
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
          rows={filteredContacts}
          loading={vu.loading}
          page={0}
          rowsPerPage={filteredContacts.length || 10}
          onPageChange={() => {}}
          onRowsPerPageChange={() => {}}
        />
      </section>

      <ContactAEModal
        open={vu.contactModalOpen}
        onClose={vu.handleCloseModal}
        supplierId={vu.supplierId}
        contact={vu.selectedContact}
        onSuccess={() => vu.fetchContacts(true, true)}
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
