import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { projectsAPI, customersAPI } from "../../services/api";
import { getCurrentUser } from "../../services/auth";
import { toast } from "react-toastify";
import NewCustomerForm from "./NewCustomerForm";
import { useCurrency } from "../../hooks/useCurrency";

export default function EditProjectForm() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { code: rawCurrencyCode } = useCurrency();
  const baseCurrencyCode = rawCurrencyCode ? rawCurrencyCode.split(' ')[0].substring(0, 3).toUpperCase() : "KES";
  const [project, setProject] = useState(null);
  const [formData, setFormData] = useState({
    projectName: "",
    projectCode: "",
    customerName: "",
    billingMethod: "",
    description: "",
    costBudget: "SOS",
    revenueBudget: "SOS",
    addToWatchlist: true
  });

  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showBillingDropdown, setShowBillingDropdown] = useState(false);
  const [billingSearch, setBillingSearch] = useState("");
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [customerId, setCustomerId] = useState(null);
  const normalizeCustomers = (response) => {
    const data = Array.isArray(response) ? response : (response?.data || []);
    return data.map((customer) => ({
      id: customer._id || customer.id,
      _id: customer._id || customer.id,
      name: customer.name || customer.displayName || customer.companyName || "",
      displayName: customer.displayName || customer.name || "",
      companyName: customer.companyName || customer.company || "",
      email: customer.email || "",
      ...customer
    }));
  };
  const getCustomerLabel = (customer) =>
    String(
      customer?.name ||
      customer?.displayName ||
      customer?.companyName ||
      ""
    ).trim();
  const normalizeTaskRows = (rawTasks = []) => {
    return rawTasks.map((task, index) => ({
      ...task,
      id: task?.id ?? task?._id ?? ('task-' + (index + 1)),
      taskName: task?.taskName ?? task?.name ?? "",
      description: task?.description ?? "",
      billable: task?.billable ?? false,
    }));
  };
  const filteredCustomers = customers.filter((c) => {
    const search = customerSearch.toLowerCase();
    const haystack = [
      c.name,
      c.displayName,
      c.companyName,
      c.email
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(search);
  });

  // Load customers from database
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const response = await customersAPI.getAll();
        setCustomers(normalizeCustomers(response));
      } catch (error) {
        console.error("Error loading customers:", error);
        toast.error("Failed to load customers");
      } finally {
        setLoadingCustomers(false);
      }
    };
    fetchCustomers();
  }, []);

  // Load users from database - for now, we'll use the assignedTo users from the project
  // In the future, you can add a users API endpoint
  useEffect(() => {
    // Users will be populated from the project's assignedTo field
    // This is handled in the project loading useEffect
  }, []);

  // Load project data from database
  useEffect(() => {
    const loadProject = async () => {
      setLoading(true);
      try {
        const response = await projectsAPI.getById(projectId);
        const projectData = response?.data || response;

        if (!projectData) {
          toast.error("Project not found");
          navigate('/time-tracking');
          return;
        }

        // Transform database project to match frontend format
        const transformedProject = {
          id: projectData._id || projectData.id,
          projectName: projectData.name || projectData.projectName,
          projectNumber: projectData.projectNumber || projectData.id,
          customerName: projectData.customer?.name || projectData.customerName,
          customerId: projectData.customer?._id || projectData.customerId,
          description: projectData.description || '',
          startDate: projectData.startDate || '',
          endDate: projectData.endDate || '',
          status: projectData.status || 'planning',
          budget: projectData.budget || 0,
          currency: projectData.currency || 'USD',
          billable: projectData.billable !== undefined ? projectData.billable : true,
          billingRate: projectData.billingRate || 0,
          billingMethod: projectData.billingMethod || 'hourly',
          assignedTo: projectData.assignedTo || [],
          tags: projectData.tags || [],
          tasks: projectData.tasks || [],
          users: projectData.assignedTo || [],
          hoursBudgetType: projectData.hoursBudgetType || '',
          totalBudgetHours: projectData.totalBudgetHours || '',
          userBudgetHours: projectData.userBudgetHours || [],
          ...projectData
        };

        setProject(transformedProject);
        setCustomerId(transformedProject.customerId);
        setFormData({
          projectName: transformedProject.projectName || "",
          projectCode: transformedProject.projectNumber || "",
          customerName: transformedProject.customerName || "",
          billingMethod: transformedProject.billingMethod || "",
          description: transformedProject.description || "",
          costBudget: transformedProject.billingRate?.toString() || "0",
          revenueBudget: transformedProject.budget?.toString() || "0",
          addToWatchlist: transformedProject.addToWatchlist !== undefined ? transformedProject.addToWatchlist : true
        });

        // Transform assignedTo to users format
        const transformedUsers = transformedProject.assignedTo?.map((user, index) => ({
          id: index + 1,
          userId: typeof user === 'object' ? user._id : user,
          name: typeof user === 'object' ? user.name : '',
          email: typeof user === 'object' ? user.email : '',
          isEditable: index > 0 // First user is default (logged-in user)
        })) || [];

        // Add default user (logged-in user) if not present
        const currentUser = getCurrentUser();
        if (transformedUsers.length === 0 && currentUser) {
          transformedUsers.push({
            id: 1,
            userId: currentUser._id || currentUser.id,
            name: currentUser.name || '',
            email: currentUser.email || '',
            isEditable: false
          });
        }

        setUsers(transformedUsers);
        setTasks(normalizeTaskRows(transformedProject.tasks || []));
      } catch (error) {
        console.error("Error loading project:", error);
        toast.error("Failed to load project: " + (error.message || "Unknown error"));
        navigate('/time-tracking');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, navigate]);

  const addUser = () => {
    setUsers([...users, { id: users.length + 1, name: "", email: "", isEditable: true }]);
  };

  const removeUser = (id) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const updateUser = (id, field, value) => {
    setUsers(users.map(u => u.id === id ? { ...u, [field]: value } : u));
  };

  const addTask = () => {
    setTasks([...tasks, { id: `task-${Date.now()}`, taskName: "", description: "", billable: false }]);
  };

  const removeTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const updateTask = (id, field, value) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  if (loading || !project) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <div className="w-8 h-8 border-4 border-[#156372] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p style={{ marginTop: "16px" }}>Loading project...</p>
      </div>
    );
  }

  return (
    <div style={{
      width: "100%",
      height: "100%",
      backgroundColor: "#fff",
      padding: "0"
    }}>
      <div style={{
        maxWidth: "600px",
        margin: "0",
        padding: "24px"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px"
        }}>
          <h2 style={{
            fontSize: "20px",
            fontWeight: "600",
            color: "#333",
            margin: 0
          }}>
            Edit Project
          </h2>
          <button
            onClick={() => navigate(`/time-tracking/projects/${projectId}`)}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "#666"
            }}
          >
            ×
          </button>
        </div>

        {/* Project Details Section */}
        <div style={{ marginBottom: "32px" }}>
          <h3 style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "#333",
            marginBottom: "16px"
          }}>
            Project Details
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Project Name */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "block",
                marginBottom: "6px"
              }}>
                Project Name<span style={{ color: "#d32f2f" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  outline: "none"
                }}
              />
            </div>

            {/* Project Code */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "block",
                marginBottom: "6px"
              }}>
                Project Code
              </label>
              <input
                type="text"
                value={formData.projectCode}
                onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  outline: "none"
                }}
              />
            </div>

            {/* Customer Name */}
            <div style={{ position: "relative" }}>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "block",
                marginBottom: "6px"
              }}>
                Customer Name<span style={{ color: "#d32f2f" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: "8px", position: "relative" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    type="text"
                    value={formData.customerName || customerSearch}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setCustomerSearch(nextValue);
                      setFormData({ ...formData, customerName: nextValue });
                      setCustomerId(null);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Select customer"
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 12px",
                      border: "1px solid #156372",
                      borderRadius: "4px",
                      fontSize: "14px",
                      outline: "none"
                    }}
                  />
                  <div
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                    style={{
                      position: "absolute",
                      right: "40px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      cursor: "pointer",
                      padding: "4px"
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 6l4 4 4-4" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <button
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                    style={{
                      position: "absolute",
                      right: "0",
                      top: "0",
                      backgroundColor: "#156372",
                      color: "white",
                      border: "none",
                      borderRadius: "0 4px 4px 0",
                      padding: "10px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%"
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="9" cy="9" r="6" stroke="white" strokeWidth="2" />
                      <path d="M13 9l-3-3-3 3M10 6v6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                {showCustomerDropdown && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: "48px",
                    marginTop: "4px",
                    backgroundColor: "#fff",
                    borderRadius: "4px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 1000,
                    border: "1px solid #ddd"
                  }}>
                    <div style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                      <div style={{ position: "relative" }}>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          style={{
                            position: "absolute",
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            pointerEvents: "none"
                          }}
                        >
                          <circle cx="7" cy="7" r="5" stroke="#666" strokeWidth="1.5" />
                          <path d="M11 11l-3-3" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          placeholder="Search"
                          style={{
                            width: "100%",
                            padding: "8px 12px 8px 36px",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            fontSize: "14px",
                            outline: "none"
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                      {filteredCustomers.length === 0 ? (
                        <div>
                          <div style={{
                            padding: "16px",
                            textAlign: "center",
                            color: "#666",
                            fontSize: "14px"
                          }}>
                            NO RESULTS FOUND
                          </div>
                          <button
                            onClick={() => {
                              setShowCustomerDropdown(false);
                              setShowNewCustomerForm(true);
                            }}
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              border: "none",
                              borderTop: "1px solid #eee",
                              backgroundColor: "transparent",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              fontSize: "14px",
                              color: "#156372",
                              fontWeight: "500"
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M8 3v10M3 8h10" stroke="#156372" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            New Customer
                          </button>
                        </div>
                      ) : (
                        <>
                          {filteredCustomers.map((customer) => (
                            <div
                              key={customer._id || customer.id}
                              onClick={() => {
                                setFormData({ ...formData, customerName: getCustomerLabel(customer) });
                                setCustomerId(customer._id || customer.id);
                                setCustomerSearch("");
                                setShowCustomerDropdown(false);
                              }}
                              style={{
                                padding: "12px 16px",
                                cursor: "pointer",
                                fontSize: "14px",
                                color: "#333",
                                borderBottom: "1px solid #eee"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(21, 99, 114, 0.1)"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                              {customer.name}
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              setShowCustomerDropdown(false);
                              setShowNewCustomerForm(true);
                            }}
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              border: "none",
                              borderTop: "1px solid #eee",
                              backgroundColor: "transparent",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              fontSize: "14px",
                              color: "#156372",
                              fontWeight: "500"
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M8 3v10M3 8h10" stroke="#156372" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            New Customer
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Billing Method */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "block",
                marginBottom: "6px"
              }}>
                Billing Method<span style={{ color: "#d32f2f" }}>*</span>
              </label>
              <select
                value={formData.billingMethod}
                onChange={(e) => setFormData({ ...formData, billingMethod: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  outline: "none"
                }}
              >
                <option value="">Select billing method</option>
                <option value="fixed">Fixed Price</option>
                <option value="hourly">Hourly Rate</option>
                <option value="hourly-task">Hourly Rate Per Task</option>
                <option value="milestone">Milestone</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "block",
                marginBottom: "6px"
              }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Max. 2000 characters"
                rows="4"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  outline: "none",
                  resize: "vertical"
                }}
              />
            </div>
          </div>
        </div>

        {/* Budget Section */}
        <div style={{ marginBottom: "32px" }}>
          <h3 style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "#333",
            marginBottom: "16px"
          }}>
            Budget
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Cost Budget */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "6px"
              }}>
                Cost Budget
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7" stroke="#666" strokeWidth="1.5" />
                  <path d="M8 6v2M8 10h.01" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </label>
              <div style={{
                display: "flex",
                alignItems: "stretch",
                border: "1px solid #ddd",
                borderRadius: "4px",
                overflow: "hidden"
              }}>
                <div style={{
                  backgroundColor: "#f9fafb",
                  padding: "0 12px",
                  display: "flex",
                  alignItems: "center",
                  borderRight: "1px solid #ddd",
                  fontSize: "14px",
                  color: "#666",
                  minWidth: "60px",
                  justifyContent: "center"
                }}>
                  {baseCurrencyCode}
                </div>
                <input
                  type="text"
                  value={formData.costBudget}
                  onChange={(e) => setFormData({ ...formData, costBudget: e.target.value })}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    border: "none",
                    fontSize: "14px",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            {/* Revenue Budget */}
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "6px"
              }}>
                Revenue Budget
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7" stroke="#666" strokeWidth="1.5" />
                  <path d="M8 6v2M8 10h.01" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </label>
              <div style={{
                display: "flex",
                alignItems: "stretch",
                border: "1px solid #ddd",
                borderRadius: "4px",
                overflow: "hidden"
              }}>
                <div style={{
                  backgroundColor: "#f9fafb",
                  padding: "0 12px",
                  display: "flex",
                  alignItems: "center",
                  borderRight: "1px solid #ddd",
                  fontSize: "14px",
                  color: "#666",
                  minWidth: "60px",
                  justifyContent: "center"
                }}>
                  {baseCurrencyCode}
                </div>
                <input
                  type="text"
                  value={formData.revenueBudget}
                  onChange={(e) => setFormData({ ...formData, revenueBudget: e.target.value })}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    border: "none",
                    fontSize: "14px",
                    outline: "none"
                  }}
                />
              </div>
            </div>

            <a href="#" style={{
              color: "#156372",
              fontSize: "14px",
              textDecoration: "none"
            }}>
              Add budget for project hours.
            </a>
          </div>
        </div>

        {/* Users Section */}
        <div style={{ marginBottom: "32px" }}>
          <h3 style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "#333",
            marginBottom: "16px"
          }}>
            Users
          </h3>

          <div style={{
            border: "1px solid #ddd",
            borderRadius: "4px",
            overflow: "hidden",
            marginBottom: "12px"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "rgba(21, 99, 114, 0.05)" }}>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#333", borderBottom: "1px solid #ddd" }}>
                    S.NO
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#333", borderBottom: "1px solid #ddd" }}>
                    USER
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#333", borderBottom: "1px solid #ddd" }}>
                    EMAIL
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id}>
                    <td style={{ padding: "12px", fontSize: "14px", color: "#333", borderBottom: "1px solid #eee" }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: "12px", fontSize: "14px", color: "#333", borderBottom: "1px solid #eee" }}>
                      {user.isEditable ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <select
                            value={user.name}
                            onChange={(e) => {
                              const selectedUser = availableUsers.find(u => u.name === e.target.value);
                              updateUser(user.id, "name", e.target.value);
                              if (selectedUser) {
                                updateUser(user.id, "email", selectedUser.email);
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              border: "1px solid #ddd",
                              borderRadius: "4px",
                              fontSize: "14px",
                              outline: "none",
                              color: user.name ? "#333" : "#999"
                            }}
                          >
                            <option value="">Select user</option>
                            {availableUsers.map(u => (
                              <option key={u.id} value={u.name}>{u.name}</option>
                            ))}
                          </select>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 6l4 4 4-4" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      ) : (
                        user.name
                      )}
                    </td>
                    <td style={{ padding: "12px", fontSize: "14px", color: "#333", borderBottom: "1px solid #eee" }}>
                      {user.isEditable ? (
                        <input
                          type="email"
                          value={user.email}
                          onChange={(e) => updateUser(user.id, "email", e.target.value)}
                          placeholder="Email"
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            fontSize: "14px",
                            outline: "none",
                            color: user.email ? "#333" : "#999"
                          }}
                        />
                      ) : (
                        user.email
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={addUser}
            style={{
              backgroundColor: "#156372",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Add User
          </button>
        </div>

        {/* Project Tasks Section */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px"
          }}>
            <h3 style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#333",
              margin: 0
            }}>
              Project Tasks
            </h3>
            <a href="#" style={{
              color: "#156372",
              fontSize: "14px",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 2v12M2 8h12" stroke="#156372" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Import project tasks from existing projects.
            </a>
          </div>

          <div style={{
            border: "1px solid #ddd",
            borderRadius: "4px",
            overflow: "hidden",
            marginBottom: "12px"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "rgba(21, 99, 114, 0.05)" }}>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#333", borderBottom: "1px solid #ddd" }}>
                    S.NO
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#333", borderBottom: "1px solid #ddd" }}>
                    TASK NAME
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#333", borderBottom: "1px solid #ddd" }}>
                    DESCRIPTION
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#333", borderBottom: "1px solid #ddd" }}>
                    BILLABLE
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, index) => (
                  <tr key={task.id}>
                    <td style={{ padding: "12px", fontSize: "14px", color: "#333", borderBottom: "1px solid #eee" }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: "12px", fontSize: "14px", color: "#333", borderBottom: "1px solid #eee" }}>
                      <input
                        type="text"
                        value={task.taskName}
                        onChange={(e) => updateTask(task.id, "taskName", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "14px",
                          outline: "none"
                        }}
                      />
                    </td>
                    <td style={{ padding: "12px", fontSize: "14px", color: "#333", borderBottom: "1px solid #eee" }}>
                      <input
                        type="text"
                        value={task.description}
                        onChange={(e) => updateTask(task.id, "description", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "14px",
                          outline: "none"
                        }}
                      />
                    </td>
                    <td style={{ padding: "12px", fontSize: "14px", color: "#333", borderBottom: "1px solid #eee" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="checkbox"
                          checked={task.billable}
                          onChange={(e) => updateTask(task.id, "billable", e.target.checked)}
                          style={{ cursor: "pointer" }}
                        />
                        <button
                          onClick={() => removeTask(task.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px"
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 4l8 8M12 4l-8 8" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={addTask}
            style={{
              backgroundColor: "#156372",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Add Project Task
          </button>
        </div>

        {/* Watchlist Checkbox */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer"
          }}>
            <input
              type="checkbox"
              checked={formData.addToWatchlist}
              onChange={(e) => setFormData({ ...formData, addToWatchlist: e.target.checked })}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontSize: "14px", color: "#333" }}>
              Add to the watchlist on my dashboard
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => navigate(`/time-tracking/projects/${projectId}`)}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              // Validate required fields
              if (!formData.projectName || !formData.customerName) {
                toast.error("Please fill in all required fields");
                return;
              }

              if (!customerId) {
                toast.error("Please select a valid customer");
                return;
              }

              try {
                const selectedCustomer = customers.find(
                  (customer) => String(customer?._id || customer?.id || "") === String(customerId || "")
                );
                const selectedCustomerName = getCustomerLabel(selectedCustomer) || formData.customerName || "";
                // Prepare update data
                const updateData = {
                  name: formData.projectName,
                  projectNumber: formData.projectCode || project.projectNumber,
                  description: formData.description || '',
                  billingRate: formData.costBudget ? parseFloat(formData.costBudget) : 0,
                  budget: formData.revenueBudget ? parseFloat(formData.revenueBudget) : 0,
                  status: project.status || 'planning',
                  billable: project.billable !== undefined ? project.billable : true,
                };

                // Add customer if provided and valid
                if (customerId) {
                  updateData.customer = customerId;
                  updateData.customerId = customerId;
                  if (selectedCustomerName) {
                    updateData.customerName = selectedCustomerName;
                  }
                }

                // Map assigned users if they have valid IDs
                const assignedUserIds = users
                  .filter(u => u.userId && typeof u.userId === 'string' && u.userId.match(/^[0-9a-fA-F]{24}$/))
                  .map(u => u.userId);

                if (assignedUserIds.length > 0) {
                  updateData.assignedTo = assignedUserIds;
                }

                // Add tasks
                if (tasks.length > 0) {
                  updateData.tasks = tasks.map(task => ({
                    taskName: task.taskName || '',
                    description: task.description || '',
                    billable: task.billable !== undefined ? task.billable : true,
                    budgetHours: task.budgetHours || '',
                  }));
                }

                // Update project in database
                await projectsAPI.update(projectId, updateData);

                // Dispatch custom event to notify other components
                window.dispatchEvent(new Event('projectUpdated'));

                toast.success("Project updated successfully");

                // Navigate back to project detail page
                navigate(`/time-tracking/projects/${projectId}`);
              } catch (error) {
                console.error("Error updating project:", error);
                toast.error("Failed to update project: " + (error.message || "Unknown error"));
              }
            }}
            className="px-6 py-2 text-white rounded text-sm font-medium transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ background: 'linear-gradient(90deg, #156372 0%, #0D4A52 100%)' }}
            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            Save
          </button>
        </div>
      </div>

      {/* New Customer Form Modal */}
      {showNewCustomerForm && (
        <NewCustomerForm onClose={() => setShowNewCustomerForm(false)} />
      )}
    </div>
  );
}

