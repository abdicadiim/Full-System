import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { customersAPI } from "../../../services/api";

const createEmptyAddressForm = () => ({
  attention: "",
  country: "",
  street1: "",
  street2: "",
  city: "",
  state: "",
  zipCode: "",
  phone: "",
  fax: "",
});

const normalizeAddressForm = (address: any = {}) => ({
  attention: String(address?.attention || "").trim(),
  country: String(address?.country || "").trim(),
  street1: String(address?.street1 || address?.addressLine1 || address?.address || "").trim(),
  street2: String(address?.street2 || address?.addressLine2 || "").trim(),
  city: String(address?.city || "").trim(),
  state: String(address?.state || "").trim(),
  zipCode: String(address?.zipCode || address?.zip || address?.postalCode || "").trim(),
  phone: String(address?.phone || "").trim(),
  fax: String(address?.fax || address?.faxNumber || "").trim(),
});

const normalizeAddressRow = (address: any) => {
  if (!address || typeof address !== "object") return null;
  const addressId = String(address.addressId || address.id || address._id || "").trim();
  if (!addressId) return null;
  const type = String(address.type || "").toLowerCase();
  if (type === "billing" || type === "shipping" || addressId === "billing" || addressId === "shipping") {
    return null;
  }
  return {
    addressId,
    ...normalizeAddressForm(address),
    createdAt: address.createdAt || "",
    updatedAt: address.updatedAt || "",
  };
};

export function useCustomerDetailAddresses(detail: any) {
  const { id } = useParams();
  const {
    customer,
    setCustomer,
    setCustomers,
    refreshData,
  } = detail as any;

  const [showAdditionalAddressModal, setShowAdditionalAddressModal] = useState(false);
  const [editingAdditionalAddressId, setEditingAdditionalAddressId] = useState<string | null>(null);
  const [additionalAddressFormData, setAdditionalAddressFormData] = useState(createEmptyAddressForm);
  const [isSavingAdditionalAddress, setIsSavingAdditionalAddress] = useState(false);

  const customerId = String(customer?._id || customer?.id || id || "").trim();

  const syncAdditionalAddresses = async () => {
    if (!customerId) return [];

    try {
      const response = await customersAPI.getAddresses(customerId);
      const rawAddresses = Array.isArray(response?.addresses)
        ? response.addresses
        : Array.isArray(response?.data)
          ? response.data
          : [];
      const additionalAddresses = rawAddresses.map(normalizeAddressRow).filter(Boolean);

      setCustomer((prev: any) => (prev ? { ...prev, additionalAddresses } : prev));
      setCustomers((prev: any) =>
        Array.isArray(prev)
          ? prev.map((row: any) => {
              const rowId = String(row?._id || row?.id || "").trim();
              return rowId === customerId ? { ...row, additionalAddresses } : row;
            })
          : prev
      );

      return additionalAddresses;
    } catch {
      const fallback = Array.isArray(customer?.additionalAddresses)
        ? customer.additionalAddresses.map(normalizeAddressRow).filter(Boolean)
        : [];
      setCustomer((prev: any) => (prev ? { ...prev, additionalAddresses: fallback } : prev));
      return fallback;
    }
  };

  useEffect(() => {
    void syncAdditionalAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const resetAdditionalAddressModal = () => {
    setEditingAdditionalAddressId(null);
    setAdditionalAddressFormData(createEmptyAddressForm());
  };

  const openAdditionalAddressModal = (address?: any) => {
    if (address) {
      const normalized = normalizeAddressForm(address);
      setEditingAdditionalAddressId(String(address.addressId || address.id || address._id || "").trim() || null);
      setAdditionalAddressFormData(normalized);
    } else {
      resetAdditionalAddressModal();
    }
    setShowAdditionalAddressModal(true);
  };

  const saveAdditionalAddress = async () => {
    if (!customerId) {
      toast.error("Customer ID not found. Please refresh and try again.");
      return;
    }

    const payload = {
      attention: additionalAddressFormData.attention.trim(),
      country: additionalAddressFormData.country.trim(),
      street1: additionalAddressFormData.street1.trim(),
      street2: additionalAddressFormData.street2.trim(),
      city: additionalAddressFormData.city.trim(),
      state: additionalAddressFormData.state.trim(),
      zipCode: additionalAddressFormData.zipCode.trim(),
      phone: additionalAddressFormData.phone.trim(),
      fax: additionalAddressFormData.fax.trim(),
    };

    if (
      !payload.attention &&
      !payload.country &&
      !payload.street1 &&
      !payload.street2 &&
      !payload.city &&
      !payload.state &&
      !payload.zipCode &&
      !payload.phone &&
      !payload.fax
    ) {
      toast.error("Please enter at least one address field.");
      return;
    }

    setIsSavingAdditionalAddress(true);
    try {
      if (editingAdditionalAddressId) {
        await customersAPI.updateAddress(customerId, editingAdditionalAddressId, payload);
        toast.success("Additional address updated.");
      } else {
        await customersAPI.addAddress(customerId, payload);
        toast.success("Additional address added.");
      }
      await refreshData();
      await syncAdditionalAddresses();
      setShowAdditionalAddressModal(false);
      resetAdditionalAddressModal();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save additional address.");
    } finally {
      setIsSavingAdditionalAddress(false);
    }
  };

  const deleteAdditionalAddress = async (addressId: string) => {
    if (!customerId || !addressId) return;
    const confirmed = window.confirm("Delete this additional address?");
    if (!confirmed) return;

    try {
      await customersAPI.deleteAddress(customerId, addressId);
      await refreshData();
      await syncAdditionalAddresses();
      toast.success("Additional address deleted.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete additional address.");
    }
  };

  Object.assign(detail, {
    additionalAddressFormData,
    deleteAdditionalAddress,
    editingAdditionalAddressId,
    isSavingAdditionalAddress,
    openAdditionalAddressModal,
    resetAdditionalAddressModal,
    saveAdditionalAddress,
    setAdditionalAddressFormData,
    setEditingAdditionalAddressId,
    setIsSavingAdditionalAddress,
    setShowAdditionalAddressModal,
    showAdditionalAddressModal,
  });

  return detail;
}
