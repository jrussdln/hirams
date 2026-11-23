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
          count={count}
          countLoading={countLoading}
          onClick={() => onSelect(String(code))}
        />
      );
    })}
  </>
);

export default StatusSubItems;
