import React, { useState, useEffect } from "react";
import { CreditCard, Check, X, Calendar, AlertCircle } from "lucide-react";

const API_BASE_URL = '/api';

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    features: [
      "Up to 5 users",
      "Basic features",
      "Email support"
    ]
  },
  {
    id: "basic",
    name: "Basic",
    price: 29,
    features: [
      "Up to 25 users",
      "All basic features",
      "Priority email support",
      "Advanced reporting"
    ]
  },
  {
    id: "professional",
    name: "Professional",
    price: 99,
    features: [
      "Unlimited users",
      "All features",
      "24/7 phone support",
      "Advanced reporting",
      "API access"
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 299,
    features: [
      "Unlimited everything",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "On-premise deployment"
    ]
  }
];

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState({
    plan: "free",
    status: "active",
    expiresAt: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Authentication required');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          if (data.success && data.data) {
            const orgData = data.data;
            setSubscription({
              plan: orgData.subscription?.plan || "free",
              status: orgData.subscription?.status || "active",
              expiresAt: orgData.subscription?.expiresAt || null,
            });
          }
        }
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to load subscription information');
        } else {
          setError('Failed to load subscription information');
        }
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
      setError('An error occurred while loading subscription information');
    } finally {
      setIsLoading(false);
    }
  };

  const currentPlan = PLANS.find(p => p.id === subscription.plan) || PLANS[0];

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl">
        <div className="text-center py-8">
          <div className="text-gray-500">Loading subscription information...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Manage Subscription</h1>
          <p className="text-gray-600">
            View and manage your organization's subscription plan and billing information.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Current Subscription */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Subscription</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Plan</div>
              <div className="text-xl font-semibold text-gray-900">{currentPlan.name}</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Status</div>
              <div className="flex items-center gap-2">
                {subscription.status === "active" ? (
                  <>
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-xl font-semibold text-green-600 capitalize">{subscription.status}</span>
                  </>
                ) : subscription.status === "suspended" ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <span className="text-xl font-semibold text-yellow-600 capitalize">{subscription.status}</span>
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5 text-red-500" />
                    <span className="text-xl font-semibold text-red-600 capitalize">{subscription.status}</span>
                  </>
                )}
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Expires At</div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-xl font-semibold text-gray-900">{formatDate(subscription.expiresAt)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-600 mb-2">Current Plan Features:</div>
            <ul className="space-y-2">
              {currentPlan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Available Plans */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => {
              const isCurrentPlan = plan.id === subscription.plan;
              return (
                <div
                  key={plan.id}
                  className={`border-2 rounded-lg p-6 ${
                    isCurrentPlan
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {isCurrentPlan && (
                    <div className="mb-3">
                      <span className="inline-block px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full">
                        Current Plan
                      </span>
                    </div>
                  )}
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {!isCurrentPlan && (
                    <button
                      className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                    >
                      Upgrade
                    </button>
                  )}
                  {isCurrentPlan && (
                    <button
                      className="w-full px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg cursor-not-allowed"
                      disabled
                    >
                      Current Plan
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Billing Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Information</h2>
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              For billing inquiries or to change your subscription plan, please contact our support team.
            </p>
            <p>
              Email: <a href="mailto:billing@example.com" className="text-blue-600 hover:underline">billing@example.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

