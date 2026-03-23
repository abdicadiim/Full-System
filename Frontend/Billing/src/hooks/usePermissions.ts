export const usePermissions = () => {
  const alwaysAllowed = () => true;
  // Some pages still use the older `hasPermission(module, submodule, action)` helper.
  // Keep a permissive alias here so those pages can compile and function.
  const hasPermission = (..._args: any[]) => true;

  return {
    loading: false,
    canView: alwaysAllowed,
    canCreate: alwaysAllowed,
    canEdit: alwaysAllowed,
    canDelete: alwaysAllowed,
    hasPermission,
  };
};

export default usePermissions;
