import { useState, useEffect } from "react"
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, getDocs, query, where } from "firebase/firestore"
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth"
import { db } from "../config/firebase"
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar, PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { motion } from "framer-motion"
import Swal from 'sweetalert2'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const ZONES = [
  "Jammu & Kashmir",
  "Rajasthan",
  "Delhi",
  "Bihar",
  "West Bengal",
  "Maharashtra",
  "Andhra Pradesh",
  "Karnataka",
  "Kerala"
]

export default function Dashboard() {
  const [attendees, setAttendees] = useState([])
  const [rooms, setRooms] = useState([])
  const [bedAllocations, setBedAllocations] = useState([])
  const [filteredAttendees, setFilteredAttendees] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showRoomForm, setShowRoomForm] = useState(false)
  const [showAllocationForm, setShowAllocationForm] = useState(false)
  const [activeTabs, setActiveTabs] = useState("attendees")
  const [roomForm, setRoomForm] = useState({
    name: "",
    totalBeds: ""
  })
  const [allocationForm, setAllocationForm] = useState({
    zone: "",
    roomId: "",
    bedsAllocated: ""
  })
  const [user, setUser] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Filter states for reports
  const [zoneFilter, setZoneFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [reportType, setReportType] = useState("attendance")
  
  const auth = getAuth()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [auth])

  // Fetch attendees from 'ahibba' collection
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "ahibba"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setAttendees(data)
      filterAttendees(data, searchQuery)
    })
    return () => unsubscribe()
  }, [searchQuery])

  // Fetch rooms from 'rooms' collection
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "rooms"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setRooms(data)
    })
    return () => unsubscribe()
  }, [])

  // Fetch bed allocations from 'bedAllocations' collection
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "bedAllocations"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setBedAllocations(data)
    })
    return () => unsubscribe()
  }, [])

  const filterAttendees = (attendeesList, query) => {
    if (!query.trim()) {
      setFilteredAttendees(attendeesList)
      return
    }
    const lowerQuery = query.toLowerCase()
    const filtered = attendeesList.filter(
      (attendee) =>
        attendee.name.toLowerCase().includes(lowerQuery) ||
        attendee.mobile.toLowerCase().includes(lowerQuery) ||
        attendee.zone.toLowerCase().includes(lowerQuery)
    )
    setFilteredAttendees(filtered)
  }

  const handleSearchChange = (e) => {
    const query = e.target.value
    setSearchQuery(query)
    filterAttendees(attendees, query)
  }

  const showAlert = (icon, title, text) => {
    Swal.fire({
      icon,
      title,
      text,
      confirmButtonColor: '#3085d6',
    })
  }

  const handleAddRoom = async (e) => {
    e.preventDefault()

    if (!roomForm.name.trim()) {
      showAlert('error', 'Error', 'Please enter room name')
      return
    }

    if (!roomForm.totalBeds || roomForm.totalBeds < 1) {
      showAlert('error', 'Error', 'Please enter valid number of beds')
      return
    }

    setIsSubmitting(true)

    try {
      await addDoc(collection(db, "rooms"), {
        name: roomForm.name.trim(),
        totalBeds: parseInt(roomForm.totalBeds),
        availableBeds: parseInt(roomForm.totalBeds),
        createdAt: new Date()
      })

      setRoomForm({ name: "", totalBeds: "" })
      setShowRoomForm(false)
      showAlert('success', 'Success', 'Room added successfully!')
    } catch (error) {
      console.error("Error adding room:", error)
      showAlert('error', 'Error', 'Failed to add room. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddAllocation = async (e) => {
    e.preventDefault()

    if (!allocationForm.zone) {
      showAlert('error', 'Error', 'Please select a zone')
      return
    }

    if (!allocationForm.roomId) {
      showAlert('error', 'Error', 'Please select a room')
      return
    }

    if (!allocationForm.bedsAllocated || allocationForm.bedsAllocated < 1) {
      showAlert('error', 'Error', 'Please enter valid number of beds to allocate')
      return
    }

    const selectedRoom = rooms.find(room => room.id === allocationForm.roomId)
    if (!selectedRoom) {
      showAlert('error', 'Error', 'Selected room not found')
      return
    }

    // Check if beds allocated exceed available beds
    if (parseInt(allocationForm.bedsAllocated) > selectedRoom.availableBeds) {
      showAlert('error', 'Error', `Only ${selectedRoom.availableBeds} beds available in ${selectedRoom.name}`)
      return
    }

    // Check if zone already has allocation for this room
    const existingAllocation = bedAllocations.find(
      alloc => alloc.zone === allocationForm.zone && alloc.roomId === allocationForm.roomId
    )

    setIsSubmitting(true)

    try {
      if (existingAllocation) {
        // Update existing allocation
        await updateDoc(doc(db, "bedAllocations", existingAllocation.id), {
          bedsAllocated: existingAllocation.bedsAllocated + parseInt(allocationForm.bedsAllocated),
          updatedAt: new Date()
        })
      } else {
        // Create new allocation
        await addDoc(collection(db, "bedAllocations"), {
          zone: allocationForm.zone,
          roomId: allocationForm.roomId,
          roomName: selectedRoom.name,
          bedsAllocated: parseInt(allocationForm.bedsAllocated),
          createdAt: new Date()
        })
      }

      // Update room's available beds
      await updateDoc(doc(db, "rooms", allocationForm.roomId), {
        availableBeds: selectedRoom.availableBeds - parseInt(allocationForm.bedsAllocated)
      })

      setAllocationForm({ zone: "", roomId: "", bedsAllocated: "" })
      setShowAllocationForm(false)
      showAlert('success', 'Success', 'Bed allocation added successfully!')
    } catch (error) {
      console.error("Error adding bed allocation:", error)
      showAlert('error', 'Error', 'Failed to add bed allocation. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRoom = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This will also remove all bed allocations for this room!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    })

    if (result.isConfirmed) {
      try {
        // Delete room allocations first
        const allocationQuery = query(collection(db, "bedAllocations"), where("roomId", "==", id))
        const allocationSnapshot = await getDocs(allocationQuery)
        
        const deleteAllocations = allocationSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        )
        
        await Promise.all(deleteAllocations)
        
        // Delete the room
        await deleteDoc(doc(db, "rooms", id))
        showAlert('success', 'Deleted!', 'Room has been deleted.')
      } catch (error) {
        console.error("Error deleting room:", error)
        showAlert('error', 'Error', 'Failed to delete room. Please try again.')
      }
    }
  }

  const handleDeleteAllocation = async (id, roomId, bedsAllocated) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This will remove the bed allocation!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, remove it!'
    })

    if (result.isConfirmed) {
      try {
        // Restore beds to room
        const roomRef = doc(db, "rooms", roomId)
        const room = rooms.find(r => r.id === roomId)
        
        if (room) {
          await updateDoc(roomRef, {
            availableBeds: room.availableBeds + bedsAllocated
          })
        }

        // Delete allocation
        await deleteDoc(doc(db, "bedAllocations", id))
        showAlert('success', 'Removed!', 'Allocation has been removed.')
      } catch (error) {
        console.error("Error deleting allocation:", error)
        showAlert('error', 'Error', 'Failed to remove allocation. Please try again.')
      }
    }
  }

  // Calculate available beds correctly for each room
  const getAvailableBedsForRoom = (room) => {
    const allocatedBeds = bedAllocations
      .filter(alloc => alloc.roomId === room.id)
      .reduce((sum, alloc) => sum + alloc.bedsAllocated, 0)
    return room.totalBeds - allocatedBeds
  }

  const getBedspaceStats = () => {
    return ZONES.map(zone => {
      const zoneAllocations = bedAllocations.filter(alloc => alloc.zone === zone)
      const usersInZone = attendees.filter(a => a.zone === zone)
      const occupiedBeds = usersInZone.length
      
      const totalAllocatedBeds = zoneAllocations.reduce((sum, alloc) => sum + alloc.bedsAllocated, 0)
      const availableBeds = Math.max(0, totalAllocatedBeds - occupiedBeds)

      const allocatedRooms = zoneAllocations.map(alloc => {
        const room = rooms.find(r => r.id === alloc.roomId)
        return room ? `${room.name} (${alloc.bedsAllocated} beds)` : "Unknown Room"
      }).join(", ")

      return {
        zone,
        allocatedRooms: allocatedRooms || "No allocations",
        totalAllocatedBeds,
        occupiedBeds,
        availableBeds,
        percentageUsed: totalAllocatedBeds > 0 ? Math.round((occupiedBeds / totalAllocatedBeds) * 100) : 0
      }
    })
  }

  const stats = getBedspaceStats()
  const totalAttendees = attendees.length
  const totalBeds = rooms.reduce((sum, room) => sum + room.totalBeds, 0)
  const totalAllocatedBeds = bedAllocations.reduce((sum, alloc) => sum + alloc.bedsAllocated, 0)
  const occupiedBeds = attendees.length
  const availableBeds = Math.max(0, totalAllocatedBeds - occupiedBeds)

  const chartData = [
    { name: "Occupied", value: occupiedBeds },
    { name: "Available", value: availableBeds },
    { name: "Unallocated", value: totalBeds - totalAllocatedBeds }
  ]

  const COLORS = ['#10B981', '#EF4444', '#6B7280']

  // PDF Report Generation
  const generatePDFReport = () => {
    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(20)
    doc.text('Ahibba Summit 2025 - Report', 14, 22)
    doc.setFontSize(12)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30)
    
    if (reportType === 'attendance') {
      generateAttendanceReport(doc)
    } else {
      generateBedAvailabilityReport(doc)
    }
    
    doc.save(`ahibba-report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const generateAttendanceReport = (doc) => {
    let filteredData = attendees
    
    // Apply filters
    if (zoneFilter) {
      filteredData = filteredData.filter(attendee => attendee.zone === zoneFilter)
    }
    
    if (dateFilter) {
      filteredData = filteredData.filter(attendee => {
        const attendeeDate = attendee.timestamp?.toDate?.().toISOString().split('T')[0]
        return attendeeDate === dateFilter
      })
    }

    doc.text(`Attendance Report - Total: ${filteredData.length} attendees`, 14, 40)
    
    const tableData = filteredData.map(attendee => [
      attendee.name,
      attendee.mobile,
      attendee.designation,
      attendee.zone,
      attendee.bedspace || 'TBD',
      attendee.timestamp?.toDate?.().toLocaleString() || 'N/A'
    ])

    doc.autoTable({
      startY: 45,
      head: [['Name', 'Mobile', 'Designation', 'Zone', 'Bedspace', 'Check-in Time']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 160, 133] }
    })
  }

  const generateBedAvailabilityReport = (doc) => {
    doc.text('Bed Availability Report', 14, 40)
    
    // Room-wise availability
    const roomData = rooms.map(room => {
      const allocatedBeds = bedAllocations
        .filter(alloc => alloc.roomId === room.id)
        .reduce((sum, alloc) => sum + alloc.bedsAllocated, 0)
      const availableBeds = room.totalBeds - allocatedBeds
      
      return [
        room.name,
        room.totalBeds,
        allocatedBeds,
        availableBeds,
        `${Math.round((allocatedBeds / room.totalBeds) * 100)}%`
      ]
    })

    doc.autoTable({
      startY: 45,
      head: [['Room Name', 'Total Beds', 'Allocated', 'Available', 'Utilization']],
      body: roomData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    })

    // Zone-wise summary
    const zoneSummaryY = doc.lastAutoTable.finalY + 15
    doc.text('Zone-wise Summary', 14, zoneSummaryY)
    
    const zoneData = stats.map(stat => [
      stat.zone,
      stat.totalAllocatedBeds,
      stat.occupiedBeds,
      stat.availableBeds,
      `${stat.percentageUsed}%`
    ])

    doc.autoTable({
      startY: zoneSummaryY + 5,
      head: [['Zone', 'Allocated Beds', 'Occupied', 'Available', 'Usage']],
      body: zoneData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [39, 174, 96] }
    })
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Ahibba Summit 2025</h1>
              <p className="text-sm text-blue-100">Admin Dashboard</p>
            </div>
            <div className="flex items-center space-x-4">
              {user && <span className="text-white text-sm">{user.email}</span>}
              <button
                onClick={() => signOut(auth)}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6">
        {/* Report Generation Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-6 rounded-lg shadow-md mb-6"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Generate Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="attendance">Attendance Report</option>
                <option value="bedAvailability">Bed Availability Report</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zone Filter</label>
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Zones</option>
                {ZONES.map(zone => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Filter</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={generatePDFReport}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors"
              >
                Generate PDF Report
              </button>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTabs("attendees")}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTabs === "attendees"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Attendees
          </button>
          <button
            onClick={() => setActiveTabs("bedspaces")}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTabs === "bedspaces"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Bedspace Management
          </button>
        </div>

        {/* Attendees Tab */}
        {activeTabs === "attendees" && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white p-5 rounded-lg shadow-md border-t-4 border-blue-500"
              >
                <h3 className="text-sm font-medium text-gray-500 mb-1">Total Attendees</h3>
                <p className="text-2xl font-bold text-gray-800">{totalAttendees}</p>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white p-5 rounded-lg shadow-md border-t-4 border-green-500"
              >
                <h3 className="text-sm font-medium text-gray-500 mb-1">Occupied Beds</h3>
                <p className="text-2xl font-bold text-gray-800">{occupiedBeds}</p>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="bg-white p-5 rounded-lg shadow-md border-t-4 border-purple-500"
              >
                <h3 className="text-sm font-medium text-gray-500 mb-1">Available Beds</h3>
                <p className="text-2xl font-bold text-gray-800">{availableBeds}</p>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white p-5 rounded-lg shadow-md border-t-4 border-orange-500"
              >
                <h3 className="text-sm font-medium text-gray-500 mb-1">Total Beds</h3>
                <p className="text-2xl font-bold text-gray-800">{totalBeds}</p>
              </motion.div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 rounded-lg shadow-md"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Bedspace Occupancy</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white p-6 rounded-lg shadow-md"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Zone-wise Distribution</h3>
                <div className="h-64 overflow-auto">
                  <div className="space-y-2">
                    {stats.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium text-gray-700 w-32">{s.zone}</span>
                        <div className="flex-1 mx-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${s.percentageUsed}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-bold text-gray-800 w-12 text-right">{s.percentageUsed}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Attendees Table */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Attendees List</h3>
                <input
                  type="text"
                  placeholder="Search by name, mobile, or zone..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="px-4 py-2 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-64"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bedspace</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAttendees.length > 0 ? (
                      filteredAttendees.map((attendee) => (
                        <tr key={attendee.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {attendee.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{attendee.mobile}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{attendee.designation}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{attendee.zone}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{attendee.bedspace || "TBD"}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {attendee.present ? "Present" : "Absent"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 text-sm text-gray-500 text-center">
                          No attendees found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}

        {/* Bedspace Management Tab */}
        {activeTabs === "bedspaces" && (
          <>
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setShowRoomForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors"
              >
                Add New Room
              </button>
              <button
                onClick={() => setShowAllocationForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors"
              >
                Allocate Beds to Zone
              </button>
            </div>

            {/* Zone-wise Bedspace Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{stat.zone}</h3>
                      <p className="text-sm text-gray-600 mt-1">{stat.allocatedRooms}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      stat.percentageUsed > 90 ? "bg-red-100 text-red-800" :
                      stat.percentageUsed > 70 ? "bg-yellow-100 text-yellow-800" :
                      "bg-green-100 text-green-800"
                    }`}>
                      {stat.percentageUsed}%
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Allocated:</span>
                      <span className="text-sm font-bold text-gray-800">{stat.totalAllocatedBeds}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Occupied:</span>
                      <span className="text-sm font-bold text-blue-600">{stat.occupiedBeds}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Available:</span>
                      <span className="text-sm font-bold text-green-600">{stat.availableBeds}</span>
                    </div>

                    <div className="pt-2">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            stat.percentageUsed > 90 ? "bg-red-500" :
                            stat.percentageUsed > 70 ? "bg-yellow-500" :
                            "bg-green-500"
                          }`}
                          style={{ width: `${stat.percentageUsed}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Rooms List */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white p-6 rounded-lg shadow-md mb-6"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Rooms</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Beds</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available Beds</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allocated Beds</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rooms.length > 0 ? (
                      rooms.map((room) => {
                        const allocatedBeds = bedAllocations
                          .filter(alloc => alloc.roomId === room.id)
                          .reduce((sum, alloc) => sum + alloc.bedsAllocated, 0)
                        const availableBeds = getAvailableBedsForRoom(room)
                        
                        return (
                          <tr key={room.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {room.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{room.totalBeds}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{availableBeds}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{allocatedBeds}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => handleDeleteRoom(room.id)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-sm text-gray-500 text-center">
                          No rooms configured. Click "Add New Room" to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Allocations List */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Bed Allocations</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beds Allocated</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bedAllocations.length > 0 ? (
                      bedAllocations.map((allocation) => (
                        <tr key={allocation.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {allocation.zone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{allocation.roomName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{allocation.bedsAllocated}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleDeleteAllocation(allocation.id, allocation.roomId, allocation.bedsAllocated)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-sm text-gray-500 text-center">
                          No bed allocations. Click "Allocate Beds to Zone" to assign beds.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </main>

      {/* Add Room Modal */}
      {showRoomForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRoomForm(false)
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Add Room</h2>
              <button
                onClick={() => setShowRoomForm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({...roomForm, name: e.target.value})}
                  placeholder="e.g., Room 101, Hostel A, Guest House B"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Beds <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={roomForm.totalBeds}
                  onChange={(e) => setRoomForm({...roomForm, totalBeds: e.target.value})}
                  placeholder="Enter total number of beds"
                  min="1"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRoomForm(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md shadow-sm transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    "Add Room"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Allocate Beds Modal */}
      {showAllocationForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAllocationForm(false)
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Allocate Beds to Zone</h2>
              <button
                onClick={() => setShowAllocationForm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddAllocation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zone <span className="text-red-500">*</span>
                </label>
                <select
                  value={allocationForm.zone}
                  onChange={(e) => setAllocationForm({...allocationForm, zone: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">-- Select Zone --</option>
                  {ZONES.map(zone => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room <span className="text-red-500">*</span>
                </label>
                <select
                  value={allocationForm.roomId}
                  onChange={(e) => setAllocationForm({...allocationForm, roomId: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">-- Select Room --</option>
                  {rooms.filter(room => getAvailableBedsForRoom(room) > 0).map(room => (
                    <option key={room.id} value={room.id}>
                      {room.name} ({getAvailableBedsForRoom(room)} beds available)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beds to Allocate <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={allocationForm.bedsAllocated}
                  onChange={(e) => setAllocationForm({...allocationForm, bedsAllocated: e.target.value})}
                  placeholder="Enter number of beds to allocate"
                  min="1"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAllocationForm(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md shadow-sm transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors disabled:bg-green-400 disabled:cursor-not-allowed flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Allocating...
                    </>
                  ) : (
                    "Allocate Beds"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}