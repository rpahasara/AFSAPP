"use client"

import { useEffect, useState } from "react"
import { getWorkOrders, deleteWorkOrder, createWorkOrder, updateWorkOrder } from '../../services/workOrderService';
import { getLocations } from '../../services/locationService';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from 'react-toastify';
import * as XLSX from "xlsx";

// StatCard Component
const StatCard = ({ name, value, icon, trend }) => {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 group">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-[#0E1530] rounded-2xl flex items-center justify-center shadow-lg">
          {icon}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
      </div>
      <p className="text-gray-600 font-semibold">{name}</p>
      {trend && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 mt-2">
          {trend}
        </span>
      )}
    </div>
  )
}

// UserTable Component
const UserTable = ({ users, loading }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-4 px-4 font-semibold text-gray-900">Name</th>
            <th className="text-left py-4 px-4 font-semibold text-gray-900">Email</th>
            <th className="text-left py-4 px-4 font-semibold text-gray-900">Role</th>
            <th className="text-left py-4 px-4 font-semibold text-gray-900">Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={user.id || index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-4 px-4">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.firstname?.[0] || "U"}
                      {user.lastname?.[0] || ""}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {user.firstname} {user.lastname}
                  </span>
                </div>
              </td>
              <td className="py-4 px-4 text-gray-600">{user.email}</td>
              <td className="py-4 px-4">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.userType === "admin" ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {user.userType}
                </span>
              </td>
              <td className="py-4 px-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                  Active
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Location Card Component for Dashboard
const LocationCard = ({ location, orders, onViewOrder, onEditOrder, onAddOrder, onDeleteOrder, downloadSinglePDF }) => {
  const [searchTerm, setSearchTerm] = useState('');  // Filter orders based on search term - only search by sequence number
  
  // Sort orders by order ID and then filter if search term exists
  const sortedOrders = [...orders].sort((a, b) => {
    const aId = a.uniqueId || (a._id?.slice(-4).padStart(4, '0') || '');
    const bId = b.uniqueId || (b._id?.slice(-4).padStart(4, '0') || '');
    return aId.localeCompare(bId);
  });
  
  const filteredOrders = searchTerm.trim() ? 
    sortedOrders.filter((order, index) => {
      const sequenceNumber = String(index + 1);
      
      // Search only by exact sequence number match
      return sequenceNumber === searchTerm;
    }) : sortedOrders;

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden transition-all hover:shadow-2xl h-[320px] flex flex-col w-full relative">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0E1530] rounded-xl flex items-center justify-center">
              <LocationIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-tight">{location.name}</h3>
              <p className="text-xs text-gray-600 truncate max-w-[180px]">
                {/* Show saved address/description from work order if location is deleted */}
                {location.isDeleted
                  ? (orders[0]?.locationDescription || location.address)
                  : location.address}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#0E1530]/10 text-[#0E1530]">
              {orders.length} orders
            </span>
          </div>
        </div>
      </div>      <div className="px-3 py-2 flex-1 flex flex-col overflow-hidden">
        {orders.length === 0 ? (
          <div className="flex items-center justify-center text-center py-4 flex-1">
            <ClipboardIcon className="h-4 w-4 text-gray-400 mr-1" />
            <p className="text-xs text-gray-500">No work orders</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">            {/* Search input for orders within this location */}
            <div className="mb-3">
              <div className="relative bg-gray-50 rounded-lg">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg className="h-3 w-3 text-[#0E1530]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by sequence number (1, 2, 3...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 pl-8 pr-8 text-xs rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#0E1530] focus:border-[#0E1530] focus:outline-none bg-transparent"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {/* Header for table */}
            <div className="bg-gray-50 sticky top-0 z-10 rounded-t-lg">
              <table className="min-w-full text-xs border-collapse table-fixed">
                <thead>
                  <tr className="text-xs">
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 w-[40%]">
                      ID
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 w-[30%]">
                      Date
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-[30%]">
                      Actions
                    </th>
                  </tr>
                </thead>
              </table>
            </div>
              {/* Scrollable container for all orders */}            <div className="flex-1 overflow-y-auto h-[180px] overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300">
              <table className="min-w-full text-xs border-collapse table-fixed">
                <tbody className="bg-white divide-y divide-gray-100">
                  {/* Display filtered orders */}                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => {
                      // Find the original index of this order in the unfiltered array
                      const originalIndex = orders.findIndex(o => o._id === order._id);
                      const sequenceNumber = originalIndex + 1;
                      return (
                        <tr
                          key={order._id || originalIndex}
                          className={`hover:bg-gray-50 transition-colors h-[46px] ${
                            searchTerm && String(sequenceNumber) === searchTerm
                              ? 'bg-[#0E1530]/5'
                              : ''
                          }`}
                        >
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700 w-[40%]">
                            <div className="flex items-center">
                              <span className="font-mono text-gray-900 font-semibold">#{sequenceNumber}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 w-[30%]">
                            <div className="flex items-center">
                              <CalendarIcon className="mr-1 h-3 w-3 flex-shrink-0 text-gray-500" />
                              <span className="truncate max-w-[80px]">{order.dateOfSurvey?.slice(0, 10) || "No date"}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => onViewOrder(order)}
                                className="p-1.5 rounded-lg text-[#0E1530] hover:bg-[#0E1530]/10 transition-colors"
                                title="View Order"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => onDeleteOrder(order._id)}
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete Order"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-2 py-4 text-center text-xs text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          <svg className="h-4 w-4 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          No matching orders found
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* View All Orders Button */}
            <div className="mt-auto pt-3 border-t border-gray-100">
              <a 
                href={`/admin/workorders?location=${location._id}`} 
                className="text-xs text-[#0E1530] hover:text-[#0E1530]/80 font-semibold flex items-center justify-center py-2 hover:bg-[#0E1530]/5 rounded-lg transition-colors"
              >
                View All Orders
                <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Dashboard Work Order Grid Component
const WorkOrderLocationGrid = ({ workOrdersByLocation, loading, onViewOrder, onEditOrder, onAddOrder, onDeleteOrder, downloadSinglePDF }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-[420px] bg-white rounded-3xl shadow-xl border border-gray-100 animate-pulse flex flex-col">
            <div className="h-20 bg-gray-200 rounded-t-3xl"></div>
            <div className="flex-1 p-6 space-y-4">
              <div className="h-10 bg-gray-200 rounded-xl w-full"></div>
              {/* Scrollable area for orders */}
              <div className="h-[240px] overflow-hidden space-y-3">
                <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
                <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
                <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
                <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
                <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
              </div>
              {/* View All Orders button placeholder */}
              <div className="h-8 bg-gray-200 rounded-xl w-1/3 mx-auto mt-auto"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  const locationEntries = Object.values(workOrdersByLocation);
  
  if (!locationEntries || locationEntries.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <LocationIcon className="h-10 w-10 text-gray-400" />
        </div>
        <p className="text-gray-600 text-xl font-semibold mb-3">No locations or work orders found.</p>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Add locations and work orders to see them displayed here with their associated data.
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {locationEntries.map((entry) => (
        <LocationCard 
          key={entry.location._id} 
          location={entry.location} 
          orders={entry.orders}
          onViewOrder={onViewOrder}
          onEditOrder={onEditOrder}
          onAddOrder={onAddOrder}
          onDeleteOrder={onDeleteOrder}
          downloadSinglePDF={downloadSinglePDF}
        />
      ))}
    </div>
  );
}

// Icons as SVG components
const UsersIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
    />
  </svg>
)

const ClipboardIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2v3m-6 4h3m-3 4h3m-6-4h.01M9 16h.01"
    />
  </svg>
)

const CalendarIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 012 2z"
    />
  </svg>
)

const ClockIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
)

