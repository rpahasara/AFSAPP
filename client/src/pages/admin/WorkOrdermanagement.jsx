import React, { useState, useEffect, useRef } from 'react';
import { getWorkOrders, deleteWorkOrder, searchWorkOrders } from '../../services/workOrderService';
import WorkOrderTable from '../../components/admin/confined/WorkOrderTable';
import WorkOrderModal from '../../components/admin/confined/WorkOrderModel';
import WorkOrderSearch from '../../components/admin/confined/WorkOrderSearch';
import WorkOrderAlert from '../../components/admin/confined/WorkOrderAlert';
import { toast } from 'react-toastify';
import * as XLSX from "xlsx";

const WorkOrderManagementPage = () => {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState({});
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: "", message: "" });
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const searchTimeout = useRef(null);
  // State variables for delete confirmation modal
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // State for delete all confirmation modal
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  // Add state for confirmation input
  const [deleteAllConfirmInput, setDeleteAllConfirmInput] = useState("");

  // Fetch all orders
  const fetchOrders = async (params = {}) => {
    setLoading(true);
    try {
      const data = Object.keys(params).length
        ? await searchWorkOrders(params)
        : await getWorkOrders();
      setOrders(data);
    } catch (error) {
      setAlert({ type: "error", message: "Failed to fetch orders" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Search handlers
  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    const newSearch = { ...search, [name]: value };
    setSearch(newSearch);
    
    // Implement dynamic search with debounce
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      // Special handling for ID search
      if (name === 'id' || name === 'uniqueId') {
        // If searching by ID, do a client-side filter first for better matching
        if (value.trim()) {
          const lowerCaseValue = value.toLowerCase();
          
          // First try to get all orders to ensure we have the full dataset
          getWorkOrders().then(allOrders => {
            // Filter orders that match the ID or uniqueId
            // Support partial matches on the formatted ID (0001, 0002, etc.)
            const filteredOrders = allOrders.filter(order => 
              (order._id && order._id.toLowerCase().includes(lowerCaseValue)) ||
              (order.uniqueId && order.uniqueId.toLowerCase().includes(lowerCaseValue))
            );
            
            setOrders(filteredOrders);
            setLoading(false);
          }).catch(err => {
            console.error("Error fetching all orders for ID search:", err);
            // Fallback to API search
            fetchOrders(newSearch);
          });
        } else {
          // If search field is empty, fetch all orders
          fetchOrders({});
        }
      } else {
        // For all other fields, use the regular search API
        fetchOrders(newSearch);
      }
    }, 300); // 300ms debounce
  };

  const handleSearch = (e) => {
    e.preventDefault();
    
    // Special handling for ID searches to ensure better matching
    if (search.id) {
      const idValue = search.id.trim();
      if (idValue) {
        // Get all orders and do client-side filtering for better ID matching
        setLoading(true);
        getWorkOrders().then(allOrders => {
          const filteredOrders = allOrders.filter(order => {
            return (
              (order._id && order._id.toLowerCase().includes(idValue.toLowerCase())) ||
              (order.uniqueId && order.uniqueId.toLowerCase().includes(idValue.toLowerCase()))
            );
          });
          
          setOrders(filteredOrders);
          setLoading(false);
        }).catch(err => {
          console.error("Error in manual search by ID:", err);
          // Fallback to API search
          fetchOrders(search);
        });
        return;
      }
    }
    
    // For other searches use the standard fetch
    fetchOrders(search);
  };
  
  const clearSearch = () => {
    setSearch({});
    fetchOrders({});
  };

  // Modal handlers
  const handleAdd = () => {
    setCurrentOrder(null);
    setIsEdit(false);
    setShowModal(true);
  };

  const handleEdit = (order) => {
    setCurrentOrder(order);
    setIsEdit(true);
    setShowModal(true);
  };

  // Function to show delete confirmation modal
  const handleDelete = (id) => {
    setOrderToDelete(id);
    setShowDeleteConfirmModal(true);
  };

  // Function to confirm deletion
  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteWorkOrder(orderToDelete);
      setAlert({ type: "success", message: "Work order deleted successfully!" });
      fetchOrders();
      setShowDeleteConfirmModal(false);
      setOrderToDelete(null);
    } catch (error) {
      setAlert({ type: "error", message: "Failed to delete work order" });
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to cancel deletion
  const cancelDelete = () => {
    setShowDeleteConfirmModal(false);
    setOrderToDelete(null);
  };

  // Function to delete all orders
  const handleDeleteAllOrders = async () => {
    setIsDeletingAll(true);
    try {
      // Delete each order sequentially (or in parallel if you want)
      for (const order of orders) {
        await deleteWorkOrder(order._id);
      }
      setAlert({ type: "success", message: "All work orders deleted successfully!" });
      fetchOrders();
      setShowDeleteAllModal(false);
    } catch (error) {
      setAlert({ type: "error", message: "Failed to delete all work orders" });
    } finally {
      setIsDeletingAll(false);
      setDeleteAllConfirmInput(""); // Reset input after action
    }
  };

  // Download filtered orders as Excel
  const handleDownloadFilteredExcel = () => {
    if (!orders || orders.length === 0) {
      toast.info("No work orders to export.");
      return;
    }
    const allOrders = orders.map(order => ({
      "Order ID": order._id,
      "Unique ID": order.uniqueId,
      "Date of Survey": order.dateOfSurvey,
      "Surveyors": Array.isArray(order.surveyors) ? order.surveyors.join(", ") : order.surveyors,
      "Confined Space Name/ID": order.confinedSpaceNameOrId,
      "Building": order.building,
      "Location Description": order.locationDescription,
      "Confined Space Description": order.confinedSpaceDescription,
      "Confined Space": order.confinedSpace ? "Yes" : "No",
      "Permit Required": order.permitRequired ? "Yes" : "No",
      "Entry Requirements": order.entryRequirements,
      "Atmospheric Hazard": order.atmosphericHazard ? "Yes" : "No",
      "Atmospheric Hazard Description": order.atmosphericHazardDescription,
      "Engulfment Hazard": order.engulfmentHazard ? "Yes" : "No",
      "Engulfment Hazard Description": order.engulfmentHazardDescription,
      "Configuration Hazard": order.configurationHazard ? "Yes" : "No",
      "Configuration Hazard Description": order.configurationHazardDescription,
      "Other Recognized Hazards": order.otherRecognizedHazards ? "Yes" : "No",
      "Other Hazards Description": order.otherHazardsDescription,
      "PPE Required": order.ppeRequired ? "Yes" : "No",
      "PPE List": order.ppeList,
      "Forced Air Ventilation Sufficient": order.forcedAirVentilationSufficient ? "Yes" : "No",
      "Dedicated Continuous Air Monitor": order.dedicatedContinuousAirMonitor ? "Yes" : "No",
      "Warning Sign Posted": order.warningSignPosted ? "Yes" : "No",
      "Other People Working Near Space": order.otherPeopleWorkingNearSpace ? "Yes" : "No",
      "Can Others See Into Space": order.canOthersSeeIntoSpace ? "Yes" : "No",
      "Contractors Enter Space": order.contractorsEnterSpace ? "Yes" : "No",
      "Number Of Entry Points": order.numberOfEntryPoints,
      "Notes": order.notes,
      "Pictures": Array.isArray(order.pictures) ? order.pictures.join(", ") : order.pictures,
    }));

    const ws = XLSX.utils.json_to_sheet(allOrders);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WorkOrders");
    XLSX.writeFile(wb, "confined-space-work-orders.xlsx");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header Section */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 lg:p-12 mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-6 lg:space-y-0">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Confined Space Work Orders</h1>
                  <p className="text-lg text-gray-600 mt-2">Manage and track confined space assessments</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                  <span>Total Orders: {orders.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Permit Required: {orders.filter(o => o.permitRequired).length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>No Permit: {orders.filter(o => !o.permitRequired).length}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleAdd}
                className="px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add New Order
              </button>
            </div>
          </div>
        </div>

        {/* Alert Section */}
        <div className="mb-8">
          <WorkOrderAlert type={alert.type} message={alert.message} />
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 mb-8">
          <WorkOrderSearch 
            search={search} 
            onChange={handleSearchChange} 
            onSearch={handleSearch} 
            onClear={clearSearch}
          />
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleDownloadFilteredExcel}
              className="flex-1 sm:flex-none px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              title="Download filtered work orders as Excel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Excel
            </button>
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="flex-1 sm:flex-none px-6 py-3 border-2 border-red-200 text-red-700 font-semibold rounded-xl hover:bg-red-50 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center gap-2"
              title="Delete all work orders"
              disabled={orders.length === 0}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete All
            </button>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading work orders...</p>
              </div>
            </div>
          ) : (
            <WorkOrderTable 
              orders={orders} 
              onEdit={handleEdit}
              onDelete={handleDelete}
              searchParams={search}
            />
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <WorkOrderModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={() => {
          fetchOrders();
          setShowModal(false);
        }}
        order={currentOrder}
        isEdit={isEdit}
      />
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Confirm Delete</h3>
              <p className="text-gray-600 mb-8">
                Are you sure you want to delete this work order? This action cannot be undone.
              </p>
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={cancelDelete}
                  className="px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all duration-200"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting...
                    </div>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Delete All Work Orders</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <span className="font-bold text-red-600">{orders.length}</span> work orders? This action cannot be undone.
              </p>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Please type <span className="font-mono bg-gray-100 px-2 py-1 rounded text-red-700">delete all</span> to confirm:
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                  value={deleteAllConfirmInput}
                  onChange={e => setDeleteAllConfirmInput(e.target.value)}
                  disabled={isDeletingAll}
                  autoFocus
                  placeholder="Type 'delete all' to confirm"
                />
              </div>
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={() => {
                    setShowDeleteAllModal(false);
                    setDeleteAllConfirmInput("");
                  }}
                  className="px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                  disabled={isDeletingAll}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAllOrders}
                  className="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all duration-200"
                  disabled={isDeletingAll || deleteAllConfirmInput.trim().toLowerCase() !== "delete all"}
                >
                  {isDeletingAll ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting...
                    </div>
                  ) : (
                    "Delete All"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrderManagementPage;

