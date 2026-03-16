import React from "react";
import CreateAccountModal from "../../pages/settings/organization-settings/setup-configurations/opening-balances/CreateAccountModal";

interface NewAccountModalProps {
  isOpen: boolean;
  defaultType?: string;
  onClose: () => void;
  onCreated: (account: any) => void;
}

const NewAccountModal = ({ isOpen, defaultType = "Income", onClose, onCreated }: NewAccountModalProps) => {
  if (!isOpen) return null;

  const handleSave = (account: any) => {
    onCreated(account);
  };

  return (
    <CreateAccountModal
      accountType={defaultType}
      onClose={onClose}
      onSave={handleSave}
    />
  );
};

export default NewAccountModal;
