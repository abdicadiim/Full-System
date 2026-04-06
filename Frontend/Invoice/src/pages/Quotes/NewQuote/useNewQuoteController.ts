import { useNewQuoteState } from "./useNewQuoteState";
import { useNewQuoteCustomerSearch } from "./useNewQuoteCustomerSearch";
import { useNewQuoteCustomerAddress } from "./useNewQuoteCustomerAddress";
import { useNewQuoteSalesProject } from "./useNewQuoteSalesProject";
import { useNewQuoteItemActions } from "./useNewQuoteItemActions";
import { useNewQuoteSaveHelpers } from "./useNewQuoteSaveHelpers";
import { useNewQuoteSaveActions } from "./useNewQuoteSaveActions";

export function useNewQuoteController() {
  const state = useNewQuoteState();
  const customerSearch = useNewQuoteCustomerSearch(state);
  const customerAddress = useNewQuoteCustomerAddress({ ...state, ...customerSearch });
  const salesProject = useNewQuoteSalesProject({ ...state, ...customerSearch, ...customerAddress });
  const itemActions = useNewQuoteItemActions({ ...state, ...customerSearch, ...customerAddress, ...salesProject });
  const saveHelpers = useNewQuoteSaveHelpers({ ...state, ...customerSearch, ...customerAddress, ...salesProject, ...itemActions });
  const saveActions = useNewQuoteSaveActions({ ...state, ...customerSearch, ...customerAddress, ...salesProject, ...itemActions, ...saveHelpers });

  return {
    ...state,
    ...customerSearch,
    ...customerAddress,
    ...salesProject,
    ...itemActions,
    ...saveHelpers,
    ...saveActions
  };
}
