import { useState, useCallback } from 'react';
import api from '../services/api';

export default function useClientData() {
  const [aggregatedData, setAggregatedData] = useState({
    quotations: [],
    proformaInvoices: [],
    taxInvoices: [],
    paymentReceipts: []
  });
  const [loadingClientData, setLoadingClientData] = useState(false);
  const [clientDataError, setClientDataError] = useState(null);

  const fetchClientAggregatedData = useCallback(async (clientId, companyName = '') => {
    if (!clientId) return;
    
    setLoadingClientData(true);
    setClientDataError(null);
    try {
      const response = await api.get(`/client/${clientId}/aggregated-data`, {
        params: { companyName }
      });
      if (response.data && response.data.success) {
        setAggregatedData(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching aggregated client data:", err);
      setClientDataError(err);
      setAggregatedData({
        quotations: [],
        proformaInvoices: [],
        taxInvoices: [],
        paymentReceipts: []
      });
    } finally {
      setLoadingClientData(false);
    }
  }, []);

  const clearClientData = useCallback(() => {
    setAggregatedData({
      quotations: [],
      proformaInvoices: [],
      taxInvoices: [],
      paymentReceipts: []
    });
  }, []);

  return {
    aggregatedData,
    loadingClientData,
    clientDataError,
    fetchClientAggregatedData,
    clearClientData
  };
}
