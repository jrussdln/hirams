import React, { useMemo } from "react";
import { Typography, Divider, Grid, Box, Chip, useTheme } from "@mui/material";
import { getDueDateColor } from "../../../../utils/helpers/dueDateColor";
import getThemeColors from "../../../../utils/style/getThemeColors";

// ─── Icons ──────────────────────────────────────────────────────────────────
// Section headers
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
// Field items
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CardStructure from "../../../../components/ui/structure/CardStructure";

// ─── Constants ──────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  220: "success",
  210: "warning",
  200: "info",
  default: "default",
};

// Variant per schedule step, fed into CardStructure (replaces old SCHEDULE_COLORS)
const SCHEDULE_VARIANTS = ["info", "success", "warn", "default"];

const scheduleKeys = ["PreBid", "DocIssuance", "DocSubmission", "DocOpening"];

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatDateTime(dateString) {
  if (!dateString) return null;
  // The API sends MySQL datetimes ("2026-10-21 17:08:30"). Only Chrome
  // reads that as a date on its own — the space becomes the "T" so every
  // browser parses it, and it stays LOCAL time (no Z, no offset).
  const date = new Date(String(dateString).replace(" ", "T"));
  return isNaN(date)
    ? null
    : date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
}

// ─── Sub-components ────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, showTopDivider = true }) {
  return (
    <>
      {showTopDivider && <Divider sx={{ mb: 1 }} />}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Icon sx={{ fontSize: 15, color: "text.secondary", opacity: 0.7 }} />
        <Typography
          variant="overline"
          sx={{
            fontSize: "0.65rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: "text.secondary",
            lineHeight: 1,
          }}
        >
          {label}
        </Typography>
      </Box>
      <Divider sx={{ mb: 1.75 }} />
    </>
  );
}

function FieldItem({
  label,
  icon: Icon,
  children,
  xs = 12,
  sm = 6,
  // The label in CAPS — the sections that carry no icons lean on it to
  // separate the label from the value.
  uppercase = false,
}) {
  return (
    <Grid item xs={xs} sm={sm}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 0.35 }}>
        {Icon && (
          <Icon
            sx={{
              fontSize: 12,
              color: "text.secondary",
              opacity: 0.55,
              flexShrink: 0,
            }}
          />
        )}
        <Typography
          variant="caption"
          sx={{
            // The label is a caption, not a headline — it names the value
            // below it, so it stays small.
            fontSize: "0.65rem",
            fontWeight: 600,
            color: "text.secondary",
            letterSpacing: "0.04em",
            lineHeight: 1,
            textTransform: uppercase ? "uppercase" : "none",
          }}
        >
          {label}
        </Typography>
      </Box>
      <Typography
        component="div"
        variant="body2"
        sx={{
          color: "text.primary",
          // The value is the thing being read — it carries the size the
          // label gave up.
          fontSize: "1rem",
          fontWeight: 400,
          lineHeight: 1.35,
          // The value sits under the label — indented only when an icon
          // pushed the label to the right in the first place.
          ml: Icon ? 2 : 0,
        }}
      >
        {children ?? "—"}
      </Typography>
    </Grid>
  );
}

