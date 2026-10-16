import React from "react";
import useTransaction from "./useTransaction";
import TransactionView from "./TransactionView";

export default function Transaction() {
  const props = useTransaction();
  return <TransactionView {...props} />;
}/////