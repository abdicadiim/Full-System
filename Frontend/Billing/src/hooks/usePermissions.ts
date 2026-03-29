import { useLocation } from "react-router-dom";
import { useUser } from "../lib/auth/UserContext";
import { createPermissionEvaluator } from "../lib/auth/permissionUtils";

export const usePermissions = () => {
  const location = useLocation();
  const { user, loading: userLoading, hasChecked } = useUser();
  const evaluator = createPermissionEvaluator({
    role: user?.role,
    permissions: user?.permissions,
    pathname: location.pathname,
  });

  const hasPermission = (...args: any[]) => evaluator.hasPermission(args[0], args[1], args[2]);

  return {
    loading: userLoading || !hasChecked,
    canView: (module?: string, submodule?: string) => evaluator.canView(module, submodule),
    canCreate: (module?: string, submodule?: string) => evaluator.canCreate(module, submodule),
    canEdit: (module?: string, submodule?: string) => evaluator.canEdit(module, submodule),
    canDelete: (module?: string, submodule?: string) => evaluator.canDelete(module, submodule),
    hasPermission,
  };
};

export default usePermissions;
