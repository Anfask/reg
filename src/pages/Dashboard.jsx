import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";
import { db } from "../config/firebase";
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { jsPDF } from "jspdf";
import Swal from 'sweetalert2';
import { 
  FiLogOut, 
  FiUsers, 
  FiCalendar, 
  FiCheckSquare, 
  FiSearch, 
  FiFilter,
  FiDownload,
  FiFileText,
  FiBarChart2,
  FiPieChart,
  FiMapPin,
  FiUserCheck,
  FiFile,
  FiFilePlus,
  FiTrendingUp,
  FiPrinter,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSave,
  FiClock,
  FiWatch
} from "react-icons/fi";
import { 
  HiOutlineUserGroup,
  HiOutlineCalendar,
  HiOutlineCheckCircle,
  HiOutlineChartBar,
  HiOutlineChartPie
} from "react-icons/hi";

const ZONES = [
  "Poonch",
  "Mandi",
  "Mendher",
  "Surankote",
  "Rajouri",
  "Jammu",
  "Srinagar",
  "North East",
  "South",
  "Rajasthan",
  "Maharashta",
  "PR Department",
  "Academia Department",
  "Directorate",
  "Not Applicable"
];

// Schedule configurations matching the attendance page
const day1Schedule = {
  morning: { display: "Morning 10:00 AM" },
  afternoon: { display: "Afternoon 2:30 PM" },
  evening: { display: "Evening 6:20 PM" }
};

const day2Schedule = {
  morning: { display: "Morning 8:30 AM" },
  afternoon: { display: "Afternoon 2:30 PM" },
  evening: { display: "Evening 7:00 PM" }
};

// Helper function to format Firebase timestamp
const formatFirebaseTimestamp = (timestamp) => {
  if (!timestamp) return "N/A";
  
  try {
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else if (typeof timestamp === 'string') {
      return timestamp;
    } else if (timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    
    return "Invalid Date";
  } catch (error) {
    console.error("Error formatting timestamp:", error);
    return "N/A";
  }
};

// Helper function to get schedule display
const getScheduleDisplay = (dayNum, scheduleType) => {
  const schedule = dayNum === "1" ? day1Schedule : day2Schedule;
  return schedule[scheduleType]?.display || scheduleType || "Not Marked";
};

// Helper function to get date only for sorting/grouping
const getDateOnly = (timestamp) => {
  if (!timestamp) return new Date(0);
  
  try {
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    } else if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    } else if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    return new Date(0);
  } catch (error) {
    console.error("Error parsing timestamp:", error);
    return new Date(0);
  }
};

