import React, { useState } from "react";
import { CreditCard, Grid3x3 } from "lucide-react";

export default function OnlinePaymentsPage() {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("paypal");

  const paymentMethods = [
    {
      id: "credit-debit",
      name: "Credit/Debit Card",
      icon: CreditCard,
      status: "INACTIVE",
      description: "Accept payments from all the major debit and credit card networks through the supported payment gateways.",
      gateways: [
        {
          name: "2Checkout is now verifone",
          logo: "2Checkout",
          autochargeAvailable: false,
          description: "2Checkout enables businesses to accept mobile and online payments from buyers worldwide. It is ideal for businesses that sell products internationally."
        }
      ]
    },
    {
      id: "paypal",
      name: "PayPal",
      icon: null,
      logo: "PayPal",
      status: "INACTIVE",
      description: "Accept payments from your customers through your Paypal account.",
      autochargeAvailable: false,
      detailedDescription: "PayPal lets you seamlessly accept and manage all major payment types, including PayPal, Venmo (US), and Buy Now Pay Later (BNPL) within a single solution."
    },
    {
      id: "alternate-modes",
      name: "Alternate Modes",
      icon: Grid3x3,
      status: "INACTIVE",
      description: "Accept Payments from your customer through other payment modes by configuring the payment gateway listed below.",
      gateways: [
        {
          name: "Safaricom | m-pesa",
          logo: "Safaricom | m-pesa",
          autochargeAvailable: false,
          description: "Integrate with Safaricom to make the M-Pesa payment method available to your customers. M-Pesa is a payment service that lets your customers conveniently make payments right from their mobile phones using e-wallets."
        }
      ]
    }
  ];

  const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethod);

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Online Payments</h1>
        <a href="/settings/online-payments/card-verification" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
          Card Verification Settings
        </a>
      </div>

      <div className="flex gap-6">
        {/* Left Column - Payment Methods */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedPaymentMethod(method.id)}
                className={`w-full p-4 text-left border-b border-gray-200 last:border-b-0 transition ${
                  selectedPaymentMethod === method.id
                    ? "bg-blue-50 border-l-4 border-l-blue-500"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  {method.icon ? (
                    <method.icon size={24} className="text-gray-600" />
                  ) : method.logo ? (
                    <div className="w-8 h-8 flex items-center justify-center bg-white rounded border border-gray-200">
                      <span className="text-xs font-semibold text-blue-600">{method.logo}</span>
                    </div>
                  ) : null}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{method.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{method.status}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="flex-1">
          {selectedMethod && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{selectedMethod.name}</h2>
              <p className="text-sm text-gray-600 mb-6">{selectedMethod.description}</p>

              {/* PayPal specific */}
              {selectedMethod.id === "paypal" && (
                <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 flex items-center justify-center bg-white rounded border border-gray-200">
                      <span className="text-sm font-semibold text-blue-600">PayPal</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">PayPal</h3>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-gray-600 flex-1">
                      {selectedMethod.detailedDescription}
                    </p>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm text-red-600 mb-2">Autocharge is not available</div>
                      <button className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
                        Set Up Now
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Credit/Debit Card or Alternate Modes with gateways */}
              {selectedMethod.gateways && selectedMethod.gateways.length > 0 && (
                <div className="space-y-4">
                  {selectedMethod.gateways.map((gateway, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 flex items-center justify-center bg-white rounded border border-gray-200">
                          <span className="text-xs font-semibold text-gray-900">{gateway.logo}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">{gateway.name}</h3>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm text-gray-600 flex-1">
                          {gateway.description}
                        </p>
                        <div className="flex-shrink-0 text-right">
                          {!gateway.autochargeAvailable && (
                            <>
                              <div className="text-sm text-red-600 mb-2">Autocharge is not available</div>
                              <button className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
                                Set Up Now
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Can't find the payment gateway you're looking for?{" "}
          <a href="/marketplace" className="text-blue-600 hover:text-blue-700 hover:underline">
            Search in Marketplace
          </a>
        </p>
      </div>
    </div>
  );
}



