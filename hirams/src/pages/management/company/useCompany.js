import { useState, useEffect, useCallback, useRef } from "react";
import CompanyAPI from "../../../api/endpoints/company.api";
import useKeysLabels from "../../../hooks/useKeysLabels";
export default function useCompany() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [openModal, setOpenModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);
  const [openTransferModal, setOpenTransferModal] = useState(false);

  const { vat, ewt, loading: mappingLoading } = useKeysLabels();

  // Use ref to track fetched state without causing dependency loops
  const isFetchedRef = useRef(false);
  const searchRef = useRef(search);
  useEffect(() => {
    searchRef.current = search;
  }, [search]);
  useEffect(() => {
    isFetchedRef.current = false;
  }, [search]); // reset on search change

  /**
   * Fetch companies — show loading ONLY on initial load / search change
   * @param {boolean} silent - skip loading indicator
   */
  const fetchCompanies = useCallback(
    async (silent = false) => {
      if (mappingLoading) return;

      if (!silent) setLoading(true);

      try {
        const data = await CompanyAPI.getCompanies(
          `search=${encodeURIComponent(searchRef.current || "")}`,
        );
        const companiesArray = data.companies || [];
        const formatted = companiesArray.map((item) => ({
          id: item.nCompanyId,
          name: item.strCompanyName,
          nickname: item.strCompanyNickName,
          tin: item.strTIN,
          address: item.strAddress,
          vat: vat?.[item.bVAT],
          vatActive: Number(item.bVAT) === 1,
          ewt: ewt?.[item.bEWT],
          ewtActive: Number(item.bEWT) === 1,
          email: item.strEmail,
          phone: item.strPhoneNo, // ✅ add this
          strLogo: item.strLogo,
          // What still names this company — the counts that decide whether
          // Delete or Transfer is offered on the row.
          transactionsCount: Number(item.transactions_count ?? 0),
          vouchersCount: Number(item.vouchers_count ?? 0),
        }));
        setCompanies(formatted);
        isFetchedRef.current = true;
      } catch (error) {
        console.error("Error fetching companies:", error.message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [mappingLoading, vat, ewt],
  ); // ✅ Removed search/isFetched from deps

  // Keep stable reference for realtime listeners
  const fetchRef = useRef(fetchCompanies);
  useEffect(() => {
    fetchRef.current = fetchCompanies;
  }, [fetchCompanies]);

  // ✅ Initial fetch — runs ONCE when mappings ready or search changes
  useEffect(() => {
    if (!mappingLoading) {
      fetchCompanies(false);
    }
  }, [search, mappingLoading, fetchCompanies]);

  // ✅ Realtime updates — SILENT refresh
  useEffect(() => {
    const onUpdated = () => fetchRef.current(true); // silent = true
    const onDeleted = (e) => {
      const companyId = e.detail?.companyId;
      if (!companyId) return;
      setCompanies((prev) => prev.filter((c) => c.id !== companyId));
    };

    window.addEventListener("company_data_updated", onUpdated);
    window.addEventListener("company_data_deleted", onDeleted);

    return () => {
      window.removeEventListener("company_data_updated", onUpdated);
      window.removeEventListener("company_data_deleted", onDeleted);
    };
  }, []);

  const filteredCompanies = companies;

  const handleAddClick = useCallback(() => {
    setSelectedCompany(null);
    setOpenModal(true);
  }, []);

  const handleEditClick = useCallback((company) => {
    setSelectedCompany(company);
    setOpenModal(true);
  }, []);

  const handleDeleteClick = useCallback((company) => {
    setEntityToDelete({
      type: "company",
      data: { id: company.id, name: company.name, nickname: company.nickname },
    });
    setOpenDeleteModal(true);
  }, []);

  const handleDeleteSuccess = useCallback(() => {
    if (!entityToDelete?.data) return;
    setCompanies((prev) => prev.filter((c) => c.id !== entityToDelete.data.id));
  }, [entityToDelete]);

  // Transfer — the stand-in for Delete on a company that still carries
  // transactions or vouchers: the modal moves them to another company.
  const handleTransferClick = useCallback((company) => {
    setSelectedCompany(company);
    setOpenTransferModal(true);
  }, []);
  const handleCloseTransferModal = useCallback(() => {
    setOpenTransferModal(false);
    setSelectedCompany(null);
  }, []);
  // The move itself — the modal only picks the destination and the
  // records. The source id travels WITH the call, so the modal can close
  // itself (and drop the selection) before the request is sent.
  const handleTransferLinks = useCallback(
    async (sourceCompanyId, targetCompanyId, transactionIds, voucherIds) => {
      if (!sourceCompanyId) return;
      await CompanyAPI.transferLinks(sourceCompanyId, {
        nTargetCompanyId: targetCompanyId,
        transactionIds,
        voucherIds,
      });
      await fetchRef.current?.(true); // ✅ Silent refresh
    },
    [],
  );

  const handleModalClose = useCallback(() => setOpenModal(false), []);

  return {
    search,
    setSearch,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    openModal,
    selectedCompany,
    companies: filteredCompanies,
    loading,
    openDeleteModal,
    setOpenDeleteModal, // ← MUST HAVE
    entityToDelete,
    setEntityToDelete, // ← MUST HAVE
    openTransferModal,
    vat,
    ewt,
    fetchCompanies,
    handleAddClick,
    handleEditClick,
    handleDeleteClick,
    handleDeleteSuccess,
    handleTransferClick,
    handleCloseTransferModal,
    handleTransferLinks,
    handleModalClose,
  };
}
