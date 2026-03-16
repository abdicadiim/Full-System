import React from "react";
import SettingsLayout from "./SettingsLayout";
import NewCustomApprovalPage from "./NewCustomApprovalPage";

export default function NewCustomApprovalPageWrapper() {
    return (
        <SettingsLayout>
            <NewCustomApprovalPage />
        </SettingsLayout>
    );
}
