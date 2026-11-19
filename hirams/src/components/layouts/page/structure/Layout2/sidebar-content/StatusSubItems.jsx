import React from "react";
import SidebarSubmenu from "../sidebar/SidebarSubmenu";

const StatusSubItems = ({
  statusMap,
  items,
  selectedCode,
  onSelect,
  isOnPage,
  statusCodeKey = "statusCode",
  countLoading,
  // The status code that should wear the Needs Attention treatment
  // (blinking triangle + amber pulse) whenever its count is above zero.
  attentionCode,
}) => (
  <>
    {Object.entries(statusMap).map(([code, label]) => {
      const count = items.filter(
        (item) => String(item[statusCodeKey]) === String(code),
      ).length;
      return (
        <SidebarSubmenu
          key={code}
          label={label}
          active={isOnPage && selectedCode === String(code)}
          attention={
            attentionCode != null &&
            String(code) === String(attentionCode) &&
            count > 0
          }
          count={count}
          countLoading={countLoading}
          onClick={() => onSelect(String(code))}
        />
      );
    })}
  </>
);

export default StatusSubItems;
