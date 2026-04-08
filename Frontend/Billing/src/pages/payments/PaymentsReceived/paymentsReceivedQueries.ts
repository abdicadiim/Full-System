import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getPayments } from "../../sales/salesModel";

export const paymentsReceivedQueryKeys = {
  list: () => ["payments-received", "list"] as const,
};

export const fetchPaymentsReceivedList = async () => {
  const rows = await getPayments();
  return Array.isArray(rows) ? rows : [];
};

export const usePaymentsReceivedListQuery = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: paymentsReceivedQueryKeys.list(),
    queryFn: fetchPaymentsReceivedList,
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