export default function AdminDashboard() {
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [reportFilter, setReportFilter] = useState("all");
  const [reportZoneFilter, setReportZoneFilter] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "registration"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      // Sort users by registration date (newest first)
      const sortedData = data.sort((a, b) => {
        const dateA = getDateOnly(a.registeredAt || a.timestamp);
        const dateB = getDateOnly(b.registeredAt || b.timestamp);
        return dateB - dateA; // Descending order (newest first)
      });
      
      setRegisteredUsers(sortedData);
      filterUsers(sortedData, searchQuery, zoneFilter, attendanceFilter);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filterUsers = (users, search, zone, attendance) => {
    let filtered = users;

    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name?.toLowerCase().includes(lowerSearch) ||
          u.mobile?.includes(lowerSearch)
      );
    }

    if (zone) {
      filtered = filtered.filter((u) => u.zone === zone);
    }

    if (attendance === "day1") {
      filtered = filtered.filter((u) => u.day1Attendance);
    } else if (attendance === "day2") {
      filtered = filtered.filter((u) => u.day2Attendance);
    } else if (attendance === "both") {
      filtered = filtered.filter((u) => u.day1Attendance && u.day2Attendance);
    } else if (attendance === "none") {
      filtered = filtered.filter((u) => !u.day1Attendance && !u.day2Attendance);
    }

    setFilteredUsers(filtered);
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    filterUsers(registeredUsers, query, zoneFilter, attendanceFilter);
  };

  const handleZoneFilter = (e) => {
    const zone = e.target.value;
    setZoneFilter(zone);
    filterUsers(registeredUsers, searchQuery, zone, attendanceFilter);
  };

  const handleAttendanceFilter = (e) => {
    const attendance = e.target.value;
    setAttendanceFilter(attendance);
    filterUsers(registeredUsers, searchQuery, zoneFilter, attendance);
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You will be logged out from the admin dashboard.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, logout!',
      cancelButtonText: 'Cancel',
      background: '#fff',
      color: '#333'
    });

    if (result.isConfirmed) {
      try {
        const auth = getAuth();
        await signOut(auth);
        
        Swal.fire({
          title: 'Logged out!',
          text: 'You have been successfully logged out.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: '#fff',
          color: '#333'
        });

        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } catch (error) {
        console.error("Logout error:", error);
        Swal.fire({
          title: 'Error!',
          text: 'Error logging out. Please try again.',
          icon: 'error',
          confirmButtonColor: '#3085d6',
          background: '#fff',
          color: '#333'
        });
      }
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user.id);
    setEditFormData({ 
      name: user.name || "",
      mobile: user.mobile || "",
      designation: user.designation || "",
      zone: user.zone || "",
      day1Attendance: user.day1Attendance || false,
      day1Schedule: user.day1Schedule || "",
      day2Attendance: user.day2Attendance || false,
      day2Schedule: user.day2Schedule || ""
    });
  };

  const handleEditChange = (field, value) => {
    setEditFormData({
      ...editFormData,
      [field]: value
    });
  };

  const handleToggleAttendance = (day) => {
    setEditFormData({
      ...editFormData,
      [day]: !editFormData[day],
      // Reset schedule when attendance is toggled off
      [`${day}Schedule`]: !editFormData[day] ? "" : editFormData[`${day}Schedule`]
    });
  };

  const handleScheduleChange = (day, schedule) => {
    setEditFormData({
      ...editFormData,
      [`${day}Schedule`]: schedule
    });
  };

  const handleSaveEdit = async () => {
    if (!editFormData.name || !editFormData.mobile || !editFormData.designation || !editFormData.zone) {
      Swal.fire({
        title: 'Error!',
        text: 'Please fill all required fields.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        background: '#fff',
        color: '#333'
      });
      return;
    }

    try {
      const userRef = doc(db, "registration", editingUser);
      await updateDoc(userRef, {
        name: editFormData.name,
        mobile: editFormData.mobile,
        designation: editFormData.designation,
        zone: editFormData.zone,
        day1Attendance: editFormData.day1Attendance,
        day1Schedule: editFormData.day1Schedule,
        day2Attendance: editFormData.day2Attendance,
        day2Schedule: editFormData.day2Schedule
      });
      setEditingUser(null);
      setEditFormData({});
      Swal.fire({
        title: 'Success!',
        text: 'User data updated successfully!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#fff',
        color: '#333'
      });
    } catch (error) {
      console.error("Error updating user:", error);
      Swal.fire({
        title: 'Error!',
        text: 'Error updating user data. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        background: '#fff',
        color: '#333'
      });
    }
  };

  const handleDeleteClick = async (userId, userName) => {
    const result = await Swal.fire({
      title: 'Delete User?',
      text: `Are you sure you want to delete ${userName}? This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete!',
      cancelButtonText: 'Cancel',
      background: '#fff',
      color: '#333'
    });

    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, "registration", userId));
        Swal.fire({
          title: 'Deleted!',
          text: 'User has been deleted successfully.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: '#fff',
          color: '#333'
        });
      } catch (error) {
        console.error("Error deleting user:", error);
        Swal.fire({
          title: 'Error!',
          text: 'Error deleting user. Please try again.',
          icon: 'error',
          confirmButtonColor: '#3085d6',
          background: '#fff',
          color: '#333'
        });
      }
    }
  };

  // Enhanced statistics with schedule breakdown
  const stats = {
    totalRegistered: registeredUsers.length,
    day1Attendance: registeredUsers.filter((u) => u.day1Attendance).length,
    day2Attendance: registeredUsers.filter((u) => u.day2Attendance).length,
    bothDays: registeredUsers.filter((u) => u.day1Attendance && u.day2Attendance).length,
    day1Schedules: {
      morning: registeredUsers.filter(u => u.day1Schedule === 'morning').length,
      afternoon: registeredUsers.filter(u => u.day1Schedule === 'afternoon').length,
      evening: registeredUsers.filter(u => u.day1Schedule === 'evening').length
    },
    day2Schedules: {
      morning: registeredUsers.filter(u => u.day2Schedule === 'morning').length,
      afternoon: registeredUsers.filter(u => u.day2Schedule === 'afternoon').length,
      evening: registeredUsers.filter(u => u.day2Schedule === 'evening').length
    }
  };

  const zoneStats = ZONES.map((zone) => {
    const usersInZone = registeredUsers.filter((u) => u.zone === zone);
    return {
      zone,
      registered: usersInZone.length,
      day1: usersInZone.filter((u) => u.day1Attendance).length,
      day2: usersInZone.filter((u) => u.day2Attendance).length
    };
  });

  // Enhanced chart data with schedule breakdown
  const chartData = [
    { name: "Day 1", count: stats.day1Attendance },
    { name: "Day 2", count: stats.day2Attendance },
    { name: "Both Days", count: stats.bothDays }
  ];

  const scheduleChartData = [
    { name: "Day 1 Morning", count: stats.day1Schedules.morning },
    { name: "Day 1 Afternoon", count: stats.day1Schedules.afternoon },
    { name: "Day 1 Evening", count: stats.day1Schedules.evening },
    { name: "Day 2 Morning", count: stats.day2Schedules.morning },
    { name: "Day 2 Afternoon", count: stats.day2Schedules.afternoon },
    { name: "Day 2 Evening", count: stats.day2Schedules.evening }
  ];

  const COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#8B5CF6"];

  const showLoadingAlert = (title) => {
    Swal.fire({
      title: title,
      text: 'Please wait...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
      background: '#fff',
      color: '#333'
    });
  };

  const getFilteredDataForReport = () => {
    let data = registeredUsers;

    if (reportFilter === "day1") {
      data = data.filter(u => u.day1Attendance);
    } else if (reportFilter === "day2") {
      data = data.filter(u => u.day2Attendance);
    } else if (reportFilter === "both") {
      data = data.filter(u => u.day1Attendance && u.day2Attendance);
    } else if (reportFilter === "none") {
      data = data.filter(u => !u.day1Attendance && !u.day2Attendance);
    }

    if (reportZoneFilter) {
      data = data.filter(u => u.zone === reportZoneFilter);
    }

    return data;
  };

  const generatePDFReport = () => {
    showLoadingAlert('Generating PDF Report');
    
    setTimeout(() => {
      try {
        const reportData = getFilteredDataForReport();
        const doc = new jsPDF("p", "mm", "a4");
        let yPosition = 20;

        // Title
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text("Ahibba Summit 2025 - Registration Details", 14, yPosition);
        yPosition += 12;

        // Filter info
        doc.setFontSize(10);
        let filterInfo = "Filters: ";
        if (reportZoneFilter) filterInfo += `Zone: ${reportZoneFilter}, `;
        if (reportFilter !== "all") filterInfo += `Attendance: ${reportFilter}`;
        if (filterInfo === "Filters: ") filterInfo = "Filters: All Users";
        
        doc.text(filterInfo, 14, yPosition);
        yPosition += 6;
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, yPosition);
        yPosition += 8;

        // Summary Statistics
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Summary", 14, yPosition);
        yPosition += 8;

        doc.setFont(undefined, "normal");
        doc.setFontSize(10);
        doc.text(`Total Records: ${reportData.length}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Day 1 Attendance: ${reportData.filter(u => u.day1Attendance).length}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Day 2 Attendance: ${reportData.filter(u => u.day2Attendance).length}`, 14, yPosition);
        yPosition += 12;

        // Registration Details Table
        doc.setFont(undefined, "bold");
        doc.setFontSize(8);
        
        // Headers
        doc.rect(14, yPosition - 5, 182, 7, "S");
        doc.text("Name", 16, yPosition);
        doc.text("Mobile", 50, yPosition);
        doc.text("Designation", 75, yPosition);
        doc.text("Zone", 115, yPosition);
        doc.text("Day 1", 140, yPosition);
        doc.text("Day 2", 170, yPosition);
        yPosition += 10;

        // Data rows
        doc.setFont(undefined, "normal");
        doc.setFontSize(7);

        reportData.forEach((user) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }

          doc.text(user.name?.substring(0, 20) || "N/A", 16, yPosition);
          doc.text(user.mobile || "N/A", 50, yPosition);
          doc.text(user.designation?.substring(0, 15) || "N/A", 75, yPosition);
          doc.text(user.zone?.substring(0, 12) || "N/A", 115, yPosition);
          
          // Day 1 attendance with schedule
          const day1Text = user.day1Attendance ? 
            (user.day1Schedule ? getScheduleDisplay("1", user.day1Schedule).substring(0, 8) : "Present") : "Absent";
          doc.text(day1Text, 140, yPosition);
          
          // Day 2 attendance with schedule
          const day2Text = user.day2Attendance ? 
            (user.day2Schedule ? getScheduleDisplay("2", user.day2Schedule).substring(0, 8) : "Present") : "Absent";
          doc.text(day2Text, 170, yPosition);
          
          doc.setDrawColor(200, 200, 200);
          doc.line(14, yPosition + 1, 196, yPosition + 1);
          yPosition += 7;
        });

        doc.save("Ahibba_Registration_Details.pdf");
        
        Swal.fire({
          title: 'Success!',
          text: 'PDF report downloaded successfully!',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          background: '#fff',
          color: '#333'
        });
      } catch (error) {
        console.error("Error generating PDF:", error);
        Swal.fire({
          title: 'Error!',
          text: `Error generating PDF: ${error.message}`,
          icon: 'error',
          confirmButtonColor: '#3085d6',
          background: '#fff',
          color: '#333'
        });
      }
    }, 1000);
  };

  // ... (other report generation functions remain similar but updated for schedules)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-lg">
                <img 
                  src="/yeslogo.png" 
                  alt="Ahibba Summit Logo" 
                  className="h-8 w-auto object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Ahibba Summit 2025</h1>
                <p className="text-sm text-blue-100 flex items-center">
                  <FiTrendingUp className="mr-1" />
                  Admin Dashboard
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white/20 hover:bg-white/30 text-white font-semibold py-2.5 px-6 rounded-lg shadow-md transition-all duration-300 flex items-center space-x-2 border border-white/30 hover:border-white/40 hover:scale-105"
            >
              <FiLogOut className="text-lg" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6">
        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-700 font-medium">Loading dashboard data...</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Total Registered</h3>
                <p className="text-3xl font-bold text-gray-800">{stats.totalRegistered}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <HiOutlineUserGroup className="text-2xl text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-400 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Day 1 Attendance</h3>
                <p className="text-3xl font-bold text-gray-800">{stats.day1Attendance}</p>
                <div className="text-xs text-gray-600 mt-1">
                  M: {stats.day1Schedules.morning} | A: {stats.day1Schedules.afternoon} | E: {stats.day1Schedules.evening}
                </div>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <HiOutlineCalendar className="text-2xl text-blue-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Day 2 Attendance</h3>
                <p className="text-3xl font-bold text-gray-800">{stats.day2Attendance}</p>
                <div className="text-xs text-gray-600 mt-1">
                  M: {stats.day2Schedules.morning} | A: {stats.day2Schedules.afternoon} | E: {stats.day2Schedules.evening}
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <FiCalendar className="text-2xl text-green-500" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Both Days</h3>
                <p className="text-3xl font-bold text-gray-800">{stats.bothDays}</p>
                <div className="text-xs text-gray-600 mt-1">
                  Completed both events
                </div>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <HiOutlineCheckCircle className="text-2xl text-purple-500" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center space-x-2 mb-4">
              <FiBarChart2 className="text-xl text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Attendance Overview</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center space-x-2 mb-4">
              <HiOutlineChartPie className="text-xl text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">Schedule Distribution</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scheduleChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Schedule Statistics */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-6 rounded-xl shadow-md mb-8 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center space-x-2 mb-4">
            <FiWatch className="text-xl text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-800">Schedule-wise Attendance</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Day 1 Schedule */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="text-lg font-semibold text-blue-800 mb-3">Day 1 - October 25, 2025</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm font-medium text-gray-800">Morning (10:00 AM)</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                    {stats.day1Schedules.morning} attendees
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm font-medium text-gray-800">Afternoon (2:30 PM)</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-semibold">
                    {stats.day1Schedules.afternoon} attendees
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm font-medium text-gray-800">Evening (6:20 PM)</span>
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm font-semibold">
                    {stats.day1Schedules.evening} attendees
                  </span>
                </div>
              </div>
            </div>

            {/* Day 2 Schedule */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="text-lg font-semibold text-green-800 mb-3">Day 2 - October 26, 2025</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm font-medium text-gray-800">Morning (8:30 AM)</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                    {stats.day2Schedules.morning} attendees
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm font-medium text-gray-800">Afternoon (2:30 PM)</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-semibold">
                    {stats.day2Schedules.afternoon} attendees
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded">
                  <span className="text-sm font-medium text-gray-800">Evening (7:00 PM)</span>
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm font-semibold">
                    {stats.day2Schedules.evening} attendees
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Zone Statistics */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-6 rounded-xl shadow-md mb-8 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center space-x-2 mb-4">
            <FiMapPin className="text-xl text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-800">Zone-wise Statistics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <FiMapPin className="text-sm" />
                      <span>Zone</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Day 1
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Day 2
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {zoneStats.map((stat, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stat.zone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.registered}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                      {stat.day1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                      {stat.day2}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Report Generation Section (unchanged) */}
        {/* ... */}

        {/* Filters Section (unchanged) */}
        {/* ... */}

        {/* Edit User Modal - Updated for Schedules */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-8 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                  <FiEdit2 />
                  <span>Edit User</span>
                </h2>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setEditFormData({});
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <FiX className="text-2xl" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={editFormData.name || ""}
                      onChange={(e) => handleEditChange("name", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Enter user name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile *</label>
                    <input
                      type="text"
                      value={editFormData.mobile || ""}
                      onChange={(e) => handleEditChange("mobile", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Enter mobile number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label>
                    <input
                      type="text"
                      value={editFormData.designation || ""}
                      onChange={(e) => handleEditChange("designation", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Enter designation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zone *</label>
                    <select
                      value={editFormData.zone || ""}
                      onChange={(e) => handleEditChange("zone", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    >
                      <option value="">Select Zone</option>
                      {ZONES.map((zone) => (
                        <option key={zone} value={zone}>{zone}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Day 1 Attendance */}
                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center space-x-2 mb-3">
                    <input
                      type="checkbox"
                      checked={editFormData.day1Attendance || false}
                      onChange={() => handleToggleAttendance("day1Attendance")}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      id="day1Attendance"
                    />
                    <label htmlFor="day1Attendance" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Day 1 Attendance (Oct 25, 2025)
                    </label>
                  </div>
                  
                  {editFormData.day1Attendance && (
                    <div className="ml-6 space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Select Schedule:</label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(day1Schedule).map(([key, schedule]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleScheduleChange("day1", key)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              editFormData.day1Schedule === key
                                ? "bg-blue-600 text-white"
                                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {schedule.display}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Day 2 Attendance */}
                <div className="border rounded-lg p-4 bg-green-50">
                  <div className="flex items-center space-x-2 mb-3">
                    <input
                      type="checkbox"
                      checked={editFormData.day2Attendance || false}
                      onChange={() => handleToggleAttendance("day2Attendance")}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      id="day2Attendance"
                    />
                    <label htmlFor="day2Attendance" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Day 2 Attendance (Oct 26, 2025)
                    </label>
                  </div>
                  
                  {editFormData.day2Attendance && (
                    <div className="ml-6 space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Select Schedule:</label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(day2Schedule).map(([key, schedule]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleScheduleChange("day2", key)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              editFormData.day2Schedule === key
                                ? "bg-green-600 text-white"
                                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {schedule.display}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3 pt-6">
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editFormData.name || !editFormData.mobile || !editFormData.designation || !editFormData.zone}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <FiSave />
                    <span>Save Changes</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setEditFormData({});
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Users Table - Updated for Schedules */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <FiUsers className="text-xl text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-800">
                Registered Users ({filteredUsers.length})
              </h3>
            </div>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Showing {filteredUsers.length} of {registeredUsers.length} users
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mobile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Designation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Day 1
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Day 2
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.mobile}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.designation}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.zone}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user.day1Attendance ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 mb-1">
                              <FiCheckSquare className="mr-1" />
                              Present
                            </span>
                            <span className="text-xs text-gray-600">
                              {getScheduleDisplay("1", user.day1Schedule)}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            ✗ Absent
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user.day2Attendance ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 mb-1">
                              <FiCheckSquare className="mr-1" />
                              Present
                            </span>
                            <span className="text-xs text-gray-600">
                              {getScheduleDisplay("2", user.day2Schedule)}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            ✗ Absent
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2 justify-center">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-colors flex items-center space-x-1 text-xs"
                          >
                            <FiEdit2 className="text-xs" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(user.id, user.name)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg transition-colors flex items-center space-x-1 text-xs"
                          >
                            <FiTrash2 className="text-xs" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <FiUsers className="text-4xl mb-2 text-gray-300" />
                        <p className="text-lg font-medium">No users found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>
    </div>
  );
}