export const usePermissions = () => {
  const alwaysAllowed = () => true;

  return {
    loading: false,
    canView: alwaysAllowed,
    canCreate: alwaysAllowed,
    canEdit: alwaysAllowed,
    canDelete: alwaysAllowed,
  };
};

export default usePermissions;
