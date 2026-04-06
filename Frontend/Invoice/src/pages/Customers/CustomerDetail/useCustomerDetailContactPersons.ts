import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { customersAPI } from "../../../services/api";
import {
    createEmptyContactPersonForm,
    normalizeContactPersonForm,
    normalizeContactPersonRecord,
    type ContactPersonFormState,
    type ExtendedCustomer,
} from "./CustomerDetail.shared";

type UseCustomerDetailContactPersonsArgs = {
    customerId: string;
    customer: ExtendedCustomer | null;
    refreshCustomer: (silent?: boolean) => Promise<void>;
};

const isEmailValid = (value: string) => {
    const email = String(value || "").trim();
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export function useCustomerDetailContactPersons({
    customerId,
    customer,
    refreshCustomer,
}: UseCustomerDetailContactPersonsArgs) {
    const [isContactPersonModalOpen, setIsContactPersonModalOpen] = useState(false);
    const [editingContactPersonIndex, setEditingContactPersonIndex] = useState<number | null>(null);
    const [contactPersonFormData, setContactPersonFormData] = useState<ContactPersonFormState>(createEmptyContactPersonForm());
    const [isSavingContactPerson, setIsSavingContactPerson] = useState(false);

    const contactPersons = useMemo(
        () => (Array.isArray((customer as any)?.contactPersons) ? ((customer as any).contactPersons as any[]).filter(Boolean) : []),
        [customer]
    );

    const closeContactPersonModal = () => {
        setIsContactPersonModalOpen(false);
        setEditingContactPersonIndex(null);
        setContactPersonFormData(createEmptyContactPersonForm());
    };

    const openAddContactPersonModal = () => {
        setEditingContactPersonIndex(null);
        setContactPersonFormData(createEmptyContactPersonForm());
        setIsContactPersonModalOpen(true);
    };

    const openEditContactPersonModal = (index: number) => {
        const person = contactPersons[index];
        if (!person) return;
        setEditingContactPersonIndex(index);
        setContactPersonFormData(normalizeContactPersonForm(person));
        setIsContactPersonModalOpen(true);
    };

    const normalizeCurrentContactPersons = (nextContactPersons: any[]) =>
        nextContactPersons.map((person, index) => ({
            ...(person || {}),
            ...normalizeContactPersonRecord(person, index),
        }));

    const persistContactPersons = async (nextContactPersons: any[]) => {
        if (!customerId) {
            throw new Error("Customer ID is missing.");
        }

        const normalized = normalizeCurrentContactPersons(nextContactPersons);
        const primary = normalized.find((person) => Boolean(person.isPrimary)) || normalized[0] || null;

        const payload = {
            contactPersons: normalized,
            email: primary?.email || (customer as any)?.email || "",
            enablePortal: normalized.some((person) => Boolean(person.hasPortalAccess || person.enablePortal)),
        };

        const response: any = await customersAPI.update(customerId, payload);
        if (response?.success === false) {
            throw new Error(response?.message || "Failed to update contact persons.");
        }
        await refreshCustomer(true);
    };

    const saveContactPerson = async () => {
        const firstName = String(contactPersonFormData.firstName || "").trim();
        const lastName = String(contactPersonFormData.lastName || "").trim();
        const email = String(contactPersonFormData.email || "").trim();
        const workPhone = String(contactPersonFormData.workPhone || "").trim();
        const mobile = String(contactPersonFormData.mobile || "").trim();
        const skypeName = String(contactPersonFormData.skypeName || "").trim();
        const designation = String(contactPersonFormData.designation || "").trim();
        const department = String(contactPersonFormData.department || "").trim();

        if (!firstName && !lastName && !email && !workPhone && !mobile) {
            toast.error("Please enter at least a name, email, or phone number.");
            return;
        }

        if (!isEmailValid(email)) {
            toast.error("Please enter a valid email address.");
            return;
        }

        if (contactPersonFormData.enablePortal && !email) {
            toast.error("Portal access requires an email address.");
            return;
        }

        const nextPerson = {
            ...(editingContactPersonIndex !== null ? contactPersons[editingContactPersonIndex] : {}),
            id:
                editingContactPersonIndex !== null
                    ? String(contactPersons[editingContactPersonIndex]?.id || contactPersons[editingContactPersonIndex]?._id || `${Date.now()}`)
                    : String(Date.now()),
            salutation: String(contactPersonFormData.salutation || "Mr").trim() || "Mr",
            firstName,
            lastName,
            email,
            workPhone,
            mobile,
            skypeName,
            designation,
            department,
            isPrimary: Boolean(contactPersonFormData.isPrimary),
            hasPortalAccess: Boolean(contactPersonFormData.enablePortal),
            enablePortal: Boolean(contactPersonFormData.enablePortal),
        };

        let nextContactPersons = editingContactPersonIndex !== null
            ? contactPersons.map((person, index) => (index === editingContactPersonIndex ? nextPerson : person))
            : [...contactPersons, nextPerson];

        if (!nextContactPersons.some((person) => Boolean(person?.isPrimary))) {
            nextContactPersons = nextContactPersons.map((person, index) => ({
                ...person,
                isPrimary: index === 0,
            }));
        }

        if (nextPerson.isPrimary) {
            nextContactPersons = nextContactPersons.map((person, index) => ({
                ...person,
                isPrimary: index === (editingContactPersonIndex ?? nextContactPersons.length - 1),
            }));
        }

        setIsSavingContactPerson(true);
        try {
            await persistContactPersons(nextContactPersons);
            toast.success(editingContactPersonIndex !== null ? "Contact person updated." : "Contact person added.");
            closeContactPersonModal();
        } catch (error: any) {
            toast.error(error?.message || "Failed to save contact person.");
        } finally {
            setIsSavingContactPerson(false);
        }
    };

    const deleteContactPerson = async (index: number) => {
        const person = contactPersons[index];
        if (!person) return;
        const confirmed = window.confirm("Delete this contact person?");
        if (!confirmed) return;

        const remaining = contactPersons.filter((_: any, currentIndex: number) => currentIndex !== index);
        if (remaining.length > 0 && !remaining.some((entry: any) => Boolean(entry?.isPrimary))) {
            remaining[0] = { ...(remaining[0] || {}), isPrimary: true };
        }

        try {
            await persistContactPersons(remaining);
            toast.success("Contact person deleted.");
        } catch (error: any) {
            toast.error(error?.message || "Failed to delete contact person.");
        }
    };

    const markContactPersonAsPrimary = async (index: number) => {
        const nextContactPersons = contactPersons.map((person: any, currentIndex: number) => ({
            ...person,
            isPrimary: currentIndex === index,
        }));

        try {
            await persistContactPersons(nextContactPersons);
            toast.success("Primary contact person updated.");
        } catch (error: any) {
            toast.error(error?.message || "Failed to update primary contact person.");
        }
    };

    const handleContactPersonPortalToggle = (checked: boolean) => {
        setContactPersonFormData((prev) => ({
            ...prev,
            enablePortal: checked,
        }));
    };

    return {
        contactPersons,
        contactPersonFormData,
        deleteContactPerson,
        editingContactPersonIndex,
        handleContactPersonPortalToggle,
        isContactPersonModalOpen,
        isSavingContactPerson,
        markContactPersonAsPrimary,
        openAddContactPersonModal,
        openEditContactPersonModal,
        closeContactPersonModal,
        saveContactPerson,
        setContactPersonFormData,
        setIsContactPersonModalOpen,
    };
}
