import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { collection, onSnapshot } from "firebase/firestore";
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
  FiPrinter
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
  "North East",
  "South",
  "Rajasthan",
  "Maharashta",
  "PR Department",
  "Academia Department",
  "Directoroate",
  "Not Applicable"
];

export default function AdminDashboard() {
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "registration"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRegisteredUsers(data);
      filterUsers(data, searchQuery, zoneFilter, attendanceFilter);
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
          u.name.toLowerCase().includes(lowerSearch) ||
          u.mobile.includes(lowerSearch)
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

  const stats = {
    totalRegistered: registeredUsers.length,
    day1Attendance: registeredUsers.filter((u) => u.day1Attendance).length,
    day2Attendance: registeredUsers.filter((u) => u.day2Attendance).length,
    bothDays: registeredUsers.filter((u) => u.day1Attendance && u.day2Attendance).length
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

  const chartData = [
    { name: "Day 1", count: stats.day1Attendance },
    { name: "Day 2", count: stats.day2Attendance },
    { name: "Both Days", count: stats.bothDays }
  ];

  const COLORS = ["#3B82F6", "#10B981", "#8B5CF6"];

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

  const generatePDFReport = () => {
    showLoadingAlert('Generating PDF Report');
    
    setTimeout(() => {
      try {
        const doc = new jsPDF("p", "mm", "a4");
        let yPosition = 20;

        // Title
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text("Ahibba Summit 2025 - Registration Details", 14, yPosition);
        yPosition += 12;

        // Date
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, yPosition);
        yPosition += 8;

        // Summary Statistics
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Summary", 14, yPosition);
        yPosition += 8;

        doc.setFont(undefined, "normal");
        doc.setFontSize(10);
        doc.text(`Total Registered: ${stats.totalRegistered}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Day 1 Attendance: ${stats.day1Attendance}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Day 2 Attendance: ${stats.day2Attendance}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Both Days: ${stats.bothDays}`, 14, yPosition);
        yPosition += 12;

        // Registration Details Table
        doc.setFont(undefined, "bold");
        doc.setFontSize(9);
        
        // Headers
        doc.rect(14, yPosition - 5, 182, 7, "S");
        doc.text("Name", 16, yPosition);
        doc.text("Mobile", 60, yPosition);
        doc.text("Designation", 90, yPosition);
        doc.text("Zone", 140, yPosition);
        doc.text("D1", 170, yPosition);
        doc.text("D2", 185, yPosition);
        yPosition += 10;

        // Data rows
        doc.setFont(undefined, "normal");
        doc.setFontSize(8);

        filteredUsers.forEach((user, idx) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }

          doc.text(user.name?.substring(0, 25) || "N/A", 16, yPosition);
          doc.text(user.mobile || "N/A", 60, yPosition);
          doc.text(user.designation?.substring(0, 20) || "N/A", 90, yPosition);
          doc.text(user.zone?.substring(0, 15) || "N/A", 140, yPosition);
          doc.text(user.day1Attendance ? "✓" : "✗", 170, yPosition);
          doc.text(user.day2Attendance ? "✓" : "✗", 185, yPosition);
          
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

  const generateDetailedPDF = () => {
    showLoadingAlert('Generating Detailed PDF');
    
    setTimeout(() => {
      try {
        const doc = new jsPDF("p", "mm", "a4");
        let yPosition = 20;

        // Title
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text("Ahibba Summit 2025 - Complete Registration Details", 14, yPosition);
        yPosition += 12;

        // Date and summary
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, yPosition);
        yPosition += 5;
        doc.text(`Total Records: ${filteredUsers.length}`, 14, yPosition);
        yPosition += 10;

        // Detailed table
        doc.setFont(undefined, "bold");
        doc.setFontSize(8);
        
        // Headers
        const headers = [
          { text: "Name", x: 16 },
          { text: "Mobile", x: 50 },
          { text: "Designation", x: 75 },
          { text: "Zone", x: 120 },
          { text: "Day1", x: 150 },
          { text: "Day2", x: 165 },
          { text: "Reg Date", x: 180 }
        ];

        // Draw header background
        doc.setFillColor(240, 240, 240);
        doc.rect(14, yPosition - 4, 182, 6, "F");
        doc.setDrawColor(0, 0, 0);
        doc.rect(14, yPosition - 4, 182, 6, "S");

        // Header text
        headers.forEach(header => {
          doc.text(header.text, header.x, yPosition);
        });
        yPosition += 8;

        // Data rows
        doc.setFont(undefined, "normal");
        doc.setFontSize(7);

        filteredUsers.forEach((user, index) => {
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
            
            // Redraw headers on new page
            doc.setFont(undefined, "bold");
            doc.setFontSize(8);
            doc.setFillColor(240, 240, 240);
            doc.rect(14, yPosition - 4, 182, 6, "F");
            doc.setDrawColor(0, 0, 0);
            doc.rect(14, yPosition - 4, 182, 6, "S");
            headers.forEach(header => {
              doc.text(header.text, header.x, yPosition);
            });
            yPosition += 8;
            doc.setFont(undefined, "normal");
            doc.setFontSize(7);
          }

          // Row data
          doc.text(user.name?.substring(0, 20) || "N/A", 16, yPosition);
          doc.text(user.mobile || "N/A", 50, yPosition);
          doc.text(user.designation?.substring(0, 18) || "N/A", 75, yPosition);
          doc.text(user.zone?.substring(0, 12) || "N/A", 120, yPosition);
          doc.text(user.day1Attendance ? "✓" : "✗", 150, yPosition);
          doc.text(user.day2Attendance ? "✓" : "✗", 165, yPosition);
          
          // Registration date
          const regDate = user.timestamp 
            ? new Date(user.timestamp.seconds * 1000).toLocaleDateString()
            : "N/A";
          doc.text(regDate, 180, yPosition);

          // Row separator
          doc.setDrawColor(220, 220, 220);
          doc.line(14, yPosition + 1, 196, yPosition + 1);
          yPosition += 5;
        });

        doc.save("Ahibba_Complete_Registration_Details.pdf");
        
        Swal.fire({
          title: 'Success!',
          text: 'Complete registration details PDF downloaded successfully!',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          background: '#fff',
          color: '#333'
        });
      } catch (error) {
        console.error("Error generating registration details PDF:", error);
        Swal.fire({
          title: 'Error!',
          text: `Error: ${error.message}`,
          icon: 'error',
          confirmButtonColor: '#3085d6',
          background: '#fff',
          color: '#333'
        });
      }
    }, 1000);
  };

  const generateCSVReport = () => {
    showLoadingAlert('Generating CSV Report');
    
    setTimeout(() => {
      try {
        // Create CSV headers
        const headers = ['Name', 'Mobile Number', 'Designation', 'Zone', 'Day 1 Attendance', 'Day 2 Attendance', 'Registration Date'];
        
        // Create CSV rows
        const csvRows = [
          headers,
          ...filteredUsers.map(user => [
            `"${(user.name || 'N/A').replace(/"/g, '""')}"`,
            `"${(user.mobile || 'N/A').replace(/"/g, '""')}"`,
            `"${(user.designation || 'N/A').replace(/"/g, '""')}"`,
            `"${(user.zone || 'N/A').replace(/"/g, '""')}"`,
            `"${user.day1Attendance ? 'Present' : 'Absent'}"`,
            `"${user.day2Attendance ? 'Present' : 'Absent'}"`,
            `"${user.timestamp ? new Date(user.timestamp.seconds * 1000).toLocaleDateString() : 'N/A'}"`
          ])
        ];

        // Convert to CSV string
        const csvString = csvRows.map(row => row.join(',')).join('\n');
        
        // Create and download file
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Ahibba_Registration_Details.csv';
        link.click();
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
          title: 'Success!',
          text: 'CSV report downloaded successfully!',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          background: '#fff',
          color: '#333'
        });
      } catch (error) {
        console.error("Error generating CSV:", error);
        Swal.fire({
          title: 'Error!',
          text: `Error generating CSV file: ${error.message}`,
          icon: 'error',
          confirmButtonColor: '#3085d6',
          background: '#fff',
          color: '#333'
        });
      }
    }, 500);
  };

  const generateTextReport = () => {
    showLoadingAlert('Generating Text Report');
    
    setTimeout(() => {
      try {
        let textContent = `AHIBBA SUMMIT 2025 - REGISTRATION REPORT\n`;
        textContent += `Generated: ${new Date().toLocaleDateString()}\n`;
        textContent += `Total Records: ${filteredUsers.length}\n\n`;
        textContent += `SUMMARY:\n`;
        textContent += `Total Registered: ${stats.totalRegistered}\n`;
        textContent += `Day 1 Attendance: ${stats.day1Attendance}\n`;
        textContent += `Day 2 Attendance: ${stats.day2Attendance}\n`;
        textContent += `Both Days: ${stats.bothDays}\n\n`;
        textContent += `DETAILED REGISTRATION:\n`;
        textContent += `Name\tMobile\tDesignation\tZone\tDay1\tDay2\n`;
        textContent += `----\t------\t-----------\t----\t----\t----\n`;
        
        filteredUsers.forEach(user => {
          textContent += `${user.name || 'N/A'}\t`;
          textContent += `${user.mobile || 'N/A'}\t`;
          textContent += `${user.designation || 'N/A'}\t`;
          textContent += `${user.zone || 'N/A'}\t`;
          textContent += `${user.day1Attendance ? 'Yes' : 'No'}\t`;
          textContent += `${user.day2Attendance ? 'Yes' : 'No'}\n`;
        });

        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Ahibba_Registration_Details.txt';
        link.click();
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
          title: 'Success!',
          text: 'Text report downloaded successfully!',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          background: '#fff',
          color: '#333'
        });
      } catch (error) {
        console.error("Error generating text report:", error);
        Swal.fire({
          title: 'Error!',
          text: `Error generating text file: ${error.message}`,
          icon: 'error',
          confirmButtonColor: '#3085d6',
          background: '#fff',
          color: '#333'
        });
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-white p-2 rounded-lg">
                <HiOutlineChartBar className="text-2xl text-blue-600" />
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
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center space-x-2"
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
              <h3 className="text-lg font-semibold text-gray-800">Attendance Distribution</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

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

        {/* Report Generation */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-6 rounded-xl shadow-md mb-8 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center space-x-2 mb-4">
            <FiDownload className="text-xl text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">Generate Reports</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={generatePDFReport}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-4 px-4 rounded-xl shadow-md transition-all transform hover:scale-105 flex flex-col items-center"
            >
              <FiFileText className="text-2xl mb-2" />
              <span>PDF Report</span>
            </button>
            <button
              onClick={generateDetailedPDF}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-4 rounded-xl shadow-md transition-all transform hover:scale-105 flex flex-col items-center"
            >
              <FiFilePlus className="text-2xl mb-2" />
              <span>Detailed PDF</span>
            </button>
            <button
              onClick={generateCSVReport}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-4 px-4 rounded-xl shadow-md transition-all transform hover:scale-105 flex flex-col items-center"
            >
              <FiFile className="text-2xl mb-2" />
              <span>CSV Export</span>
            </button>
            <button
              onClick={generateTextReport}
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold py-4 px-4 rounded-xl shadow-md transition-all transform hover:scale-105 flex flex-col items-center"
            >
              <FiPrinter className="text-2xl mb-2" />
              <span>Text Report</span>
            </button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-6 rounded-xl shadow-md mb-8 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center space-x-2 mb-4">
            <FiFilter className="text-xl text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                <FiSearch className="text-sm" />
                <span>Search by Name/Mobile</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Enter name or mobile..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                <FiMapPin className="text-sm" />
                <span>Zone</span>
              </label>
              <select
                value={zoneFilter}
                onChange={handleZoneFilter}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="">All Zones</option>
                {ZONES.map((zone) => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                <FiUserCheck className="text-sm" />
                <span>Attendance Status</span>
              </label>
              <select
                value={attendanceFilter}
                onChange={handleAttendanceFilter}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="all">All Users</option>
                <option value="day1">Day 1 Attended</option>
                <option value="day2">Day 2 Attended</option>
                <option value="both">Both Days Attended</option>
                <option value="none">Not Attended</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Users Table */}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        {user.day1Attendance ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            <FiCheckSquare className="mr-1" />
                            Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            ✗ Absent
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        {user.day2Attendance ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            <FiCheckSquare className="mr-1" />
                            Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            ✗ Absent
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center">
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