import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Link,
  useTheme,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ModalContainer from "../../../../components/layouts/modal/ModalContainer.jsx";
import FormGrid from "../../../../components/ui/form/FormGrid.jsx";
import { validateFormData } from "../../../../utils/form/validation.js";
import ClientAPI from "../../../../api/endpoints/client.api.js";
import CompanyAPI from "../../../../api/endpoints/company.api.js";
import TransactionAPI from "../../../../api/endpoints/transaction.api.js";
import { showSwal, withSpinner } from "../../../../utils/helpers/swal.jsx";
import { getPhilippinesTime } from "../../../../utils/helpers/timeZone.js";
import echo from "../../../../lib/echo.js";
import getThemeColors from "../../../../utils/style/getThemeColors.js";

// ── Theme Token Map — only tokens THIS component actually uses ──
const useColors = (c) => ({
  navyText: c.navy.text, // brand navy — "New Client?" link (was color="primary")
  // Pre-Canvass banner strip (the same info-chip pair the dashboard uses)
  bannerBg: c.blue.infoChipBg,
  bannerText: c.blue.infoChipText,
});

const steps = ["Basic Information", "Procurement Details", "Schedule Details"];

function TransactionAEModal({
  open,
  onClose,
  transaction,
  onSaved,
  itemType,
  procMode,
  procSource,
  currentUserId,
  // The Add flow's type choice, made in TransactionConfirmationModal
  // BEFORE this modal opens. Edit ignores it — the record's stored
  // bIsPreCanvas wins there.
  initialPreCanvas = false,
}) {
  const navigate = useNavigate();
  // ── THEME: standard wiring — PROMPT 1 pattern ──
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base = useMemo(() => getThemeColors(isDark), [isDark]);
  const colors = useMemo(() => useColors(base), [base]);
  const isEditMode = !!transaction;
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    nCompanyId: "",
    nClientId: "",
    strOfficeName: "",
    strOfficeNickName: "",
    bIsPreCanvas: !!initialPreCanvas,
    strTitle: "",
    strRefNumber: "",
    dTotalABC: "",
    cItemType: "",
    cProcMode: "",
    cProcSource: "",
    strCode: "",
    dtPreBidChb: false,
    dtPreBid: "",
    strPreBid_Venue: "",
    dtDocIssuanceChb: false,
    dtDocIssuance: "",
    strDocIssuance_Venue: "",
    dtDocSubmissionChb: false,
    dtDocSubmission: "",
    strDocSubmission_Venue: "",
    dtDocOpeningChb: false,
    dtDocOpening: "",
    strDocOpening_Venue: "",
    nAssignedAO: "",
  });
  const [errors, setErrors] = useState({});
  const [clientOptions, setClientOptions] = useState([]);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataReady, setDataReady] = useState(false); // ← add
  const convertToOptions = (obj) =>
    Object.entries(obj || {}).map(([value, label]) => ({ label, value }));
  const itemTypeOptions = convertToOptions(itemType);
  const procModeOptions = convertToOptions(procMode);
  const procSourceOptions = convertToOptions(procSource);
  const formatForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date)) return "";
    const pad = (n) => (n < 10 ? "0" + n : n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  useEffect(() => {
    if (
      isEditMode &&
      transaction &&
      clientOptions.length &&
      companyOptions.length
    ) {
      setFormData({
        nCompanyId: transaction.company?.nCompanyId || "",
        nClientId: transaction.client?.nClientId || "",
        nAssignedAO: transaction.nAssignedAO || "",
        strOfficeName: transaction.strOfficeName || "",
        strOfficeNickName: transaction.strOfficeNickName || "",
        bIsPreCanvas: !!transaction.bIsPreCanvas,
        strTitle: transaction.strTitle || "",
        strRefNumber: transaction.strRefNumber || "",
        dTotalABC: transaction.dTotalABC || "",
        cItemType: transaction.cItemType || "",
        cProcMode: transaction.cProcMode || "",
        cProcSource: transaction.cProcSource || "",
        strCode: transaction.strCode || "",
        dtPreBid: formatForInput(transaction.dtPreBid),
        strPreBid_Venue: transaction.strPreBid_Venue || "",
        dtDocIssuance: formatForInput(transaction.dtDocIssuance),
        strDocIssuance_Venue: transaction.strDocIssuance_Venue || "",
        dtDocSubmission: formatForInput(transaction.dtDocSubmission),
        strDocSubmission_Venue: transaction.strDocSubmission_Venue || "",
        dtDocOpening: formatForInput(transaction.dtDocOpening),
        strDocOpening_Venue: transaction.strDocOpening_Venue || "",
        dtPreBidChb: !!transaction.dtPreBid,
        dtDocIssuanceChb: !!transaction.dtDocIssuance,
        dtDocSubmissionChb: !!transaction.dtDocSubmission,
        dtDocOpeningChb: !!transaction.dtDocOpening,
      });
    }
  }, [transaction, clientOptions, companyOptions]);

  useEffect(() => {
    if (!open) return; // don't fetch if modal isn't open

    setDataReady(false); // reset on each open
    // The Add flow's type choice (Pre-Canvass) arrives as a prop —
    // apply it fresh on every open so a previous session's type
    // doesn't leak into the next Add.
    if (!isEditMode) {
      setFormData((prev) => ({ ...prev, bIsPreCanvas: !!initialPreCanvas }));
    }

    (async () => {
      try {
        const [clientsData, companiesData] = await Promise.all([
          ClientAPI.getActiveClients(),
          CompanyAPI.getCompanies(),
        ]);

        setClientOptions(
          (clientsData.clients || []).map((c) => ({
            label: c.strClientNickName,
            value: c.nClientId,
          })),
        );

        setCompanyOptions(
          (companiesData.companies || []).map((c) => ({
            label: c.strCompanyNickName,
            value: c.nCompanyId,
          })),
        );
      } catch (e) {
        console.error(e);
      } finally {
        setDataReady(true); // ← only true once both are loaded
      }
    })();
  }, [open, initialPreCanvas, isEditMode]); // ← re-fetch when the modal opens
  // Add this useEffect after the existing ones, before handleChange
  useEffect(() => {
    if (!open) return;

    const companiesChannel = echo.channel("companies");
    const clientsChannel = echo.channel("clients");

    companiesChannel.listen(".company.updated", async () => {
      try {
        const companiesData = await CompanyAPI.getCompanies();
        setCompanyOptions(
          (companiesData.companies || []).map((c) => ({
            label: c.strCompanyNickName,
            value: c.nCompanyId,
          })),
        );
      } catch (e) {
        console.error(e);
      }
    });

    clientsChannel.listen(".client.updated", async () => {
      try {
        const clientsData = await ClientAPI.getActiveClients();
        setClientOptions(
          (clientsData.clients || []).map((c) => ({
            label: c.strClientNickName,
            value: c.nClientId,
          })),
        );
      } catch (e) {
        console.error(e);
      }
    });

    return () => {
      echo.leaveChannel("companies");
      echo.leaveChannel("clients");
    };
  }, [open]);
  // Updated to use Philippines timezone
  const getLocalDateTime = () => {
    const philippinesTime = getPhilippinesTime();
    const pad = (n) => (n < 10 ? "0" + n : n);
    return `${philippinesTime.getFullYear()}-${pad(philippinesTime.getMonth() + 1)}-${pad(
      philippinesTime.getDate(),
    )}T${pad(philippinesTime.getHours())}:${pad(philippinesTime.getMinutes())}`;
  };
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => {
      const updated = { ...prev };

      if (type === "checkbox") {
        updated[name] = checked;

        const map = {
          dtPreBidChb: ["dtPreBid", "strPreBid_Venue"],
          dtDocIssuanceChb: ["dtDocIssuance", "strDocIssuance_Venue"],
          dtDocSubmissionChb: ["dtDocSubmission", "strDocSubmission_Venue"],
          dtDocOpeningChb: ["dtDocOpening", "strDocOpening_Venue"],
        };

        if (map[name]) {
          const [d, v] = map[name];
          updated[d] = checked ? getLocalDateTime() : "";
          if (!checked) updated[v] = "";
        }
      } else {
        updated[name] = value;
      }

      return updated;
    });

    setErrors((prev) => ({ ...prev, [name]: "" }));
  };
  const validateStep = (step) => {
    let fieldsToCheck = [];

    if (step === 0) fieldsToCheck = ["strCode", "nCompanyId", "nClientId"];

    if (step === 1)
      fieldsToCheck = [
        "strTitle",
        "strOfficeName",
        "strOfficeNickName",
        "cItemType",
        "cProcMode",
        "cProcSource",
        "dTotalABC",
      ];

    if (step === 2) {
      if (formData.dtPreBidChb) fieldsToCheck.push("dtPreBid");
      if (formData.dtDocIssuanceChb) fieldsToCheck.push("dtDocIssuance");
      if (formData.dtDocSubmissionChb) fieldsToCheck.push("dtDocSubmission");
      if (formData.dtDocOpeningChb) fieldsToCheck.push("dtDocOpening");
    }

    const allErrors = validateFormData(formData, "TRANSACTION");

    let stepErrors = Object.fromEntries(
      Object.entries(allErrors).filter(([k]) => fieldsToCheck.includes(k)),
    );

    // Chronological validation
    if (step === 2) {
      const seq = [
        ["dtPreBidChb", "dtPreBid", "Pre-Bid"],
        ["dtDocIssuanceChb", "dtDocIssuance", "Doc Issuance"],
        ["dtDocSubmissionChb", "dtDocSubmission", "Doc Submission"],
        ["dtDocOpeningChb", "dtDocOpening", "Doc Opening"],
      ]
        .filter(([c]) => formData[c])
        .map(([c, f, label]) => ({
          key: f,
          date: new Date(formData[f]),
          label,
        }));

      for (let i = 1; i < seq.length; i++) {
        if (seq[i].date < seq[i - 1].date) {
          stepErrors[seq[i].key] =
            `${seq[i].label} must not be earlier than ${seq[i - 1].label}`;
        }
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };
  const handleNext = () => {
    if (!validateStep(activeStep)) return;
    setActiveStep((s) => s + 1);
  };
  const handleBack = () => setActiveStep((s) => s - 1);
  const handleOnSave = () => {
    if (activeStep < steps.length - 1) handleNext();
    else handleSave();
  };
  const handleSave = async () => {
    if (!validateStep(2)) return;
    const entity = formData.strCode?.trim() || "Transaction";
    try {
      onClose();
      setActiveStep(0);
      setLoading(true);
      if (isEditMode) {
        await withSpinner(entity, async () => {
          await TransactionAPI.updateTransaction(
            transaction.nTransactionId,
            { ...formData, nUserId: currentUserId },
          );
        });
        onSaved?.();
        await showSwal("SUCCESS", {}, { entity, action: "updated" });
      } else {
        await withSpinner(entity, async () => {
          await TransactionAPI.createTransaction({
            ...formData,
            nUserId: currentUserId,
          });
        });
        onSaved?.();
        await showSwal("SUCCESS", {}, { entity, action: "added" });
      }
    } catch (e) {
      console.error(e);
      await showSwal("ERROR", {}, { entity });
    } finally {
      setLoading(false);
    }
  };
  const getStepFields = (step) => {
    return step === 0
      ? [
          { label: "Transaction Code", name: "strCode", xs: 12 },
          {
            label: "Company",
            name: "nCompanyId",
            type: "select",
            options: companyOptions,
            xs: 6,
          },
          {
            label: "Client",
            name: "nClientId",
            type: "select",
            options: clientOptions,
            xs: 6,
          },
          {
            name: "_clientLink",
            type: "custom",
            xs: 12,
            render: () => (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  textAlign: "right",
                  mt: -0.5,
                  fontSize: "0.65rem",
                  lineHeight: 1,
                }}
              >
                New Client?{" "}
                <Link
                  component="button"
                  underline="hover"
                  sx={{ fontSize: "inherit", color: colors.navyText }}
                  onClick={() => {
                    onClose();
                    navigate("/client?add=true");
                  }}
                >
                  Click here
                </Link>
              </Typography>
            ),
          },
        ] : step === 1
        ? [
            { label: "Title", name: "strTitle", xs: 12 },
            {
              // The transacting office — required. Its nickname rides
              // along in the list's Client cell as "clientNick (OfficeNick)".
              label: "Office",
              name: "strOfficeName",
              xs: 6,
            },
            {
              label: "Office Nickname",
              name: "strOfficeNickName",
              xs: 6,
            },
            {
              label: "Item Type",
              name: "cItemType",
              type: "select",
              options: itemTypeOptions,
              xs: 3,
            },
            {
              label: "Mode",
              name: "cProcMode",
              type: "select",
              options: procModeOptions,
              xs: 4,
            },
            {
              label: "Source",
              name: "cProcSource",
              type: "select",
              options: procSourceOptions,
              xs: 5,
            },
            { label: "Reference Number", name: "strRefNumber", xs: 6 },
            { label: "Total ABC", name: "dTotalABC", type: "peso", xs: 6 },
          ]
        : [
            { name: "dtPreBidChb", type: "checkbox", xs: 1 },
            {
              label: "Pre-Bid",
              name: "dtPreBid",
              type: "datetime-local",
              xs: 5,
              dependsOn: "dtPreBidChb",
            },
            {
              label: "Pre-Bid Venue",
              name: "strPreBid_Venue",
              xs: 6,
              disabled: !formData.dtPreBidChb,
            },
            { name: "dtDocIssuanceChb", type: "checkbox", xs: 1 },
            {
              label: "Doc Issuance",
              name: "dtDocIssuance",
              type: "datetime-local",
              xs: 5,
              dependsOn: "dtDocIssuanceChb",
            },
            {
              label: "Doc Issuance Venue",
              name: "strDocIssuance_Venue",
              xs: 6,
              disabled: !formData.dtDocIssuanceChb,
            },
            { name: "dtDocSubmissionChb", type: "checkbox", xs: 1 },
            {
              label: "Doc Submission",
              name: "dtDocSubmission",
              type: "datetime-local",
              xs: 5,
              dependsOn: "dtDocSubmissionChb",
            },
            {
              label: "Doc Submission Venue",
              name: "strDocSubmission_Venue",
              xs: 6,
              disabled: !formData.dtDocSubmissionChb,
            },
            { name: "dtDocOpeningChb", type: "checkbox", xs: 1 },
            {
              label: "Doc Opening",
              name: "dtDocOpening",
              type: "datetime-local",
              xs: 5,
              dependsOn: "dtDocOpeningChb",
            },
            {
              label: "Doc Opening Venue",
              name: "strDocOpening_Venue",
              xs: 6,
              disabled: !formData.dtDocOpeningChb,
            },
          ];
  };

  return (
    <ModalContainer
      open={open}
      handleClose={onClose}
      title={isEditMode ? "Edit Transaction" : "Add Transaction"}
      subTitle={formData.strCode?.trim() ? `${formData.strCode.trim()}` : ""}
      onSave={handleOnSave}
      onCancel={() => (activeStep > 0 ? handleBack() : onClose())}
      loading={loading || !dataReady}
      cancelLabel={activeStep > 0 ? "Previous" : "Cancel"}
      saveLabel={activeStep < steps.length - 1 ? "Next" : "Save"}
    >
      {/* ── Transaction type banner — the Pre-Canvass choice was made in
          the confirm dialog (Add) or comes from the record (Edit). ── */}
      {formData.bIsPreCanvas && (
        <Box
          sx={{
            mb: 2,
            px: 1.5,
            py: 0.75,
            borderRadius: "8px",
            bgcolor: colors.bannerBg,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: colors.bannerText, fontWeight: 600 }}
          >
            Pre-Canvass — items will be gathered through canvassing before
            procurement.
          </Typography>
        </Box>
      )}

      <Box sx={{ mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>
                <Typography variant="body2" fontWeight={500}>
                  {label}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <FormGrid
        fields={getStepFields(activeStep)}
        formData={formData}
        errors={errors}
        handleChange={handleChange}
        autoFocus={`${open}-${activeStep}`}
      />
    </ModalContainer>
  );
}

export default TransactionAEModal;