// Now built on top of the shared CardStructure shell instead of a hand-rolled Box.
function ScheduleCard({ label, date, venue, variant = "default", dateColor }) {
  const hasDate = Boolean(date);
  const hasVenue = Boolean(venue);

  return (
    <CardStructure variant={variant} orientation="column" dense>
      {/* Step label row with dot */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            flexShrink: 0,
            ...(hasDate
              ? { bgcolor: `${variant}.main` }
              : {
                  bgcolor: "transparent",
                  border: "1.5px solid",
                  borderColor: "text.disabled",
                }),
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: "text.secondary",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </Typography>
      </Box>

      {/* Date row */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 0.75 }}>
        <AccessTimeOutlinedIcon
          sx={{
            fontSize: 12,
            color: "text.disabled",
            opacity: hasDate ? 0.55 : 0.35,
            flexShrink: 0,
          }}
        />
        {hasDate ? (
          <Typography
            variant="body2"
            sx={{
              color: dateColor ?? "text.primary",
              fontWeight: dateColor ? 600 : 400,
              lineHeight: 1.4,
              fontSize: "0.78rem",
            }}
          >
            {date}
          </Typography>
        ) : (
          <Typography
            variant="caption"
            sx={{ color: "text.disabled", fontStyle: "italic" }}
          >
            No date attached
          </Typography>
        )}
      </Box>

      {/* Venue row */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.6 }}>
        <PlaceOutlinedIcon
          sx={{
            fontSize: 12,
            color: "text.disabled",
            opacity: hasVenue ? 0.55 : 0.35,
            mt: "1px",
            flexShrink: 0,
          }}
        />
        {hasVenue ? (
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", lineHeight: 1.3 }}
          >
            {venue}
          </Typography>
        ) : (
          <Typography
            variant="caption"
            sx={{ color: "text.disabled", fontStyle: "italic" }}
          >
            No venue attached
          </Typography>
        )}
      </Box>
    </CardStructure>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
const TransactionDetails = ({
  details,
  statusTransaction,
  itemType,
  procMode,
  procSourceLabel,
  showTransactionDetails,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);

  // Derived values
  const effectiveStatus =
    details?.current_status === 225 ? 220 : details?.current_status;
  const statusColor = STATUS_COLOR[effectiveStatus] ?? STATUS_COLOR.default;
  const officerName =
    `${details?.user?.strFName || ""} ${details?.user?.strLName || ""}`.trim() ||
    "Not Assigned";
  const aoDueDateColor = getDueDateColor(details?.dtAODueDate);

  // WHO raised the transaction, and WHEN. The list hands the creator over
  // as a nickname ("--" when there is none) and the API sends the moment
  // the transaction was raised as `created_at`.
  const rawCreator = details?.created_by || details?.createdBy || "";
  const creatorName = !rawCreator || rawCreator === "--" ? "—" : rawCreator;
  const createdOn = details?.created_at
    ? formatDateTime(details.created_at)
    : null;

  return (
    <Box sx={{ "& .MuiGrid-item": { pt: 1.5 } }}>
      {/* ── Transaction ──────────────────────────────────────────── */}
      {showTransactionDetails && (
        <Box sx={{ mb: 3 }}>
          <SectionHeader
            showTopDivider={false}
            icon={AssignmentOutlinedIcon}
            label="Transaction"
          />
          <Grid container spacing={0}>
            <FieldItem
              label="Assigned Account Officer"
              icon={BadgeOutlinedIcon}
              xs={12}
              sm={4}
            >
              {officerName}
            </FieldItem>
            <FieldItem label="Status" icon={FlagOutlinedIcon} xs={12} sm={4}>
              <Chip
                label={statusTransaction?.[effectiveStatus] || "—"}
                color={statusColor}
                size="small"
                sx={{ fontSize: "0.65rem", height: 20, fontWeight: 600 }}
              />
            </FieldItem>
            <FieldItem
              label="Account Officer Due Date"
              icon={EventOutlinedIcon}
              xs={12}
              sm={4}
            >
              {details?.dtAODueDate ? (
                <span
                  style={{
                    color: aoDueDateColor ?? "inherit",
                    fontWeight: aoDueDateColor ? 600 : 400,
                  }}
                >
                  {formatDateTime(details.dtAODueDate)}
                </span>
              ) : (
                "—"
              )}
            </FieldItem>
          </Grid>
        </Box>
      )}

      {/* ── Basic Information + Procurement ───────────────────────── */}
      {/* Two columns side by side: the basics on the left, the procurement
          facts on the right — each one stacked in its own column, so the
          rows line up across the two. */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 2, sm: 3 },
          }}
        >
          {/* ── Basic Information ────────────────────────────────── */}
          <Box sx={{ flex: 1, minWidth: 0 }}>            <SectionHeader
              showTopDivider={false}
              icon={PersonOutlineIcon}
              label="Basic Information"
            />
            <Grid container spacing={0}>
              <FieldItem label="Title" uppercase xs={12} sm={12}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {details?.strTitle || details?.transactionName || "—"}
                </Typography>
              </FieldItem>
              <FieldItem label="Transaction Code" uppercase xs={12} sm={12}>
                {details?.strCode || details?.transactionId || "—"}
              </FieldItem>
              <FieldItem label="Company" uppercase xs={12} sm={12}>
                {details?.company?.strCompanyNickName ||
                  details?.companyNickName ||
                  "—"}
              </FieldItem>
              <FieldItem label="Client" uppercase xs={12} sm={12}>
                {details?.client?.strClientNickName ||
                  details?.clientNickName ||
                  "—"}
              </FieldItem>
            </Grid>
          </Box>

          {/* THE SEPARATOR between the two columns */}
          <Divider
            orientation="vertical"
            flexItem
            sx={{ alignSelf: "stretch", mx: 0 }}
          />

          {/* ── Procurement ──────────────────────────────────────── */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <SectionHeader
              showTopDivider={false}
              icon={ShoppingCartOutlinedIcon}
              label="Procurement"
            />
            <Grid container spacing={0}>
              <FieldItem label="Item Type" uppercase xs={12} sm={12}>
                {String(
                  itemType?.[details?.cItemType] || details?.cItemType || "—",
                ).toUpperCase()}
              </FieldItem>
              <FieldItem label="Mode" uppercase xs={12} sm={12}>
                {String(
                  procMode?.[details?.cProcMode] || details?.cProcMode || "—",
                ).toUpperCase()}
              </FieldItem>
              <FieldItem label="Source" uppercase xs={12} sm={12}>
                {String(procSourceLabel || "—").toUpperCase()}
              </FieldItem>
              <FieldItem label="Total ABC" uppercase xs={12} sm={12}>
                {details?.dTotalABC ? (
                  <Box
                    sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}
                  >
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ fontWeight: 600 }}
                    >
                      ₱{" "}
                      {Number(details.dTotalABC).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Box>
                ) : (
                  "—"
                )}
              </FieldItem>
            </Grid>
          </Box>
        </Box>
      </Box>

      {/* ── Schedule ─────────────────────────────────────────────── */}
      <Box>
        <SectionHeader icon={CalendarTodayOutlinedIcon} label="Schedule" />
        <Grid container spacing={1.25}>
          {scheduleKeys.map((key, idx) => {
            const dateKey = `dt${key}`;
            const venueKey = `str${key}_Venue`;
            const label = key.replace(/([A-Z])/g, " $1").trim();
            const rawDate = details?.[dateKey];
            const dateColor = getDueDateColor(rawDate);

            return (
              <Grid item xs={12} sm={6} lg={3} key={key}>
                <ScheduleCard
                  label={label}
                  date={rawDate ? formatDateTime(rawDate) : null}
                  venue={details?.[venueKey] || null}
                  variant={SCHEDULE_VARIANTS[idx] ?? "default"}
                  dateColor={dateColor}
                />
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* ── Created By ───────────────────────────────────────────── */}
      {/* WHO raised it, and WHEN — no label, the row says it. */}
      <Box sx={{ mt: 3 }}>
        <Divider sx={{ mb: 1 }} />
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            // The creator on the left, the moment on the right — the row
            // spreads them apart instead of stacking them.
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
            rowGap: 0.5,
            // The same breathing room the other sections leave under their
            // header row — the divider must not sit on the text.
            mb: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <PersonOutlineIcon
              sx={{
                fontSize: 15,
                color: "text.secondary",
                opacity: 0.7,
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                // The name and the date wear the LABEL's type: small, bold,
                // letter-spaced and in caps.
                fontSize: "0.65rem",
                fontWeight: 600,
                color: "text.primary",
                letterSpacing: "0.04em",
                lineHeight: 1,
                textTransform: "uppercase",
              }}
            >
              {creatorName}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <CalendarTodayOutlinedIcon
              sx={{
                fontSize: 15,
                color: "text.secondary",
                opacity: 0.7,
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontSize: "0.65rem",
                fontWeight: 600,
                color: "text.secondary",
                letterSpacing: "0.04em",
                lineHeight: 1,
                textTransform: "uppercase",
              }}
            >
              {createdOn || "—"}
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 1.75 }} />
      </Box>
    </Box>
  );
};

export default TransactionDetails;
