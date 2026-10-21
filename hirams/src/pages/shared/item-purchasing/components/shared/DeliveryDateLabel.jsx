import React from "react";
import { Box, Typography } from "@mui/material";
import { fmtDate } from "../../../../../utils/formatters/formatter.js";
import { getDueDateColor } from "../../../../../utils/helpers/dueDateColor.js";
import { OPEN_DATE } from "../../../../../constants/tableDataFallbacks.js";

/**
 * The "Delivery: <date>" line under an item row.
 *
 * Three panels print it (Cart, Pending Receipt, For Delivery), so the rule
 * lives here once:
 *
 *   • the date wears the due-date colour — red once it has passed, orange
 *     when it is within 3 business days (getDueDateColor);
 *   • a row with no date shows the shared "Open date" placeholder
 *     (OPEN_DATE) instead of a bare dash;
 *   • the line itself keeps the muted colour it always had — only the date
 *     is allowed to break out of it.
 */
export default function DeliveryDateLabel({ date, sx = {} }) {
  const hasDate = Boolean(date);
  const dueColor = getDueDateColor(date);

  return (
    <Typography
      sx={{
        fontSize: "0.48rem",
        mt: 0.15,
        lineHeight: 1,
        ...sx,
      }}
    >
      Delivery:{" "}
      <Box
        component="span"
        sx={{
          color: dueColor ?? "inherit",
          fontWeight: dueColor ? 700 : undefined,
        }}
      >
        {hasDate ? fmtDate(date) : OPEN_DATE}
      </Box>
    </Typography>
  );
}
