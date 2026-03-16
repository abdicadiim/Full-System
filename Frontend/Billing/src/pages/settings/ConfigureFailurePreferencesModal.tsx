import React, { useEffect, useState } from "react";
import { X, ChevronDown, Search } from "lucide-react";

interface ConfigureFailurePreferencesModalProps {
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
}

const toDisplayFrequency = (value: string): string => {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return "Daily";
    return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
};

const tabToChannelKey = (tab: string) => tab.trim().toLowerCase().replace(/\s+/g, "_");

const ConfigureFailurePreferencesModal: React.FC<ConfigureFailurePreferencesModalProps> = ({ onClose, onSave, initialData }) => {
    const [activeTab, setActiveTab] = useState("Email Alerts");
    const [frequency, setFrequency] = useState("Daily");
    const [time, setTime] = useState("10:30");
    const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
    const [isRecipientDropdownOpen, setIsRecipientDropdownOpen] = useState(false);
    const [recipientSearchTerm, setRecipientSearchTerm] = useState("");

    // Retry Policy States
    const [retryMethod, setRetryMethod] = useState("Additive");
    const [retryValue, setRetryValue] = useState("1");
    const [retryUnit, setRetryUnit] = useState("Hours");
    const [incrementValue, setIncrementValue] = useState("1");
    const [maxRetries, setMaxRetries] = useState("6");
    const [isRetryEnabled, setIsRetryEnabled] = useState(false);

    const tabs = ["Email Alerts", "Webhooks", "Custom Functions"];
    const frequencies = ["Hourly", "Daily", "Weekly", "Monthly"];
    const retryMethods = ["Fixed interval", "Additive", "Multiplicative"];

    useEffect(() => {
        if (!initialData) return;

        const activeChannel = initialData?.channels?.[tabToChannelKey(activeTab)] || {};
        const resolvedFrequency = activeChannel?.frequency || initialData?.failureLogFrequency;
        const resolvedTime = activeChannel?.time || initialData?.failureLogTime;
        const resolvedRecipients = activeChannel?.recipients || initialData?.failureLogRecipients;
        const retry = activeChannel?.retryPolicy || initialData?.retryPolicy || {};

        if (resolvedFrequency) setFrequency(toDisplayFrequency(String(resolvedFrequency)));
        if (resolvedTime) setTime(String(resolvedTime));
        if (Array.isArray(resolvedRecipients)) setSelectedRecipients(resolvedRecipients);

        if (retry?.method) setRetryMethod(String(retry.method));
        if (retry?.value !== undefined) setRetryValue(String(retry.value));
        if (retry?.unit) setRetryUnit(String(retry.unit));
        if (retry?.increment !== undefined) setIncrementValue(String(retry.increment));
        if (retry?.maxRetries !== undefined) setMaxRetries(String(retry.maxRetries));
        setIsRetryEnabled(Boolean(retry?.enabled));
    }, [initialData, activeTab]);

    // Generate times in 30 min intervals
    const times = [];
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        times.push(`${hour}:00`);
        times.push(`${hour}:30`);
    }

    const recipientOptions = [
        {
            category: "Users",
            items: ["taban9798mm"]
        },
        {
            category: "Roles",
            items: ["Admin", "Staff", "TimesheetStaff", "Staff (Assigned Customers Only)"]
        }
    ];

    const generatePattern = () => {
        const val = parseInt(retryValue) || 1;
        const inc = parseInt(incrementValue) || 0;
        const max = parseInt(maxRetries) || 1;

        let pattern = [];
        let current = val;

        for (let i = 0; i < Math.min(max, 6); i++) {
            pattern.push(`${current} ${retryUnit}`);
            if (retryMethod === "Additive") current += inc;
            else if (retryMethod === "Multiplicative") current *= inc;
        }

        if (max > 6) pattern.push("...");
        if (max > 1 && max <= 6) {
            // show all
        } else if (max > 6) {
            pattern[5] = "...";
            pattern.push(`${max * inc} ${retryUnit}`); // simplified
        }

        return pattern.join(" -> ");
    };

    const filteredRecipients = recipientOptions.map(group => ({
        ...group,
        items: group.items.filter(item => item.toLowerCase().includes(recipientSearchTerm.toLowerCase()))
    })).filter(group => group.items.length > 0);

    const toggleRecipient = (item: string) => {
        if (selectedRecipients.includes(item)) {
            setSelectedRecipients(prev => prev.filter(r => r !== item));
        } else {
            setSelectedRecipients(prev => [...prev, item]);
        }
    };

    const removeRecipient = (item: string) => {
        setSelectedRecipients(prev => prev.filter(r => r !== item));
    };

    const handleSave = () => {
        onSave({
            activeTab,
            frequency,
            time,
            recipients: selectedRecipients,
            failureLogFrequency: String(frequency).toLowerCase(),
            failureLogTime: time,
            failureLogRecipients: selectedRecipients,
            retryPolicy: {
                enabled: activeTab === "Webhooks" ? true : isRetryEnabled,
                method: retryMethod,
                value: retryValue,
                unit: retryUnit,
                increment: incrementValue,
                maxRetries
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 font-inter">
            <div className="bg-white rounded-lg shadow-2xl w-[680px] max-w-full overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-medium text-[#334155]">Configure Failure Preferences</h2>
                    <button onClick={onClose} className="text-red-400 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-4">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-3 text-sm font-medium transition-all relative ${activeTab === tab ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Failure Notification Section */}
                    <div className="mb-8">
                        <h3 className="text-base font-semibold text-[#334155] mb-6">Failure Notification</h3>
                        <div className="grid grid-cols-[160px_1fr] gap-x-8 gap-y-6 items-center">
                            <label className="text-sm text-gray-700">Frequency</label>
                            <div className="relative">
                                <select
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value)}
                                    className="w-full h-10 px-3 border border-gray-300 rounded hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm appearance-none bg-white cursor-pointer"
                                >
                                    {frequencies.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>

                            <label className="text-sm text-red-500 font-medium">Time*</label>
                            <div className="relative">
                                <select
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full h-10 px-3 border border-gray-300 rounded hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm appearance-none bg-white cursor-pointer"
                                >
                                    {times.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>

                            <label className="text-sm text-red-500 font-medium">Email Recipients*</label>
                            <div className="relative">
                                <div
                                    className="w-full min-h-[40px] px-3 py-2 border border-gray-300 rounded hover:border-blue-400 focus-within:border-blue-500 text-sm bg-white cursor-pointer flex items-center justify-between transition-all"
                                    onClick={() => setIsRecipientDropdownOpen(!isRecipientDropdownOpen)}
                                >
                                    <div className="flex flex-wrap gap-2 flex-1 mr-2">
                                        {selectedRecipients.length > 0 ? (
                                            selectedRecipients.map(recipient => (
                                                <span key={recipient} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs flex items-center gap-1 border border-blue-100">
                                                    {recipient}
                                                    <X
                                                        size={12}
                                                        className="cursor-pointer hover:text-red-600"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeRecipient(recipient);
                                                        }}
                                                    />
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-gray-400">Select recipients</span>
                                        )}
                                    </div>
                                    <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                                </div>

                                {isRecipientDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsRecipientDropdownOpen(false)}></div>
                                        <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-100 rounded-lg shadow-2xl z-20 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                            <div className="p-3 sticky top-0 bg-white border-b border-gray-50">
                                                <div className="relative">
                                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search"
                                                        className="w-full h-9 pl-10 pr-4 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                                        value={recipientSearchTerm}
                                                        onChange={(e) => setRecipientSearchTerm(e.target.value)}
                                                        autoFocus
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="py-1">
                                                {filteredRecipients.map((group, idx) => (
                                                    <div key={idx}>
                                                        <div className="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">{group.category}</div>
                                                        {group.items.map(item => {
                                                            const isSelected = selectedRecipients.includes(item);
                                                            return (
                                                                <div
                                                                    key={item}
                                                                    className={`px-4 py-2.5 text-sm cursor-pointer transition-all flex items-center justify-between ${isSelected ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-blue-50"}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleRecipient(item);
                                                                    }}
                                                                >
                                                                    <span>{item}</span>
                                                                    {isSelected && <span>v</span>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        {activeTab === "Email Alerts" && (
                            <div className="mt-4 flex justify-start">
                                <button className="text-sm text-blue-600 hover:underline font-medium ml-[160px]">Send Sample Notification</button>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-100 my-8"></div>

                    {/* Retry Policy Section */}
                    {activeTab !== "Email Alerts" && (
                        <div>
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-base font-semibold text-[#334155]">Retry Policy</h3>
                                {activeTab === "Custom Functions" && (
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm ${isRetryEnabled ? "text-gray-400" : "text-gray-600 font-medium"}`}>{isRetryEnabled ? "Enabled" : "Disabled"}</span>
                                        <button
                                            onClick={() => setIsRetryEnabled(!isRetryEnabled)}
                                            className={`w-12 h-6 rounded-full p-1 transition-colors relative ${isRetryEnabled ? "bg-blue-600" : "bg-gray-300"}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isRetryEnabled ? "translate-x-6" : "translate-x-0"}`} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {(activeTab === "Webhooks" || isRetryEnabled) && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="grid grid-cols-[160px_1fr] gap-x-8 gap-y-6 items-center">
                                        <label className="text-sm text-red-500 font-medium flex items-center gap-1">
                                            Retry Method*
                                            <div className="w-4 h-4 rounded-full bg-gray-400 text-white text-[10px] flex items-center justify-center font-bold">i</div>
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={retryMethod}
                                                onChange={(e) => setRetryMethod(e.target.value)}
                                                className="w-full h-10 px-3 border border-gray-300 rounded hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm appearance-none bg-white cursor-pointer"
                                            >
                                                {retryMethods.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                        </div>

                                        <div className="col-start-2 bg-gray-50/80 p-6 rounded-lg border border-gray-100">
                                            <div className="flex items-center flex-wrap gap-4 text-sm text-gray-700">
                                                <span className="min-w-10">Retry</span>
                                                <input
                                                    type="text"
                                                    className="w-16 h-10 border border-gray-300 rounded px-3 focus:outline-none focus:border-blue-400"
                                                    value={retryValue}
                                                    onChange={(e) => setRetryValue(e.target.value)}
                                                />
                                                <div className="relative flex-1 min-w-[120px]">
                                                    <select
                                                        className="w-full h-10 px-3 border border-gray-300 rounded appearance-none focus:outline-none focus:border-blue-400"
                                                        value={retryUnit}
                                                        onChange={(e) => setRetryUnit(e.target.value)}
                                                    >
                                                        <option>Hours</option>
                                                        <option>Days</option>
                                                    </select>
                                                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                </div>
                                                <span>after failure,</span>
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-gray-700 mt-6">
                                                <span>increasing the retry interval by</span>
                                                <input
                                                    type="text"
                                                    className="w-16 h-10 border border-gray-300 rounded px-3 focus:outline-none focus:border-blue-400"
                                                    value={incrementValue}
                                                    onChange={(e) => setIncrementValue(e.target.value)}
                                                />
                                                <span>up to</span>
                                                <input
                                                    type="text"
                                                    className="w-20 h-10 border border-gray-300 rounded px-3 focus:outline-none focus:border-blue-400"
                                                    value={maxRetries}
                                                    onChange={(e) => setMaxRetries(e.target.value)}
                                                />
                                                <span>retries.</span>
                                            </div>
                                        </div>

                                        <label className="text-sm text-gray-600">Pattern</label>
                                        <div className="bg-blue-50/50 p-4 rounded-lg flex items-center gap-3 border border-blue-50">
                                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[80px]">Pattern</span>
                                            <div className="text-sm text-gray-700 font-medium">
                                                {generatePattern()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 px-8 py-6 border-t border-gray-100 bg-white">
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded shadow-md hover:bg-blue-700 hover:shadow-lg transition-all active:scale-[0.98]"
                    >
                        Save
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-all active:scale-[0.98]"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigureFailurePreferencesModal;
