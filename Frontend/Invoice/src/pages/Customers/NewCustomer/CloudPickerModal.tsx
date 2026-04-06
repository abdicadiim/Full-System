import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  Box,
  ChevronDown,
  ChevronUp,
  Cloud,
  FileText,
  Grid3x3,
  HardDrive,
  Plus,
  Search,
  Square,
  X,
} from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const providers = [
  { id: "zoho", name: "Zoho WorkDrive", icon: Grid3x3 },
  { id: "gdrive", name: "Google Drive", icon: HardDrive },
  { id: "dropbox", name: "Dropbox", icon: Box },
  { id: "box", name: "Box", icon: Square },
  { id: "onedrive", name: "OneDrive", icon: Cloud },
  { id: "evernote", name: "Evernote", icon: FileText },
];

const TermsBlock = ({ children }: { children: React.ReactNode }) => (
  <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
    <p>{children}</p>
  </div>
);

const AuthButton = ({
  children,
  bg,
  hoverBg,
  onClick,
}: {
  children: React.ReactNode;
  bg: string;
  hoverBg: string;
  onClick: () => void;
}) => (
  <button
    className="px-8 py-3 text-white rounded-md text-sm font-semibold transition-colors shadow-sm"
    style={{ backgroundColor: bg }}
    onClick={onClick}
    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = hoverBg)}
    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = bg)}
  >
    {children}
  </button>
);