// Add WorkOrder Icon
const WorkOrderIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
    />
  </svg>
)

// Location Icon
const LocationIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
    />
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
    />
  </svg>
)

// Main Dashboard Component
export default function Dashboard() {
  const [stats, setStats] = useState([    {
      name: "Confined Orders",
      value: 0,
      icon: <ClipboardIcon className="text-white w-6 h-6" />,
      trend: "orders",
    },
  ])
  const [users, setUsers] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [locations, setLocations] = useState([])
  const [workOrdersByLocation, setWorkOrdersByLocation] = useState({})
  const [loading, setLoading] = useState(true)
  const [orderLoading, setOrderLoading] = useState(true)
  const [locationLoading, setLocationLoading] = useState(true)
  const [admin, setAdmin] = useState({    firstname: "Admin",
    lastname: "",
    userType: "admin",
  })
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [currentOrder, setCurrentOrder] = useState(null)
  const [isEdit, setIsEdit] = useState(false)
  const [isView, setIsView] = useState(false)
  const [currentDateTime, setCurrentDateTime] = useState({
    date: new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    time: new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
  })
  const [locationSearchTerm, setLocationSearchTerm] = useState('');
  
  // Filter locations based on search term
  const filteredLocations = locationSearchTerm.trim() 
    ? Object.values(workOrdersByLocation).filter(entry => 
        entry.location.name.toLowerCase().includes(locationSearchTerm.toLowerCase()) ||
        entry.location.address.toLowerCase().includes(locationSearchTerm.toLowerCase())
      )
    : Object.values(workOrdersByLocation);
  // Define fetchData function outside useEffect to make it reusable
  const fetchData = async () => {
    setLoading(true)
    let token = localStorage.getItem("token") || sessionStorage.getItem("token")
    token = token?.replace(/^"|"$/g, '') // Clean the token from quotes
    
    try {
      // Fetch users - using the correct endpoint
      try {
        const res = await fetch("/api/auth/", {
          headers: { Authorization: `Bearer ${token}` },
        })
        
        if (!res.ok) {
          console.error('Failed to fetch users:', res.status, res.statusText)
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        
        const data = await res.json()
        const userArray = Array.isArray(data) ? data : []
        console.log('Fetched users:', userArray.length, 'users')
        setUsers(userArray)
      } catch (userError) {
        console.error('Error fetching users:', userError)
        setUsers([]) // Set empty array on error
      }
      
      // Fetch work orders
      setOrderLoading(true)
      const orders = await getWorkOrders()
      const orderList = Array.isArray(orders) ? orders : []
      setWorkOrders(orderList)
      setOrderLoading(false)
      
      // Fetch locations
      setLocationLoading(true)
      try {
        const locationData = await getLocations()
        const locationList = (locationData?.locations || locationData?.data || [])
        setLocations(locationList)
        
        // Group work orders by location
        const ordersByLocation = {}
        
        // First, create entries for all locations, even those without orders
        locationList.forEach(location => {
          ordersByLocation[location._id] = {
            location,
            orders: []
          }
        })
        
        // Then add orders to their respective locations
        orderList.forEach(order => {
          // Try to match order to location by _id, name, or address
          let matchedLocation = locationList.find(location => 
            location._id === order.locationId || // If you store locationId in order
            location.name === order.confinedSpaceNameOrId ||
            location.name === order.building ||
            location.address === order.building
          );

          if (matchedLocation) {
            // If we found a match, add to that location
            ordersByLocation[matchedLocation._id].orders.push(order)
          } else {
            // If no match, create a "virtual" location container based on order fields
            // Use a unique key based on building+name+address to avoid mixing
            const virtualKey = `deleted-${order.building || ''}-${order.confinedSpaceNameOrId || ''}`.replace(/\s+/g, '-');
            if (!ordersByLocation[virtualKey]) {
              ordersByLocation[virtualKey] = {
                location: { 
                  _id: virtualKey,
                  name: order.building || order.confinedSpaceNameOrId || "Deleted Location",
                  address: order.locationDescription || "Deleted or missing location",
                  isDeleted: true
                },
                orders: []
              }
            }
            ordersByLocation[virtualKey].orders.push(order)
          }
        })
        
        setWorkOrdersByLocation(ordersByLocation)
      } catch (error) {
        console.error("Error fetching locations:", error)
      }
      setLocationLoading(false)
      
      // Update stats
      setStats((prev) => [
        { ...prev[0], value: orderList.length },
      ])
    } catch (error) {
      console.error("Error fetching data:", error)
      // Set empty arrays for failed fetches to avoid crashes
      setUsers([])
      setWorkOrders([])
      setOrderLoading(false)
    }
    setLoading(false)
  }
  useEffect(() => {
    // Get admin info from localStorage (set this on login)
    const adminData = localStorage.getItem("User")
    if (adminData) {
      try {
        setAdmin(JSON.parse(adminData))
      } catch (error) {
        console.error("Error parsing admin data:", error)
      }
    }

    fetchData()
  }, [])

  // Effect for updating the time dynamically
  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentDateTime({
        date: new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        time: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      });
    }, 1000);

    // Cleanup timer on component unmount
    return () => clearInterval(timer);
  }, [])
  // Handler functions for work orders
  const handleViewOrder = (order) => {
    setCurrentOrder(order)
    setIsView(true)
    setIsEdit(false)
    setShowOrderModal(true)
  }

  const handleEditOrder = (order) => {
    // Do nothing or show a message if needed
    // setCurrentOrder(order)
    // setIsView(false)
    // setIsEdit(true)
    // setShowOrderModal(true)
  }
    const handleDeleteOrder = async (orderId) => {
    if (window.confirm("Are you sure you want to delete this work order? This action cannot be undone.")) {
      try {
        // Use the imported deleteWorkOrder service function instead of direct fetch
        await deleteWorkOrder(orderId);
        
        // Remove the order from the local state
        const updatedOrders = workOrders.filter(order => order._id !== orderId);
        setWorkOrders(updatedOrders);
        
        // Update the work orders by location
        const updatedWorkOrdersByLocation = {...workOrdersByLocation};
        
        Object.keys(updatedWorkOrdersByLocation).forEach(locationId => {
          updatedWorkOrdersByLocation[locationId].orders = 
            updatedWorkOrdersByLocation[locationId].orders.filter(order => order._id !== orderId);
        });
        
        setWorkOrdersByLocation(updatedWorkOrdersByLocation);
        
        // Update stats
        setStats(prev => [
          { ...prev[0], value: updatedOrders.length },
        ]);
        
        // Show success message
        toast.success("Work order deleted successfully");
      } catch (error) {
        console.error("Error deleting work order:", error);
        toast.error("Error deleting work order: " + (error.message || "Failed to delete work order"));
      }
    }
  }

  const handleAddWorkOrder = (location) => {
    // If a location is provided, pre-fill the order with that location's info
    setCurrentOrder(location ? {
      building: location.name,
      confinedSpaceNameOrId: '',
      locationDescription: '',
      
      dateOfSurvey: new Date().toISOString().split('T')[0],
      permitRequired: false,
      // Add other default fields as needed
    } : null)
    setIsView(false)
    setIsEdit(false)
    setShowOrderModal(true)
  }

  const handleOrderModalClose = () => {
    setShowOrderModal(false)
    setCurrentOrder(null)
  }
  const downloadSinglePDF = async (order) => {
    try {
      const doc = new jsPDF();
      
      // Add company header
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text("CONFINED SPACE ASSESSMENT", 105, 15, { align: "center" });
      
      // Add form header
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      // Add uniqueId to Form No if available
      doc.text(
        "Form No: CS-" +
        (order.uniqueId ? order.uniqueId : (order._id?.slice(-6) || 'N/A')),
        14,
        25
      );
      doc.text("Date: " + order.dateOfSurvey?.slice(0, 10) || 'N/A', 14, 30);
      doc.text("Surveyors: " + order.surveyors?.join(", ") || 'N/A', 14, 35);

      // Add a line separator
      doc.setDrawColor(0);
      doc.line(14, 40, 196, 40);
      
      // Section 1: Location Information
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text("1. LOCATION INFORMATION", 14, 50);
      
      let currentY = 55;
      
      const locationInfo = [
        ['Space Name/ID:', order.confinedSpaceNameOrId || 'N/A'],
        ['Building:', order.building || 'N/A'],
        ['Location Description:', order.locationDescription || 'N/A'],
        ['Confined Space Description:', order.confinedSpaceDescription || 'N/A']
      ];
      
      autoTable(doc, {
        body: locationInfo,
        startY: currentY,
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold' },
          1: { cellWidth: 130 }
        },
        theme: 'grid',
        didDrawPage: (data) => {
          currentY = data.cursor.y + 10;
        }
      });

      // Section 2: Space Classification
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text("2. SPACE CLASSIFICATION", 14, currentY);
      currentY += 5;
      
      const spaceClassification = [
        ['Is this a Confined Space:', order.confinedSpace ? 'Yes' : 'No'],
        ['Permit Required:', order.permitRequired ? 'Yes' : 'No'],
        ['Entry Requirements:', order.entryRequirements || 'N/A']
      ];

      autoTable(doc, {
        body: spaceClassification,
        startY: currentY + 5,
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold' },
          1: { cellWidth: 130 }
        },
        theme: 'grid',
        didDrawPage: (data) => {
          currentY = data.cursor.y + 10;
        }
      });

      // Section 3: Hazard Assessment
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text("3. HAZARD ASSESSMENT", 14, currentY);
      currentY += 5;
      
      const hazardsAssessment = [
        ['Atmospheric Hazard:', order.atmosphericHazard ? 'Yes' : 'No'],
        ['Description:', order.atmosphericHazardDescription || 'N/A'],
        ['Engulfment Hazard:', order.engulfmentHazard ? 'Yes' : 'No'],
        ['Description:', order.engulfmentHazardDescription || 'N/A'],
        ['Configuration Hazard:', order.configurationHazard ? 'Yes' : 'No'],
        ['Description:', order.configurationHazardDescription || 'N/A'],
        ['Other Recognized Hazards:', order.otherRecognizedHazards ? 'Yes' : 'No'],
        ['Description:', order.otherHazardsDescription || 'N/A']
      ];

      autoTable(doc, {
        body: hazardsAssessment,
        startY: currentY + 5,
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold' },
          1: { cellWidth: 130 }
        },
        theme: 'grid',
        didDrawPage: (data) => {
          currentY = data.cursor.y + 10;
        }
      });

      // Section 4: Safety Measures
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text("4. SAFETY MEASURES", 14, currentY);
      currentY += 5;
      
      const safetyMeasures = [
        ['PPE Required:', order.ppeRequired ? 'Yes' : 'No'],
        ['PPE List:', order.ppeList || 'N/A'],
        ['Forced Air Ventilation:', order.forcedAirVentilationSufficient ? 'Sufficient' : 'Insufficient'],
        ['Dedicated Air Monitor:', order.dedicatedContinuousAirMonitor ? 'Yes' : 'No'],
        ['Warning Sign Posted:', order.warningSignPosted ? 'Yes' : 'No'],
        ['Number of Entry Points:', order.numberOfEntryPoints || 'N/A']
      ];

      autoTable(doc, {
        body: safetyMeasures,
        startY: currentY + 5,
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold' },
          1: { cellWidth: 130 }
        },
        theme: 'grid',
        didDrawPage: (data) => {
          currentY = data.cursor.y + 10;
        }
      });

      // Section 5: Additional Information
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text("5. ADDITIONAL INFORMATION", 14, currentY);
      currentY += 5;
      
      const additionalInfo = [
        ['Other People Working Near Space:', order.otherPeopleWorkingNearSpace ? 'Yes' : 'No'],
        ['Can Others See into Space:', order.canOthersSeeIntoSpace ? 'Yes' : 'No'],
        ['Do Contractors Enter Space:', order.contractorsEnterSpace ? 'Yes' : 'No'],
        ['Notes:', order.notes || 'N/A']
      ];

      autoTable(doc, {
        body: additionalInfo,
        startY: currentY + 5,
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold' },
          1: { cellWidth: 130 }
        },
        theme: 'grid',
        didDrawPage: (data) => {
          currentY = data.cursor.y + 10;
        }
      });
      
      // Add images section if available      // First check for pictures in order.pictures (from backend storage)
      // Then check for images in order.images (from frontend upload)      const orderImages = order.pictures || order.images || [];
      
      if (orderImages && orderImages.length > 0) {
        // Add a new page for images if we're running out of space
        if (currentY > doc.internal.pageSize.getHeight() - 100) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text("CONFINED SPACE IMAGES", 14, currentY);
        currentY += 10;
        
        // Track the promises for image loading
        const imagePromises = [];
        const imgInfos = [];
        // Prepare image loading for all images
        for (let i = 0; i < orderImages.length; i++) {
          const imgPath = orderImages[i];
          // Handle different image formats: URL string, base64 data, or relative path
          const imageUrl = typeof imgPath === 'string' ? 
            (imgPath.startsWith('data:') ? 
              imgPath : // Already base64
              imgPath.startsWith('http') ? 
                imgPath : // Already full URL
                `/api${imgPath.startsWith('/') ? '' : '/'}${imgPath}` // Relative path
            ) : 
            imgPath; // Some other format, hope for the best
          
          const promise = new Promise((resolve, reject) => {            
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              // Set canvas dimensions proportional to image
              let imgWidth = img.width;
              let imgHeight = img.height;
              // Smaller size for PDF images
              const maxWidth = 120; // reduced from 170
              const maxHeight = 80; // reduced from 120
              if (imgWidth > maxWidth || imgHeight > maxHeight) {
                const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
                imgWidth *= ratio;
                imgHeight *= ratio;
              }
              // Set high resolution canvas with 3x density for better quality
              canvas.width = imgWidth * 3;
              canvas.height = imgHeight * 3;
              canvas.style.width = imgWidth + "px";
              canvas.style.height = imgHeight + "px";
              ctx.scale(3, 3);
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = "high";
              ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
              const dataUrl = canvas.toDataURL('image/png', 1.0);
              imgInfos.push({
                dataUrl,
                width: imgWidth,
                height: imgHeight,
                originalPath: imgPath
              });
              resolve();
            };
            img.onerror = (err) => {
              console.error(`Error loading image: ${imageUrl}`, err);
              resolve(); // Resolve anyway to continue with other images
            };
            img.src = imageUrl;
          });
          
          imagePromises.push(promise);
        }
        
        // Wait for all images to load
        await Promise.all(imagePromises);
        
        // Add images to PDF once loaded
        if (imgInfos.length > 0) {          // Define dimensions
          const marginLeft = 14;
          const marginRight = 14;
          const pageWidth = doc.internal.pageSize.getWidth();
          const availableWidth = pageWidth - marginLeft - marginRight;
          
          let xPos = marginLeft;
          let yPos = currentY;
          const spaceBetweenImages = 10;
          
          // Add each image vertically, one per row
          for (let i = 0; i < imgInfos.length; i++) {
            const imgInfo = imgInfos[i];

            // Check if we need to add a new page
            if (yPos + imgInfo.height > doc.internal.pageSize.getHeight() - 20) {
              doc.addPage();
              yPos = 20;
            }

            try {
              // Add the image
              doc.addImage(imgInfo.dataUrl, 'PNG', xPos, yPos, imgInfo.width, imgInfo.height);

              // Add image number below the image
              doc.setFontSize(8);
              doc.setFont(undefined, 'normal');
              doc.text(`Image ${i+1}`, xPos + imgInfo.width/2, yPos + imgInfo.height + 5, { align: 'center' });

              // Move yPos for next image (vertically)
              yPos += imgInfo.height + spaceBetweenImages + 15;
            } catch (imgError) {
              console.error('Error adding image to PDF:', imgError);
            }
          }
          
          // Update Y position for next content
          currentY = yPos + 10;
        } else {
          doc.setFontSize(10);
          doc.setFont(undefined, 'italic');
          doc.text("No images available", marginLeft, currentY + 10);
          currentY += 20;
        }
      } // <-- Move this closing brace here to properly close the if block

      // Add signature section
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text("ASSESSOR SIGNATURE", 14, currentY + 10);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text("Name: " + (order.surveyors?.join(", ") || 'N/A'), 14, currentY + 20);
      doc.text("Date: " + new Date().toLocaleDateString(), 14, currentY + 30);

      // Add footer with page numbers
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: "center" }
        );
      }
      
      // Save the PDF
      doc.save(`confined-space-assessment-${order.confinedSpaceNameOrId || 'report'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error generating PDF. Please try again.');
    }
  };
    const handleOrderSubmit = async (formData) => {
    try {
      // Use the imported service functions
      if (isEdit) {
        await updateWorkOrder(currentOrder._id, formData);
      } else {
        await createWorkOrder(formData);
      }
      
      // Show success message
      toast.success(`Work order ${isEdit ? 'updated' : 'added'} successfully`);
      
      // Refresh data to update the UI
      await fetchData();
      
      // Close the modal
      setShowOrderModal(false);
    } catch (error) {
      console.error("Error saving work order:", error);
      toast.error("Error saving work order: " + error.message);
    }
  }

  // Download filtered work orders as Excel
  const handleDownloadAllExcel = () => {
    // Flatten only filtered orders into a single array
    const allOrders = [];
    filteredLocations.forEach(entry => {
      entry.orders.forEach(order => {
        // Flatten nested fields as needed for Excel
        allOrders.push({
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
        });
      });
    });

    if (allOrders.length === 0) {
      alert("No work orders to export.");
      return;
    }

    // Create worksheet and workbook
    const ws = XLSX.utils.json_to_sheet(allOrders);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WorkOrders");

    // Download as Excel file
    XLSX.writeFile(wb, "confined-space-work-orders.xlsx");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-3xl p-8 lg:p-12 shadow-2xl border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
                    Welcome back, {admin.firstname} {admin.lastname}!
                  </h1>
                  <div className="flex items-center gap-6 mt-3 text-gray-300">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      <span className="text-sm">{currentDateTime.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4" />
                      <span className="text-sm">{currentDateTime.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-gray-300 font-medium">Role</p>
                <p className="text-xl font-bold">Administrator</p>
              </div>
              <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-inner">
                <span className="text-gray-900 font-bold text-xl">
                  {admin.firstname?.[0] || "A"}
                  {admin.lastname?.[0] || ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            name="Confined Orders"
            value={stats[0]?.value || 0}
            icon={<ClipboardIcon className="text-white w-6 h-6" />}
            trend="orders"
          />
          <StatCard
            name="Total Locations"
            value={locations.length}
            icon={<LocationIcon className="text-white w-6 h-6" />}
            trend="With work orders"
          />
          <StatCard
            name="Total Users"
            value={users.length}
            icon={<UsersIcon className="text-white w-6 h-6" />}
            trend="registered"
          />
          <StatCard
            name="Active Orders"
            value={workOrders.filter(order => order.isActive !== false).length}
            icon={<WorkOrderIcon className="text-white w-6 h-6" />}
            trend="active"
          />
        </div>        {/* Work Orders by Location Section */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="bg-white border-b border-gray-100 px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0E1530] rounded-xl flex items-center justify-center">
                  <WorkOrderIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Work Orders by Location</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {Object.keys(workOrdersByLocation).length} locations with work orders
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadAllExcel}
                  className="px-4 py-2 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center gap-2"
                  title="Download all work orders as Excel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Report
                </button>
                <a 
                  href="/admin/workorders" 
                  className="px-4 py-2 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  View All Orders
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="p-6 lg:p-8">
            {/* Search bar for locations */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search locations by name or address..."
                  value={locationSearchTerm}
                  onChange={(e) => setLocationSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#0E1530] focus:border-[#0E1530] focus:outline-none bg-white"
                />
                {locationSearchTerm && (
                  <button 
                    onClick={() => setLocationSearchTerm('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {locationSearchTerm && filteredLocations.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <LocationIcon className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 text-lg font-semibold mb-2">No locations found</p>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  No locations match your search term "{locationSearchTerm}"
                </p>
              </div>
            ) : (
              <WorkOrderLocationGrid 
                workOrdersByLocation={Object.fromEntries(
                  filteredLocations.map(entry => [entry.location._id, entry])
                )}
                loading={orderLoading || locationLoading}
                onViewOrder={handleViewOrder}
                onEditOrder={undefined} // Disable edit for admin
                onAddOrder={handleAddWorkOrder}
                onDeleteOrder={handleDeleteOrder}
                downloadSinglePDF={downloadSinglePDF}
              />
            )}
          </div>
        </div>
          {/* Work Order Modal would be imported from your components */}
        {showOrderModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                <h3 className="text-2xl font-bold text-gray-900">
                  {isView ? "View Work Order" : isEdit ? "Edit Work Order" : "Add Work Order"}
                </h3>
                <button 
                  onClick={handleOrderModalClose}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* This is where you would place your actual WorkOrderModal component */}
              <div className="mt-6">
                {isView ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 mb-1">Name/ID</p>
                        <p className="font-semibold text-gray-900">{currentOrder?.confinedSpaceNameOrId || "N/A"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 mb-1">Date</p>
                        <p className="font-semibold text-gray-900">{currentOrder?.dateOfSurvey?.slice(0, 10) || "N/A"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 mb-1">Location</p>
                        <p className="font-semibold text-gray-900">{currentOrder?.building || "N/A"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 mb-1">Permit Required</p>
                        <p className="font-semibold text-gray-900">{currentOrder?.permitRequired ? "Yes" : "No"}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Description</p>
                      <p className="font-semibold text-gray-900">{currentOrder?.locationDescription || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Created By</p>
                      <p className="font-semibold text-gray-900">{currentOrder?.surveyors?.join(", ") || currentOrder?.createdBy || "N/A"}</p>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <button 
                        onClick={handleOrderModalClose} 
                        className="px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <WorkOrderIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium">Import your WorkOrderModal form component here for creating/editing work orders.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        
      </div>
    </div>
  )
}