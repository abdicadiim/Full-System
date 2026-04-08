import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getCreditNotes } from "../salesModel";

const CREDIT_NOTES_STALE_TIME_MS = 30 * 1000;

export const creditNoteQueryKeys = {
  all: () => ["credit-notes"] as const,
  lists: () => ["credit-notes", "list"] as const,
};

export const fetchCreditNotesList = async () => {
  const data = await getCreditNotes();
  if (!Array.isArray(data)) {
    throw new Error("Failed to load credit notes");
  }
  return data;
};

export const useCreditNotesListQuery = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: creditNoteQueryKeys.lists(),
    queryFn: fetchCreditNotesList,
    enabled: options?.enabled ?? true,
    staleTime: CREDIT_NOTES_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
};
