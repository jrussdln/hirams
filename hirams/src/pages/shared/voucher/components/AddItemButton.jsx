import React from "react";
import { Box } from "@mui/material";
import { AddOutlined } from "@mui/icons-material";

/**
 * The "Add Item" button — it adds a particular to the voucher.
 *
 * It sits in the right corner of a list header (or of a lone row), just
 * left of the triangle that folds the list away. It is a round icon
 * button, the same shape as the triangle and the delete beside it.
 */
export default function AddItemButton({ onClick, c, label = "Add Item" }) {
  if (!onClick) return null;
  return (
    <Box
      component="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      sx={{
        width: { xs: 18, sm: 20 },
        height: { xs: 18, sm: 20 },
        borderRadius: "50px",
        border: `0.5px solid ${c.green.border}`,
        background: c.green.bg,
        color: c.green.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 0,
        cursor: "pointer",
        flexShrink: 0,
        transition: "all 0.15s",
        "&:hover": { background: c.green.hover, borderColor: c.green.text },
        "&:active": { background: c.green.active },
      }}
    >
      <AddOutlined sx={{ fontSize: "0.75rem" }} />
    </Box>
  );
}