function ZohoWorkDriveContent() {
  const [cloudSearchQuery, setCloudSearchQuery] = useState("");
  const [selectedCloudFiles, setSelectedCloudFiles] = useState<any[]>([]);

  return (
    <div className="w-full flex-1 overflow-hidden flex flex-col">
      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search in zoho..."
          className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md text-sm outline-none focus:border-blue-500 transition-all font-medium text-slate-700"
          value={cloudSearchQuery}
          onChange={(e) => setCloudSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex border-b border-gray-100 pb-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider px-2">
          <div className="w-[60%]">File Name</div>
          <div className="w-[20%] text-right">Size</div>
          <div className="w-[20%] text-right">Modified</div>
        </div>
        <div className="space-y-1">
          {[
            { id: "cf1", name: "Contract_Draft.pdf", size: 1048576, modified: "2 days ago" },
            { id: "cf2", name: "Identity_Proof.jpg", size: 2097152, modified: "Yesterday" },
            { id: "cf3", name: "Tax_Exemption_Form.pdf", size: 524288, modified: "1 week ago" },
            { id: "cf4", name: "Company_Logo_HighRes.png", size: 4194304, modified: "3 hours ago" },
            { id: "cf5", name: "Previous_Invoices_Bundle.zip", size: 8388608, modified: "May 12, 2025" },
          ]
            .filter((file) => file.name.toLowerCase().includes(cloudSearchQuery.toLowerCase()))
            .map((file) => {
              const isSelected = selectedCloudFiles.some((sf) => sf.id === file.id);
              return (
                <div
                  key={file.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedCloudFiles(selectedCloudFiles.filter((sf) => sf.id !== file.id));
                    } else {
                      setSelectedCloudFiles([...selectedCloudFiles, file]);
                    }
                  }}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected ? "bg-blue-50 border-blue-200" : "bg-white border-transparent hover:bg-slate-50"
                  }`}
                >
                  <div className="w-[60%] flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                      <FileText size={16} />
                    </div>
                    <span className="text-[14px] font-medium text-slate-700">{file.name}</span>
                  </div>
                  <div className="w-[20%] text-right text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
                  <div className="w-[20%] text-right text-xs text-slate-500">{file.modified}</div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function ProviderContent({ provider }: { provider: string }) {
  if (provider === "zoho") {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="relative w-full max-w-md h-64 mb-6 flex items-center justify-center">
          <div className="relative w-full h-full">
            <div className="absolute inset-0 flex items-end justify-center">
              <div className="relative">
                <div className="w-24 h-32 bg-gray-300 rounded-lg mb-2" />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                  <div className="w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center">
                    <Plus size={20} className="text-white" />
                  </div>
                </div>
                <div className="absolute top-2 left-1/2 -translate-x-1/2">
                  <div className="w-8 h-6 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="relative ml-8">
                <div className="w-20 h-28 bg-purple-300 rounded-lg mb-2" />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                  <div className="w-12 h-12 bg-purple-400 rounded-full flex items-center justify-center">
                    <Plus size={20} className="text-white" />
                  </div>
                </div>
                <div className="absolute top-4 left-1/2 -translate-x-1/2">
                  <div className="text-2xl font-bold text-purple-600">A</div>
                </div>
              </div>
              <div className="relative ml-8">
                <div className="w-20 h-28 bg-pink-300 rounded-lg mb-2" />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                  <div className="w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center">
                    <Plus size={20} className="text-white" />
                  </div>
                </div>
                <div className="absolute top-4 left-1/2 -translate-x-1/2">
                  <div className="space-y-1">
                    <div className="w-12 h-1 bg-pink-600 rounded" />
                    <div className="w-10 h-1 bg-pink-600 rounded" />
                    <div className="w-8 h-1 bg-pink-600 rounded" />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-4 left-8 w-3 h-3 bg-yellow-400 rounded-full" />
            <div className="absolute top-12 right-12 w-4 h-4 bg-blue-400 transform rotate-45" />
            <div className="absolute bottom-8 left-12 w-2 h-2 bg-purple-400 rounded-full" />
            <div className="absolute bottom-16 right-8 w-3 h-3 bg-pink-400 transform rotate-45" />
          </div>
        </div>
        <p className="text-sm text-gray-600 text-center mb-6 max-w-md">
          Zoho WorkDrive is an online file sync, storage and content collaboration platform.
        </p>
        <AuthButton
          bg="#16a34a"
          hoverBg="#15803d"
          onClick={() => {
            window.open(
              "https://workdrive.zoho.com/home/onboard/createteamwithsoid?org_id=909892451&service_name=ZohoBooks",
              "_blank"
            );
          }}
        >
          Set up your team
        </AuthButton>
      </div>
    );
  }

  if (provider === "gdrive") {
    return (
      <div className="flex flex-col items-center max-w-lg">
        <div className="mb-8">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 256 256" className="w-full h-full">
              <path d="M128 32L32 128l96 96V32z" fill="#0F9D58" />
              <path d="M128 32l96 96-96 96V32z" fill="#4285F4" />
              <path d="M32 128l96 96V128L32 32v96z" fill="#F4B400" />
            </svg>
          </div>
        </div>
        <TermsBlock>
          By clicking on this button you agree to the provider's terms of use and privacy policy and understand that
          the rights to use this product do not come from Zoho.
        </TermsBlock>
        <AuthButton
          bg="#2563eb"
          hoverBg="#1d4ed8"
          onClick={() => window.open("https://accounts.google.com/v3/signin/accountchooser", "_blank")}
        >
          Authenticate Google
        </AuthButton>
      </div>
    );
  }

  if (provider === "dropbox") {
    return (
      <div className="flex flex-col items-center max-w-lg">
        <div className="mb-8">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg viewBox="0 0 128 128" className="w-full h-full">
              <defs>
                <linearGradient id="dropboxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0061FF" />
                  <stop offset="100%" stopColor="#0052CC" />
                </linearGradient>
              </defs>
              <g fill="url(#dropboxGradient)">
                <rect x="8" y="8" width="48" height="48" rx="4" />
                <rect x="72" y="8" width="48" height="48" rx="4" />
                <rect x="8" y="72" width="48" height="48" rx="4" />
                <rect x="72" y="72" width="48" height="48" rx="4" />
              </g>
            </svg>
          </div>
        </div>
        <TermsBlock>
          By clicking on this button you agree to the provider's terms of use and privacy policy and understand that
          the rights to use this product do not come from Zoho.
        </TermsBlock>
        <AuthButton
          bg="#2563eb"
          hoverBg="#1d4ed8"
          onClick={() => window.open("https://www.dropbox.com/oauth2/authorize", "_blank")}
        >
          Authenticate Dropbox
        </AuthButton>
      </div>
    );
  }

  if (provider === "box") {
    return (
      <div className="flex flex-col items-center max-w-lg">
        <div className="mb-8">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gray-100 rounded-full transform scale-110" />
              <div className="relative w-24 h-24 bg-[#0061D5] rounded-lg flex items-center justify-center">
                <span className="text-white text-4xl font-bold">b</span>
              </div>
            </div>
          </div>
        </div>
        <TermsBlock>
          By clicking on this button you agree to the provider's terms of use and privacy policy and understand that
          the rights to use this product do not come from Zoho.
        </TermsBlock>
        <AuthButton
          bg="#2563eb"
          hoverBg="#1d4ed8"
          onClick={() => window.open("https://account.box.com/api/oauth2/authorize", "_blank")}
        >
          Authenticate Box
        </AuthButton>
      </div>
    );
  }

  if (provider === "onedrive") {
    return (
      <div className="flex flex-col items-center max-w-lg">
        <div className="mb-8">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <Cloud size={128} className="text-[#0078D4]" fill="#0078D4" strokeWidth={0} />
          </div>
        </div>
        <TermsBlock>
          By clicking on this button you agree to the provider's terms of use and privacy policy and understand that
          the rights to use this product do not come from Zoho.
        </TermsBlock>
        <AuthButton
          bg="#2563eb"
          hoverBg="#1d4ed8"
          onClick={() => window.open("https://login.microsoftonline.com/common/oauth2/v2.0/authorize", "_blank")}
        >
          Authenticate OneDrive
        </AuthButton>
      </div>
    );
  }

  if (provider === "evernote") {
    return (
      <div className="flex flex-col items-center max-w-lg">
        <div className="mb-8">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div className="relative w-32 h-32 bg-[#00A82D] rounded-lg flex items-center justify-center shadow-lg">
              <svg viewBox="0 0 100 100" className="w-20 h-20">
                <path
                  d="M 50 15 Q 25 15 15 35 Q 10 45 10 60 Q 10 75 20 85 Q 15 80 15 70 Q 15 60 25 55 Q 20 50 20 40 Q 20 30 30 30 Q 35 25 40 30 Q 45 25 50 30 Q 55 25 60 30 Q 65 25 70 30 Q 75 30 75 40 Q 75 50 70 55 Q 80 60 80 70 Q 80 80 75 85 Q 85 75 85 60 Q 85 45 80 35 Q 70 15 50 15 Z"
                  fill="#2D2926"
                />
                <ellipse cx="20" cy="50" rx="8" ry="15" fill="#2D2926" />
                <path
                  d="M 40 40 Q 35 45 35 50 Q 35 55 40 60"
                  stroke="#2D2926"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
        <TermsBlock>
          By clicking on this button you agree to the provider's terms of use and privacy policy and understand that
          the rights to use this product do not come from Zoho.
        </TermsBlock>
        <AuthButton
          bg="#00A82D"
          hoverBg="#008A24"
          onClick={() => window.open("https://accounts.evernote.com/login", "_blank")}
        >
          Authenticate Evernote
        </AuthButton>
      </div>
    );
  }

  return null;
}

export default function CloudPickerModal({ isOpen, onClose }: Props) {
  const [selectedCloudProvider, setSelectedCloudProvider] = useState("zoho");

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-[900px] h-[640px] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-700">Cloud Picker</h2>
          <button onClick={onClose} className="text-red-500 hover:text-red-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[180px] bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
            <div className="p-2">
              {providers.map((provider) => {
                const IconComponent = provider.icon;
                const isSelected = selectedCloudProvider === provider.id;
                return (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedCloudProvider(provider.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                      isSelected ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <IconComponent size={24} className={isSelected ? "text-blue-600" : "text-gray-500"} />
                    <span>{provider.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-auto p-2 flex justify-center">
              <div className="flex flex-col gap-1">
                <ChevronUp size={16} className="text-gray-300" />
                <ChevronDown size={16} className="text-gray-300" />
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
            <ProviderContent provider={selectedCloudProvider} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
