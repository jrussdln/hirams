import React from "react";
import PageLayout from "../../../components/layouts/page/content-page";
import CustomTable from "../../../components/ui/form/Table";
import CustomSearchField from "../../../components/ui/form/SearchField";
import BaseButton from "../../../components/ui/form/BaseButton";
import SyncMenu from "../../../components/ui/form/SyncMenu";
import UserAEModal from "./modal/UserAEModal";
import InfoUserModal from "./modal/InfoUserModal";
import DeleteVerificationModal from "../../shared/transactions/modal/DeleteVerificationModal";
import { Add, Edit, Delete, HowToReg, PersonOff, PersonAdd, Phone, Email } from "@mui/icons-material";
import MediaRoute from "../../../routes/MediaRoute";
import { useTheme } from "@mui/material/styles";
import getThemeColors from "../../../utils/style/getThemeColors"; // ✅ FIXED PATH
import {
  NO_NAME,
  NO_NICKNAME,
  NO_USERNAME,
  NO_SEX,
  NO_USER_TYPE,
  NO_USER_STATUS,
  NO_PHONE,
  NO_EMAIL,
} from "../../../constants/tableDataFallbacks";

// ─────────────────────────────────────────────────────────────────────
// LOCAL COLOR MAP — only tokens this component actually uses
// ─────────────────────────────────────────────────────────────────────
const useColors = (c) => ({
  border: c.slate.border,
  textPrimary: c.gray.textPrimary,
  textSecondary: c.gray.textSecondary,
});

