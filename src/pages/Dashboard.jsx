import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { collection, onSnapshot } from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";
import { db } from "../config/firebase";
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { jsPDF } from "jspdf";
import Swal from 'sweetalert2';

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
  "Maharashta"
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
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Ahibba Summit 2025</h1>
              <p className="text-sm text-blue-100">Admin Dashboard</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6">
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-700">Loading dashboard data...</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white p-5 rounded-lg shadow-md border-t-4 border-blue-500"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Registered</h3>
            <p className="text-3xl font-bold text-gray-800">{stats.totalRegistered}</p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-5 rounded-lg shadow-md border-t-4 border-blue-400"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-1">Day 1 Attendance</h3>
            <p className="text-3xl font-bold text-gray-800">{stats.day1Attendance}</p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="bg-white p-5 rounded-lg shadow-md border-t-4 border-green-500"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-1">Day 2 Attendance</h3>
            <p className="text-3xl font-bold text-gray-800">{stats.day2Attendance}</p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-5 rounded-lg shadow-md border-t-4 border-purple-500"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-1">Both Days</h3>
            <p className="text-3xl font-bold text-gray-800">{stats.bothDays}</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-lg shadow-md"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Attendance Overview</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-lg shadow-md"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Attendance Distribution</h3>
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

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-6 rounded-lg shadow-md mb-8"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Zone-wise Statistics</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day 1</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day 2</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {zoneStats.map((stat, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stat.zone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.registered}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">{stat.day1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{stat.day2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-6 rounded-lg shadow-md mb-8"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Generate Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={generatePDFReport}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors flex flex-col items-center"
            >
              <span className="text-lg">📊</span>
              <span>PDF Report</span>
            </button>
            <button
              onClick={generateDetailedPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors flex flex-col items-center"
            >
              <span className="text-lg">📋</span>
              <span>Detailed PDF</span>
            </button>
            <button
              onClick={generateCSVReport}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors flex flex-col items-center"
            >
              <span className="text-lg">📄</span>
              <span>CSV Export</span>
            </button>
            <button
              onClick={generateTextReport}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors flex flex-col items-center"
            >
              <span className="text-lg">📝</span>
              <span>Text Report</span>
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-6 rounded-lg shadow-md mb-8"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search by Name/Mobile</label>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Enter name or mobile..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Zone</label>
              <select
                value={zoneFilter}
                onChange={handleZoneFilter}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Zones</option>
                {ZONES.map((zone) => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Attendance Status</label>
              <select
                value={attendanceFilter}
                onChange={handleAttendanceFilter}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-6 rounded-lg shadow-md"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Registered Users ({filteredUsers.length})
            </h3>
            <span className="text-sm text-gray-500">
              Showing {filteredUsers.length} of {registeredUsers.length} users
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day 1</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day 2</th>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.zone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        {user.day1Attendance ? (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            ✓
                          </span>
                        ) : (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            ✗
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        {user.day2Attendance ? (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            ✓
                          </span>
                        ) : (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            ✗
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-sm text-gray-500 text-center">
                      No users found matching your filters
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