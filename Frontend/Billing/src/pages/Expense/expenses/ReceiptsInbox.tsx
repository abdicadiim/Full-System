import React, { useRef, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CloudUpload, Scan, FileSpreadsheet, AlertCircle, FileText, FileImage, File } from "lucide-react";

export default function ReceiptsInbox() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const location = useLocation();

    useEffect(() => {
        if (location.state?.newFiles && location.state.newFiles.length > 0) {
            handleNewFiles(location.state.newFiles);
            // Clear the state so we don't re-add on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setSelectedFiles([]);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleAttachFromDesktop = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleNewFiles(Array.from(files));
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.style.borderColor = "#d1d5db";
        e.currentTarget.style.backgroundColor = "transparent";
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleNewFiles(Array.from(files));
        }
    };

    const handleNewFiles = (files: File[]) => {
        const newFiles = files.map(f => ({
            id: Math.random().toString(36).substr(2, 9),
            name: f.name,
            size: f.size,
            type: f.type,
            uploadDate: new Date(),
            uploadedBy: "Abdi Ladilf", // Using name from screenshot
            uploadedFrom: "Documents module",
            status: Math.random() > 0.3 ? "UNREADABLE" : "SUCCESS"
        }));
        setUploadedFiles(prev => [...prev, ...newFiles]);
    };

    // Format date like: "01 Mar 2028 07:35 AM"
    const formatDate = (date: Date) => {
        const options: Intl.DateTimeFormatOptions = {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        };
        // Replace commas and format properly to match screenshot
        return date.toLocaleString('en-GB', options).replace(',', '');
    };

    const renderFilePreview = (file: any) => {
        const ext = file.name.split('.').pop()?.toLowerCase();

        // Mock preview for Excel/XLSX just like the screenshot
        if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || true) { // Defaulting to the screenshot's green XLSX icon for demo purposes
            return (
                <div style={{ flex: 1, backgroundColor: "#f8fafc", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "12px", minHeight: "140px", position: "relative" }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "8px 12px",
                        backgroundColor: "transparent",
                        border: "3px solid #16a34a",
                        borderRadius: "8px",
                    }}>
                        <span style={{ color: "#16a34a", fontWeight: "800", fontSize: "18px", letterSpacing: "1px" }}>XLSX</span>
                    </div>
                </div>
            );
        }
    };

    return (
        <div style={{ width: "100%", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)", minHeight: "80vh" }}>
            {/* Header */}
            <div style={{ padding: "0 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px", boxSizing: "border-box" }}>
                {selectedFiles.length > 0 ? (
                    <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <button
                                style={{ padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: "6px", backgroundColor: "#ffffff", color: "#374151", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
                                onClick={() => setSelectedFiles([])}
                            >
                                Unselect All
                            </button>
                            <button
                                style={{ padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: "6px", backgroundColor: "#ffffff", color: "#374151", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
                                onClick={() => {
                                    const filesToConvert = uploadedFiles.filter(f => selectedFiles.includes(f.id));
                                    navigate("/expenses/new", { state: { receiptFiles: filesToConvert } });
                                }}
                            >
                                Convert to Expense
                            </button>
                            <button
                                style={{ padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: "6px", backgroundColor: "#ffffff", color: "#374151", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
                            >
                                Delete
                            </button>
                            <div style={{ width: "1px", height: "24px", backgroundColor: "#e5e7eb", margin: "0 4px" }}></div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ backgroundColor: "#eff6ff", color: "#3b82f6", borderRadius: "4px", padding: "2px 8px", fontSize: "12px", fontWeight: "800" }}>{selectedFiles.length}</span>
                                <span style={{ color: "#374151", fontSize: "13px", fontWeight: "600" }}>Selected</span>
                            </div>
                        </div>
                        <div>
                            <button
                                style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "#ef4444", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
                                onClick={() => setSelectedFiles([])}
                            >
                                <span style={{ color: "#9ca3af", fontSize: "12px", fontWeight: "500" }}>Esc</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: "24px", height: "100%" }}>
                            <button
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "0",
                                    fontSize: "16px",
                                    fontWeight: "700",
                                    color: "#111827",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    borderBottom: "3px solid #3b82f6",
                                    cursor: "pointer",
                                    height: "100%",
                                    boxSizing: "border-box"
                                }}
                            >
                                Receipts Inbox
                            </button>
                            <button
                                style={{
                                    padding: "0",
                                    fontSize: "16px",
                                    fontWeight: "500",
                                    color: "#6b7280",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    height: "100%",
                                    boxSizing: "border-box"
                                }}
                                onClick={() => navigate("/expenses")}
                            >
                                Expenses
                            </button>
                        </div>

                        <div>
                            <button
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "6px 12px",
                                    backgroundColor: "#e0f2fe",
                                    color: "#3b82f6",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                }}
                            >
                                <Scan size={14} />
                                Available Autoscans: 5
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Main Content */}
            {uploadedFiles.length === 0 ? (
                // Empty State: Big upload box
                <div style={{ padding: "48px 24px", display: "flex", justifyContent: "center" }}>
                    <div
                        style={{
                            width: "100%",
                            maxWidth: "700px",
                            height: "350px",
                            border: "1px dashed #d1d5db",
                            borderRadius: "12px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                        }}
                        onClick={handleAttachFromDesktop}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.currentTarget.style.borderColor = "#3b82f6";
                            e.currentTarget.style.backgroundColor = "#f9fafb";
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.currentTarget.style.borderColor = "#d1d5db";
                            e.currentTarget.style.backgroundColor = "transparent";
                        }}
                        onDrop={handleDrop}
                    >
                        <div style={{ marginBottom: "20px" }}>
                            <CloudUpload size={64} style={{ color: "#fbbf24", opacity: 0.8 }} />
                        </div>

                        <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", marginBottom: "8px", marginTop: 0 }}>
                            Drag & Drop Files Here
                        </h2>

                        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "24px", marginTop: 0 }}>
                            Upload your documents (Images, PDF, Docs or Sheets) here
                        </p>

                        <button
                            style={{
                                padding: "8px 20px",
                                backgroundColor: "#2563eb",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAttachFromDesktop();
                            }}
                        >
                            Choose files to upload
                        </button>
                    </div>
                </div>
            ) : (
                // Files state: Grid
                <div style={{ padding: "32px 24px", display: "flex", flexWrap: "wrap", gap: "24px" }}>
                    {/* Small Upload Box */}
                    <div
                        style={{
                            width: "250px",
                            height: "280px",
                            border: "1px solid #f1f5f9",
                            borderRadius: "12px",
                            backgroundColor: "#f8fafc", // Very light gray background like in the screenshot
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            padding: "24px",
                            textAlign: "center"
                        }}
                        onClick={handleAttachFromDesktop}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.borderColor = "#3b82f6";
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.borderColor = "#f1f5f9";
                        }}
                        onDrop={handleDrop}
                    >
                        <div style={{ marginBottom: "20px" }}>
                            {/* Hand cursor clicking inside a dashed box icon */}
                            <svg width="60" height="60" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="8" y="8" width="24" height="24" rx="2" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                                <path d="M22 22L28 36L30.5 31.5L36 37L39 34L33.5 28.5L38 26L22 22Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" strokeLinejoin="round" />
                                <path d="M25 29L30.5 31.5L25 29Z" fill="#94a3b8" />
                            </svg>
                        </div>
                        <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#111827", margin: "0 0 6px 0" }}>Drag & Drop Files</h3>
                        <p style={{ fontSize: "13px", color: "#111827", fontWeight: "600", margin: 0 }}>
                            Here to <span style={{ color: "#3b82f6" }}>upload</span>
                        </p>
                    </div>

                    {/* File Cards */}
                    {uploadedFiles.map((file, index) => {
                        const isSelected = selectedFiles.includes(file.id);
                        return (
                            <div
                                key={file.id}
                                style={{
                                    width: "250px",
                                    height: "280px",
                                    border: isSelected ? "1px solid #3b82f6" : "1px solid #e5e7eb",
                                    borderRadius: "12px",
                                    backgroundColor: "#ffffff",
                                    padding: "16px",
                                    display: "flex",
                                    flexDirection: "column",
                                    position: "relative", // essential for the absolute positioned action bar
                                    overflow: "hidden" // keep the border radius clean when hover bar shows up
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(59, 130, 246, 0.1), 0 4px 6px -2px rgba(59, 130, 246, 0.05)";
                                        e.currentTarget.style.borderColor = "#3b82f6";
                                    }
                                    const actionBar = e.currentTarget.querySelector('.action-bar') as HTMLElement;
                                    if (actionBar) actionBar.style.bottom = "0";
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.boxShadow = "none";
                                        e.currentTarget.style.borderColor = "#e5e7eb";
                                    }
                                    const actionBar = e.currentTarget.querySelector('.action-bar') as HTMLElement;
                                    if (actionBar) actionBar.style.bottom = "-48px";
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                    <h4 title={file.name} style={{
                                        fontSize: "14px",
                                        fontWeight: "700",
                                        color: "#374151",
                                        margin: "0",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        flex: 1,
                                        paddingRight: "10px"
                                    }}>
                                        {file.name}
                                    </h4>
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isSelected) {
                                                setSelectedFiles(prev => prev.filter(id => id !== file.id));
                                            } else {
                                                setSelectedFiles(prev => [...prev, file.id]);
                                            }
                                        }}
                                        style={{
                                            width: "18px",
                                            height: "18px",
                                            borderRadius: "4px",
                                            border: isSelected ? "none" : "1px solid #d1d5db",
                                            backgroundColor: isSelected ? "#3b82f6" : "#ffffff",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                            cursor: "pointer"
                                        }}>
                                        {isSelected && (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 6px 0" }}>{formatDate(file.uploadDate)}</p>
                                <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 6px 0" }}>Uploaded By: <span style={{ color: "#374151", fontWeight: "500" }}>{file.uploadedBy}</span></p>
                                <p style={{ fontSize: "12px", color: "#6b7280", margin: "0" }}>Uploaded from: <span style={{ color: "#374151", fontWeight: "500" }}>{file.uploadedFrom}</span></p>

                                {file.status === "UNREADABLE" && (
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", color: "#ef4444" }}>
                                        <AlertCircle size={14} />
                                        <span style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "0.5px" }}>UNREADABLE</span>
                                    </div>
                                )}

                                {renderFilePreview(file)}

                                {/* Hover Action Bar */}
                                <div
                                    className="action-bar"
                                    style={{
                                        position: "absolute",
                                        bottom: "-48px", // hide by default
                                        left: 0,
                                        right: 0,
                                        height: "48px",
                                        backgroundColor: "#eff6ff", // light blue background
                                        display: "flex",
                                        alignItems: "center",
                                        transition: "bottom 0.2s ease-in-out",
                                        borderTop: "1px solid #bfdbfe"
                                    }}
                                >
                                    <button
                                        style={{
                                            flex: 1,
                                            height: "100%",
                                            backgroundColor: "#3b82f6",
                                            color: "white",
                                            border: "none",
                                            borderTopRightRadius: "24px", // to create the slant look shown in the screenshot
                                            fontSize: "13px",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate("/expenses/new", { state: { receiptFiles: [file] } });
                                        }}
                                    >
                                        Convert to Expense
                                    </button>
                                    <button
                                        style={{
                                            width: "48px",
                                            height: "100%",
                                            backgroundColor: "transparent",
                                            border: "none",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            cursor: "pointer",
                                            color: "#3b82f6"
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setUploadedFiles(prev => prev.filter(f => f.id !== file.id));
                                        }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileSelect}
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
            />
        </div>
    );
}