export default function UserView({ search, setSearch, page, rowsPerPage, openUserModal, openInfoModal, openDeleteModal, selectedUser, entityToDelete, loading, selectedStatusCode, activeStatusKey, inactiveStatusKey, forApprovalStatusKey, activeStatusLabel, inactiveStatusLabel, forApprovalStatusLabel, maleKey, femaleKey, userTypes, statuses, filteredUsers, getStatusDisplay, fetchUsers, handleAddClick, handleEditClick, handleInfoClick, handleDeleteClick, handleCloseUserModal, handleCloseInfoModal, handleCloseDeleteModal, handlePageChange, handleRowsPerPageChange, handleRowClick, handleApprove, handleSetActive, handleSetInactive, handleRedirect }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = React.useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = React.useMemo(() => useColors(base), [base]);

  const columns = React.useMemo(
    () => [
      {
        key: "fullName",
        label: "User",
        xs: 3,
        render: (_, row) => {
          const hasName = Boolean(row.fullName?.trim());
          const hasNickname = Boolean(row.nickname?.trim());
          const hasUsername = Boolean(row.username?.trim());

          let secondary = "";
          if (hasNickname && hasUsername)
            secondary = `${row.nickname} (@${row.username})`;
          else if (hasNickname) secondary = row.nickname;
          else if (hasUsername) secondary = `(@${row.username})`;
          else secondary = `${NO_NICKNAME} · ${NO_USERNAME}`;

          return (
            <div className="flex items-center gap-2">
              <img
                src={MediaRoute.resolveProfileImage(row)}
                alt={row.fullName}
                onError={(e) => { e.target.src = MediaRoute.resolveProfileImage(null); }}
                className="w-7 h-7 rounded-full object-cover border flex-shrink-0"
                style={{ borderColor: colors.border }}
              />
              <div className="min-w-0">
                {hasName ? (
                  <span
                    className="block text-sm font-medium leading-tight"
                    style={{ color: colors.textPrimary }}
                  >
                    {row.fullName}
                  </span>
                ) : (
                  <span
                    className="block text-xs font-light italic leading-tight"
                    style={{ color: colors.textSecondary }}
                  >
                    {NO_NAME}
                  </span>
                )}
                <span
                  className="block text-xs font-light italic leading-tight -mt-0.5"
                  style={{ color: colors.textSecondary }}
                >
                  {secondary}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        key: "sex",
        label: "Sex",
        align: "center",
        xs: 1,
        render: (_, row) =>
          row.sex?.trim() ? (
            row.sex
          ) : (
            <span className="text-xs font-light italic">{NO_SEX}</span>
          ),
      },
      {
        key: "type",
        label: "Type/Status",
        align: "right",
        xs: 2,
        render: (_, row) => {
          const { text } = getStatusDisplay(row);
          return (
            <div className="min-w-0 text-right">
              {row.type?.trim() ? (
                <span
                  className="block text-xs font-medium leading-tight"
                  style={{ color: colors.textPrimary }}
                >
                  {row.type}
                </span>
              ) : (
                <span
                  className="block text-xs font-light italic leading-tight"
                  style={{ color: colors.textSecondary }}
                >
                  {NO_USER_TYPE}
                </span>
              )}
              <span
                className="block text-xs font-light italic leading-tight -mt-0.5"
                style={{ color: colors.textSecondary }}
              >
                {text || NO_USER_STATUS}
              </span>
            </div>
          );
        },
      },
      {
        key: "phone",
        label: "Contact",
        xs: 2,
        render: (_, row) => (
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <Phone sx={{ fontSize: 12, color: colors.textPrimary }} />
              <span
                className="text-xs font-light italic leading-tight"
                style={{ color: colors.textPrimary }}
              >
                {row.phoneNumber?.trim() ? row.phoneNumber : NO_PHONE}
              </span>
            </div>
            <div className="flex items-center gap-1.5 -mt-0.5">
              <Email sx={{ fontSize: 12, color: colors.textSecondary }} />
              <span
                className="text-xs font-light italic leading-tight"
                style={{ color: colors.textSecondary }}
              >
                {row.email?.trim() ? row.email : NO_EMAIL}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "center",
        xs: 1,
        render: (_, row) => {
          const isActive = row.statusCode === activeStatusKey;
          const isPending = row.statusCode === forApprovalStatusKey;
          const isInactive = row.statusCode === inactiveStatusKey;
          return (
            <div className="flex justify-center gap-1">
              {isActive && (
                <BaseButton
                  icon={<Edit fontSize="small" />}
                  tooltip="Edit User"
                  actionColor="edit"
                  onClick={(e) => { e.stopPropagation(); handleEditClick(row); }}
                />
              )}
              {isPending && (
                <BaseButton
                  icon={<HowToReg fontSize="small" />}
                  tooltip="Approve User"
                  actionColor="approve"
                  onClick={(e) => { e.stopPropagation(); handleInfoClick(row); }}
                />
              )}
              {isActive && (
                <BaseButton
                  icon={<PersonOff fontSize="small" />}
                  tooltip="Deactivate User"
                  actionColor="deactivate"
                  onClick={(e) => { e.stopPropagation(); handleInfoClick(row); }}
                />
              )}
              {isInactive && (
                <BaseButton
                  icon={<PersonAdd fontSize="small" />}
                  tooltip="Activate User"
                  actionColor="revert"
                  onClick={(e) => { e.stopPropagation(); handleInfoClick(row); }}
                />
              )}
              {!isActive && (
                <BaseButton
                  icon={<Delete fontSize="small" />}
                  tooltip="Delete User"
                  actionColor="delete"
                  onClick={(e) => { e.stopPropagation(); handleDeleteClick(row); }}
                />
              )}
            </div>
          );
        },
      },
    ],
    [
      colors,
      activeStatusKey,
      inactiveStatusKey,
      forApprovalStatusKey,
      getStatusDisplay,
      handleEditClick,
      handleInfoClick,
      handleDeleteClick,
    ],
  );

  return (
    <PageLayout
      title="Users"
      subtitle={ selectedStatusCode && statuses[selectedStatusCode] ? `${statuses[selectedStatusCode]}` : "" }
    >
      <section className="flex items-center gap-2 mb-3">
        <div className="flex-grow">
          <CustomSearchField
            label="Search User"
            value={search}
            onChange={setSearch}
          />
        </div>
        <SyncMenu onSync={fetchUsers} />
        <BaseButton
          label="User"
          tooltip="Add User"
          icon={<Add fontSize="small" />}
          onClick={handleAddClick}
          actionColor="approve"
          variant="contained"
        />
      </section>

      <section>
        <CustomTable
          columns={columns}
          rows={filteredUsers}
          page={page}
          loading={loading}
          rowsPerPage={rowsPerPage}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          onRowClick={handleRowClick}
        />
      </section>

      <UserAEModal
        open={openUserModal}
        handleClose={handleCloseUserModal}
        activeStatusKey={activeStatusKey}
        user={selectedUser}
        onUserSaved={fetchUsers}
      />
      <InfoUserModal
        open={openInfoModal}
        handleClose={handleCloseInfoModal}
        userData={selectedUser}
        onApprove={handleApprove}
        onActive={handleSetActive}
        onInactive={handleSetInactive}
        onRedirect={handleRedirect}
        activeStatusKey={activeStatusKey}
        inactiveStatusKey={inactiveStatusKey}
        forApprovalStatusKey={forApprovalStatusKey}
        activeStatusLabel={activeStatusLabel}
        inactiveStatusLabel={inactiveStatusLabel}
        forApprovalStatusLabel={forApprovalStatusLabel}
        maleKey={maleKey}
        femaleKey={femaleKey}
        userTypes={userTypes}
      />
      <DeleteVerificationModal
        open={openDeleteModal}
        onClose={handleCloseDeleteModal}
        entityToDelete={entityToDelete}
        onSuccess={fetchUsers}
      />
    </PageLayout>
  );
}