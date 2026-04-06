import React from "react";
import {
  Box,
  ChevronDown,
  Cloud,
  FileText,
  HardDrive,
  LayoutGrid,
  Square,
  Users,
  X,
  ChevronUp as ChevronUpIcon
} from "lucide-react";
import type { ImportQuotesController } from "./useImportQuotesController";

type Props = {
  controller: ImportQuotesController;
};

export default function ImportQuotesCloudPickerModal({ controller }: Props) {
  if (!controller.isCloudPickerOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => controller.setIsCloudPickerOpen(false)}>
      <div className="bg-white rounded-lg shadow-xl w-[900px] h-[640px] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-700">Cloud Picker</h2>
          <button
            onClick={() => controller.setIsCloudPickerOpen(false)}
            className="text-red-500 hover:text-red-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[180px] bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
            <div className="p-2">
              {[
                { id: "zoho", name: "Zoho WorkDrive", icon: LayoutGrid },
                { id: "gdrive", name: "Google Drive", icon: HardDrive },
                { id: "dropbox", name: "Dropbox", icon: Box },
                { id: "box", name: "Box", icon: Square },
                { id: "onedrive", name: "OneDrive", icon: Cloud },
                { id: "evernote", name: "Evernote", icon: FileText }
              ].map((provider) => {
                const IconComponent = provider.icon;
                const isSelected = controller.selectedCloudProvider === provider.id;
                return (
                  <button
                    key={provider.id}
                    onClick={() => controller.setSelectedCloudProvider(provider.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isSelected
                      ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                      : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <IconComponent
                      size={24}
                      className={isSelected ? "text-blue-600" : "text-gray-500"}
                    />
                    <span>{provider.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-auto p-2 flex justify-center">
              <div className="flex flex-col gap-1">
                <ChevronUpIcon size={16} className="text-gray-300" />
                <ChevronDown size={16} className="text-gray-300" />
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
            {controller.selectedCloudProvider === "gdrive" ? (
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

                <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                  <p>
                    By clicking on this button you agree to the provider's{" "}
                    <a href="#" className="text-blue-600 underline hover:text-blue-700" onClick={(e) => e.preventDefault()}>
                      terms of use
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-blue-600 underline hover:text-blue-700" onClick={(e) => e.preventDefault()}>
                      privacy policy
                    </a>{" "}
                    and understand that the rights to use this product do not come from Zoho. The use and transfer of information received from Google APIs to Zoho will adhere to{" "}
                    <a href="#" className="text-blue-600 underline hover:text-blue-700" onClick={(e) => e.preventDefault()}>
                      Google API Services User Data Policy
                    </a>
                    , including the{" "}
                    <a href="#" className="text-blue-600 underline hover:text-blue-700" onClick={(e) => e.preventDefault()}>
                      Limited Use Requirements
                    </a>
                    .
                  </p>
                </div>

                <button
                  className="px-8 py-3 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                  onClick={() => {
                    window.open(
                      "https://accounts.google.com/v3/signin/accountchooser?access_type=offline&approval_prompt=force&client_id=932402265855-3k3mfquq4o5kh60o8tnc9mhgn9h77717.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fgadgets.zoho.com%2Fauth%2Fgoogle&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive&state=3a3b0106a0c2d908b369a75ad93185c0aa431c64497733bda2d375130c4da610d88104c252c552adc1dee9d6167ad6bb8d2258113b9dce48b47ca4a970314a1fa7b51df3a7716016ac37be9e7d4d9f21077f946b82dc039ae2f08b7be79117042545529cf82d67d58ef6426621f5b5f885af900571347968d419f6d1a5abe3e7e1a3a4d04a433a6b3c5173f68c0c5bea&dsh=S557386361%3A1766903862725658&o2v=1&service=lso&flowName=GeneralOAuthFlow&opparams=%253F&continue=https%3A%2F%2Faccounts.google.com%2Fsignin%2Foauth%2Fconsent%3Fauthuser%3Dunknown%26part%3DAJi8hAP8z-36EGAbjuuLEd2uWDyjQgraM1HNpjnJVe4mUhXhPOQkoJHNKZG6WoCFPPrb5EDYGeFuyF3TI7jUSvDUIwBbk0PGoZLgn4Jt5TdOWWzFyQf6jLfEXhnKHaHRvCzRofERa0CbAnwAUviCEIRh6OE8GWAy3xDGHH6VltpKe7vSGjJfzwkDnAckJm1v9fghFiv7u6_xqfZlF8iB26QlWNE86HHYqzyIP3N9LKEh0NWNZAdiV__IdSu_RqOJPYoHDRNRRsyctIbVsj3CDhUyCADZvROzoeQI9VvIqJSiWLTxE7royBXKDDS96rJYovyIQ79hC_n_aNjoPVUD9jfp5cnJkn_rkGpzetwAYJTRSKhP8gM5YlFdK2Pfp2uT6ZHzVAOYmlyeCX4dc1IsyRtinTLx5WyAUPR_QcLPQzuQcRPvtjL23ZvKxoexvKp3t4zX_HTFKMrduT4G6ojAd7C-kurnZ1Wx6g%26flowName%3DGeneralOAuthFlow%26as%3DS557386361%253A1766903862725658%26client_id%3D932402265855-3k3mfquq4o5kh60o8tnc9mhgn9h77717.apps.googleusercontent.com%26requestPath%3D%252Fsignin%252Foauth%252Fconsent%23&app_domain=https%3A%2F%2Fgadgets.zoho.com",
                      "_blank"
                    );
                  }}
                >
                  Authenticate Google
                </button>
              </div>
            ) : controller.selectedCloudProvider === "dropbox" ? (
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

                <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                  <p>
                    By clicking on this button you agree to the provider's{" "}
                    <a href="#" className="text-blue-600 underline hover:text-blue-700" onClick={(e) => e.preventDefault()}>
                      terms of use
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-blue-600 underline hover:text-blue-700" onClick={(e) => e.preventDefault()}>
                      privacy policy
                    </a>{" "}
                    and understand that the rights to use this product do not come from Zoho.
                  </p>
                </div>

                <button
                  className="px-8 py-3 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                  onClick={() => {
                    window.open(
                      "https://www.dropbox.com/oauth2/authorize?response_type=code&client_id=ovpkm9147d63ifh&redirect_uri=https://gadgets.zoho.com/dropbox/auth/v2/saveToken&state=190d910cedbc107e58195259f79a434d05c66c88e1e6eaa0bc585c6a0fddb159871ede64adb4d5da61c107ca7cbb7bae891c80e9c69cf125faaaf622ab58f37c5b1d42b42c7f3add07d92465295564a6c5bd98228654cce8ff68da24941db6f0aab9a60398ac49e41b3ec211acfd5bcc&force_reapprove=true&token_access_type=offline",
                      "_blank"
                    );
                  }}
                >
                  Authenticate Dropbox
                </button>
              </div>
            ) : controller.selectedCloudProvider === "box" ? (
              <div className="flex flex-col items-center max-w-lg">
                <div className="mb-8">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gray-100 rounded-full transform scale-110"></div>
                      <div className="relative w-24 h-24 bg-[#0061D5] rounded-lg flex items-center justify-center">
                        <span className="text-white text-4xl font-bold">b</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                  <p>
                    By clicking on this button you agree to the provider's{" "}
                    <a href="#" className="text-blue-600 underline hover:text-blue-700" onClick={(e) => e.preventDefault()}>
                      terms of use
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-blue-600 underline hover:text-blue-700" onClick={(e) => e.preventDefault()}>
                      privacy policy
                    </a>{" "}
                    and understand that the rights to use this product do not come from Zoho.
                  </p>
                </div>

                <button
                  className="px-8 py-3 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                  onClick={() => {
                    window.open(
                      "https://account.box.com/api/oauth2/authorize?response_type=code&client_id=f95f6ysfm8vg1q3g84m0xyyblwnj3tr5&redirect_uri=https%3A%2F%2Fgadgets.zoho.com%2Fauth%2Fbox&state=37e352acfadd37786b1d388fb0f382baa59c9246f4dda329361910db55643700578352e4636bde8a0743bd3060e51af0ee338a34b2080bbd53a337f46b0995e28facbeff76d7efaf8db4493a0ef77be45364e38816d94499fba739987744dd1f6f5c08f84c0a11b00e075d91d7ea5c6d",
                      "_blank"
                    );
                  }}
                >
                  Authenticate Box
                </button>
              </div>
            ) : controller.selectedCloudProvider === "onedrive" ? (
              <div className="flex flex-col items-center max-w-lg">
                <div className="mb-8">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <div className="relative">
                      <Cloud size={128} className="text-[#0078D4]" fill="#0078D4" strokeWidth={0} />
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                  <p>
                    By clicking on this button you agree to the provider's{" "}
                    <a href="#" className="text-blue-600 underline hover:text-blue-700" onClick={(e) => e.preventDefault()}>
                      terms of use
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-blue-600 underline hover:text-blue-700" onClick={(e) => e.preventDefault()}>
                      privacy policy
                    </a>{" "}
                    and understand that the rights to use this product do not come from Zoho.
                  </p>
                </div>

                <button
                  className="px-8 py-3 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                  onClick={() => {
                    window.open(
                      "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=0ecabec7-1fac-433f-a968-9985926b51c3&state=e0b1053c9465a9cb98fea7eea99d3074930c6c5607a21200967caf2db861cf9df77442c92e8565087c2a339614e18415cbeb95d59c63605cee4415353b2c44da13c6b9f34bca1fcd3abdd630595133a5232ddb876567bedbe620001a59c9989df94c3823476d0eef4363b351e8886c5563f56bc9d39db9f3db7c37cd1ad827c5.%5E.US&redirect_uri=https%3A%2F%2Fgadgets.zoho.com%2Ftpa%2Foffice365&response_type=code&prompt=select_account&scope=Files.Read%20User.Read%20offline_access&sso_reload=true",
                      "_blank"
                    );
                  }}
                >
                  Authenticate OneDrive
                </button>
              </div>
            ) : controller.selectedCloudProvider === "evernote" ? (
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

                <div className="text-sm text-gray-700 text-center mb-8 leading-relaxed">
                  <p>
                    By clicking on this button you agree to the provider's{" "}
                    <a href="#" className="text-blue-600 underline hover:text-blue-700" onClick={(e) => e.preventDefault()}>
                      terms of use
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-blue-600 underline hover:text-blue-700" onClick={(e) => e.preventDefault()}>
                      privacy policy
                    </a>{" "}
                    and understand that the rights to use this product do not come from Zoho.
                  </p>
                </div>

                <button
                  className="px-8 py-3 bg-[#00A82D] text-white rounded-md text-sm font-semibold hover:bg-[#008A24] transition-colors shadow-sm"
                  onClick={() => {
                    window.open("https://accounts.evernote.com/login", "_blank");
                  }}
                >
                  Authenticate Evernote
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-full max-w-md h-64 mb-6 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    <div className="absolute inset-0 flex items-end justify-center">
                      <div className="relative">
                        <div className="w-24 h-32 bg-gray-300 rounded-lg mb-2"></div>
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                          <div className="w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center">
                            <Users size={20} className="text-white" />
                          </div>
                        </div>
                        <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                          <div className="w-8 h-6 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                      <div className="relative ml-8">
                        <div className="w-20 h-28 bg-purple-300 rounded-lg mb-2"></div>
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                          <div className="w-12 h-12 bg-purple-400 rounded-full flex items-center justify-center">
                            <Users size={20} className="text-white" />
                          </div>
                        </div>
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                          <div className="text-2xl font-bold text-purple-600">A</div>
                        </div>
                      </div>
                      <div className="relative ml-8">
                        <div className="w-20 h-28 bg-pink-300 rounded-lg mb-2"></div>
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                          <div className="w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center">
                            <Users size={20} className="text-white" />
                          </div>
                        </div>
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                          <div className="space-y-1">
                            <div className="w-12 h-1 bg-pink-600 rounded"></div>
                            <div className="w-10 h-1 bg-pink-600 rounded"></div>
                            <div className="w-8 h-1 bg-pink-600 rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-4 left-8 w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="absolute top-12 right-12 w-4 h-4 bg-blue-400 transform rotate-45"></div>
                    <div className="absolute bottom-8 left-12 w-2 h-2 bg-purple-400 rounded-full"></div>
                    <div className="absolute bottom-16 right-8 w-3 h-3 bg-pink-400 transform rotate-45"></div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 text-center mb-6 max-w-md">
                  {controller.selectedCloudProvider === "zoho"
                    ? "Zoho WorkDrive is an online file sync, storage and content collaboration platform."
                    : "Select a cloud storage provider to get started."}
                </p>

                {controller.selectedCloudProvider === "zoho" && (
                  <button
                    className="px-6 py-2.5 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                    onClick={() => {
                      window.open(
                        "https://workdrive.zoho.com/home/onboard/createteamwithsoid?org_id=909892451&service_name=ZohoBooks",
                        "_blank"
                      );
                    }}
                  >
                    Set up your team
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={() => controller.setIsCloudPickerOpen(false)}
            className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              controller.setIsCloudPickerOpen(false);
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Attach
          </button>
        </div>
      </div>
    </div>
  );
}
