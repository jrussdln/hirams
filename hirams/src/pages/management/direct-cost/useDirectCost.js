import { useState, useEffect, useCallback, useRef } from "react";
import DirectCostOptionAPI from "../../../api/endpoints/direct-cost-option.api.js";

// Same key used by DirectCostModal
const CACHE_KEY = "direct_cost_options_cache";

export default function useDirectCost() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [directCosts, setDirectCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCost, setSelectedCost] = useState(null);
  const [modalMode, setModalMode] = useState("add");
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);
  const [openTransferModal, setOpenTransferModal] = useState(false);

  const fetchDirectCosts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await DirectCostOptionAPI.getDirectCostOptions();
      const directCostsArray = response.data || response || [];

      // ✅ Keep the modal's cache in sync with fresh data
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(directCostsArray));

      const formatted = directCostsArray.map((cost) => ({
        ...cost,
        id: cost.nDirectCostOptionID,
        costName: cost.strName,
        // How many live transactions still charge a cost to this option —
        // the count that decides whether Delete or Transfer is offered.
        costsCount: Number(cost.costs_count ?? 0),
      }));
      setDirectCosts(formatted);
    } catch (error) {
      console.error("Error fetching direct costs:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchRef = useRef(fetchDirectCosts);
  useEffect(() => {
    fetchRef.current = fetchDirectCosts;
  }, [fetchDirectCosts]);

  useEffect(() => {
    fetchDirectCosts(false);
  }, [fetchDirectCosts]);

  useEffect(() => {
    const onUpdated = () => fetchRef.current(true);
    const onDeleted = (e) => {
      const directCostId = e.detail?.directCostId;
      if (!directCostId) return;
      // ✅ Invalidate cache on delete
      sessionStorage.removeItem(CACHE_KEY);
      setDirectCosts((prev) => prev.filter((c) => c.id !== directCostId));
    };
    window.addEventListener("direct_cost_data_updated", onUpdated);
    window.addEventListener("direct_cost_data_deleted", onDeleted);
    return () => {
      window.removeEventListener("direct_cost_data_updated", onUpdated);
      window.removeEventListener("direct_cost_data_deleted", onDeleted);
    };
  }, []);

  const filteredDirectCosts = directCosts.filter((cost) => {
    const searchLower = search.toLowerCase();
    return cost.costName?.toLowerCase().includes(searchLower);
  });

  const handleAdd = useCallback(() => {
    setSelectedCost(null);
    setModalMode("add");
    setIsModalOpen(true);
  }, []);

  const handleEdit = useCallback((row) => {
    setSelectedCost(row);
    setModalMode("edit");
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback((id, costName) => {
    setEntityToDelete({ type: "direct-cost", data: { id, name: costName } });
    setOpenDeleteModal(true);
  }, []);

  const handleDeleteSuccess = useCallback(() => {
    if (!entityToDelete?.data) return;
    // ✅ Invalidate cache on delete
    sessionStorage.removeItem(CACHE_KEY);
    setDirectCosts((prev) =>
      prev.filter((cost) => cost.id !== entityToDelete.data.id),
    );
  }, [entityToDelete]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedCost(null);
  }, []);

  // Transfer — the stand-in for Delete on an option a live transaction
  // still charges a cost to: the modal moves those lines to another option.
  const handleTransferClick = useCallback((row) => {
    setSelectedCost(row);
    setOpenTransferModal(true);
  }, []);
  const handleCloseTransferModal = useCallback(() => {
    setOpenTransferModal(false);
    setSelectedCost(null);
  }, []);
  // The move itself — the modal only picks the destination and the lines.
  // The source id travels WITH the call, so the modal can close itself (and
  // drop the selection) before the request is sent.
  const handleTransferCosts = useCallback(
    async (sourceOptionId, targetOptionId, costIds) => {
      if (!sourceOptionId) return;
      await DirectCostOptionAPI.transferCosts(sourceOptionId, {
        nTargetCostOptionId: targetOptionId,
        costIds,
      });
      await fetchRef.current?.(true); // ✅ Silent refresh (also refreshes the cache)
    },
    [],
  );

  const handleSaveSuccess = useCallback(() => {
    fetchRef.current(true); // refetches and refreshes the cache
    handleModalClose();
  }, [handleModalClose]);

  const handlePageChange = useCallback((_, newPage) => setPage(newPage), []);

  const handleRowsPerPageChange = useCallback((e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  }, []);

  return {
    search,
    setSearch,
    page,
    rowsPerPage,
    directCosts: filteredDirectCosts,
    loading,
    isModalOpen,
    selectedCost,
    modalMode,
    openDeleteModal,
    setOpenDeleteModal,
    entityToDelete,
    setEntityToDelete,
    openTransferModal,
    fetchDirectCosts,
    handleAdd,
    handleEdit,
    handleDelete,
    handleDeleteSuccess,
    handleTransferClick,
    handleCloseTransferModal,
    handleTransferCosts,
    handleModalClose,
    handleSaveSuccess,
    handlePageChange,
    handleRowsPerPageChange,
  };
}
