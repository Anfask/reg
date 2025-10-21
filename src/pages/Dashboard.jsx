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
  FiSave
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
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [reportFilter, setReportFilter] = useState("all");

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

  const handleEditClick = (user) => {
    setEditingUser(user.id);
    setEditFormData({ ...user });
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
      [day]: !editFormData[day]
    });
  };

  const handleSaveEdit = async () => {
    try {
      const userRef = doc(db, "registration", editingUser);
      await updateDoc(userRef, {
        name: editFormData.name,
        mobile: editFormData.mobile,
        designation: editFormData.designation,
        zone: editFormData.zone,
        day1Attendance: editFormData.day1Attendance,
        day2Attendance: editFormData.day2Attendance
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

  const getFilteredDataForReport = () => {
    let data = filteredUsers;

    if (reportFilter === "day1") {
      data = data.filter(u => u.day1Attendance);
    } else if (reportFilter === "day2") {
      data = data.filter(u => u.day2Attendance);
    } else if (reportFilter === "both") {
      data = data.filter(u => u.day1Attendance && u.day2Attendance);
    } else if (reportFilter === "none") {
      data = data.filter(u => !u.day1Attendance && !u.day2Attendance);
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
        let filterInfo = "Filter: ";
        if (zoneFilter) filterInfo += `Zone: ${zoneFilter}, `;
        if (reportFilter !== "all") filterInfo += `Attendance: ${reportFilter}`;
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

        reportData.forEach((user) => {
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

  const generateZoneWisePDF = () => {
    showLoadingAlert('Generating Zone-wise PDF Report');
    
    setTimeout(() => {
      try {
        const doc = new jsPDF("p", "mm", "a4");
        let yPosition = 20;

        // Title
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text("Ahibba Summit 2025 - Zone-wise Analysis", 14, yPosition);
        yPosition += 12;

        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, yPosition);
        yPosition += 10;

        // Zone Statistics Table
        doc.setFont(undefined, "bold");
        doc.setFontSize(10);
        
        // Headers
        doc.rect(14, yPosition - 5, 182, 7, "S");
        doc.text("Zone", 20, yPosition);
        doc.text("Registered", 80, yPosition);
        doc.text("Day 1", 120, yPosition);
        doc.text("Day 2", 150, yPosition);
        doc.text("Both Days", 180, yPosition);
        yPosition += 10;

        // Data rows
        doc.setFont(undefined, "normal");
        doc.setFontSize(9);

        zoneStats.forEach((stat) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
            
            // Redraw headers
            doc.setFont(undefined, "bold");
            doc.setFontSize(10);
            doc.rect(14, yPosition - 5, 182, 7, "S");
            doc.text("Zone", 20, yPosition);
            doc.text("Registered", 80, yPosition);
            doc.text("Day 1", 120, yPosition);
            doc.text("Day 2", 150, yPosition);
            doc.text("Both Days", 180, yPosition);
            yPosition += 10;
            doc.setFont(undefined, "normal");
            doc.setFontSize(9);
          }

          const bothDays = stat.registered - (stat.registered - (stat.day1 > stat.day2 ? stat.day1 : stat.day2));
          
          doc.text(stat.zone, 20, yPosition);
          doc.text(stat.registered.toString(), 80, yPosition);
          doc.text(stat.day1.toString(), 120, yPosition);
          doc.text(stat.day2.toString(), 150, yPosition);
          doc.text(registeredUsers.filter(u => u.zone === stat.zone && u.day1Attendance && u.day2Attendance).length.toString(), 180, yPosition);
          
          doc.setDrawColor(200, 200, 200);
          doc.line(14, yPosition + 1, 196, yPosition + 1);
          yPosition += 7;
        });

        doc.save("Ahibba_Zone_wise_Analysis.pdf");
        
        Swal.fire({
          title: 'Success!',
          text: 'Zone-wise PDF report downloaded successfully!',
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
        const reportData = getFilteredDataForReport();
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
        doc.text(`Total Records: ${reportData.length}`, 14, yPosition);
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

        reportData.forEach((user) => {
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
        const reportData = getFilteredDataForReport();
        // Create CSV headers
        const headers = ['Name', 'Mobile Number', 'Designation', 'Zone', 'Day 1 Attendance', 'Day 2 Attendance', 'Registration Date'];
        
        // Create CSV rows
        const csvRows = [
          headers,
          ...reportData.map(user => [
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
        const reportData = getFilteredDataForReport();
        let textContent = `AHIBBA SUMMIT 2025 - REGISTRATION REPORT\n`;
        textContent += `Generated: ${new Date().toLocaleDateString()}\n`;
        textContent += `Total Records: ${reportData.length}\n\n`;
        textContent += `SUMMARY:\n`;
        textContent += `Total Records in Report: ${reportData.length}\n`;
        textContent += `Day 1 Attendance: ${reportData.filter(u => u.day1Attendance).length}\n`;
        textContent += `Day 2 Attendance: ${reportData.filter(u => u.day2Attendance).length}\n`;
        textContent += `Both Days: ${reportData.filter(u => u.day1Attendance && u.day2Attendance).length}\n\n`;
        textContent += `DETAILED REGISTRATION:\n`;
        textContent += `Name\tMobile\tDesignation\tZone\tDay1\tDay2\n`;
        textContent += `----\t------\t-----------\t----\t----\t----\n`;
        
        reportData.forEach(user => {
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

        {/* Report Generation with Filters */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-6 rounded-xl shadow-md mb-8 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center space-x-2 mb-4">
            <FiDownload className="text-xl text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">Generate Reports</h3>
          </div>
          
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Filter</label>
            <select
              value={reportFilter}
              onChange={(e) => setReportFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="all">All Users</option>
              <option value="day1">Day 1 Attended Only</option>
              <option value="day2">Day 2 Attended Only</option>
              <option value="both">Both Days Attended</option>
              <option value="none">Not Attended</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <button
              onClick={generatePDFReport}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-4 px-4 rounded-xl shadow-md transition-all transform hover:scale-105 flex flex-col items-center text-sm"
            >
              <FiFileText className="text-2xl mb-2" />
              <span>PDF Report</span>
            </button>
            <button
              onClick={generateDetailedPDF}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-4 rounded-xl shadow-md transition-all transform hover:scale-105 flex flex-col items-center text-sm"
            >
              <FiFilePlus className="text-2xl mb-2" />
              <span>Detailed PDF</span>
            </button>
            <button
              onClick={generateZoneWisePDF}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold py-4 px-4 rounded-xl shadow-md transition-all transform hover:scale-105 flex flex-col items-center text-sm"
            >
              <FiMapPin className="text-2xl mb-2" />
              <span>Zone-wise PDF</span>
            </button>
            <button
              onClick={generateCSVReport}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-4 px-4 rounded-xl shadow-md transition-all transform hover:scale-105 flex flex-col items-center text-sm"
            >
              <FiFile className="text-2xl mb-2" />
              <span>CSV Export</span>
            </button>
            <button
              onClick={generateTextReport}
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold py-4 px-4 rounded-xl shadow-md transition-all transform hover:scale-105 flex flex-col items-center text-sm"
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

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                  <FiEdit2 />
                  <span>Edit User</span>
                </h2>
                <button
                  onClick={() => setEditingUser(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="text-2xl" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editFormData.name || ""}
                    onChange={(e) => handleEditChange("name", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                  <input
                    type="text"
                    value={editFormData.mobile || ""}
                    onChange={(e) => handleEditChange("mobile", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={editFormData.designation || ""}
                    onChange={(e) => handleEditChange("designation", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
                  <select
                    value={editFormData.zone || ""}
                    onChange={(e) => handleEditChange("zone", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Zone</option>
                    {ZONES.map((zone) => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.day1Attendance || false}
                      onChange={() => handleToggleAttendance("day1Attendance")}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Day 1 Attended</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.day2Attendance || false}
                      onChange={() => handleToggleAttendance("day2Attendance")}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Day 2 Attended</span>
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <FiSave />
                    <span>Save Changes</span>
                  </button>
                  <button
                    onClick={() => setEditingUser(null)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center space-x-2 flex">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition-colors flex items-center space-x-1"
                        >
                          <FiEdit2 className="text-sm" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(user.id, user.name)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg transition-colors flex items-center space-x-1"
                        >
                          <FiTrash2 className="text-sm" />
                          <span>Delete</span>
                        </button>
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