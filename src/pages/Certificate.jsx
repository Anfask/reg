import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function CertificatePage() {
  const [mobile, setMobile] = useState("");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const certificateRef = useRef(null);

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!mobile.trim() || mobile.trim().length !== 10 || !/^\d+$/.test(mobile.trim())) {
      setMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    setMessage("");
    setUserData(null);

    try {
      const q = query(collection(db, "registration"), where("mobile", "==", mobile.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setMessage("User not found or not registered for the event.");
        setSearchPerformed(true);
      } else {
        const user = snapshot.docs[0].data();
        
        if (!user.day1Attendance && !user.day2Attendance) {
          setMessage("User has not marked attendance for any day. Certificate cannot be issued.");
          setSearchPerformed(true);
        } else {
          user.id = snapshot.docs[0].id;
          setUserData(user);
          setSearchPerformed(true);
          setMessage("");
        }
      }
    } catch (error) {
      console.error("Error searching user:", error);
      setMessage("Error searching. Please try again.");
      setSearchPerformed(true);
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = async () => {
    if (!certificateRef.current) return;

    setDownloading(true);

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Certificate_${userData.name.replace(/\s+/g, "_")}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setMessage("Error downloading certificate. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const attendedDays = [];
  if (userData?.day1Attendance) attendedDays.push("Day 1");
  if (userData?.day2Attendance) attendedDays.push("Day 2");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-purple-800 flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8 text-center"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg mb-2">
          YES INDIA Foundation
        </h1>
        <h2 className="text-xl md:text-2xl text-white drop-shadow-lg font-light">
          Ahibba Summit 2025 - Certificate of Participation
        </h2>
      </motion.div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md mb-8"
      >
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-800">Get Your Certificate</h3>
          <p className="text-gray-600 mt-2 text-sm">Enter your mobile number to retrieve your participation certificate</p>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
            message.includes("not found") || message.includes("cannot be issued") || message.includes("Error")
              ? "bg-red-100 text-red-700 border border-red-300"
              : "bg-green-100 text-green-700 border border-green-300"
          }`}>
            {message}
          </div>
        )}

        {!userData ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter 10-digit number"
                maxLength="10"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-md transition-all transform hover:scale-105 disabled:transform-none flex items-center justify-center mt-6"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Searching...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Get Certificate
                </>
              )}
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-4"
          >
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Participant Details:</p>
              <div className="space-y-1 text-sm">
                <p><span className="font-semibold text-gray-800">{userData.name}</span></p>
                <p className="text-gray-600">Mobile: {userData.mobile}</p>
                <p className="text-gray-600">Designation: {userData.designation}</p>
                <p className="text-gray-600">Zone: {userData.zone}</p>
                <p className="text-green-700 font-semibold mt-2">Attended: {attendedDays.join(" & ")}</p>
              </div>
            </div>

            <button
              onClick={downloadCertificate}
              disabled={downloading}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-md transition-all transform hover:scale-105 disabled:transform-none flex items-center justify-center"
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Generating PDF...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Certificate (PDF)
                </>
              )}
            </button>

            <button
              onClick={() => {
                setMobile("");
                setUserData(null);
                setMessage("");
                setSearchPerformed(false);
              }}
              className="w-full px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-all"
            >
              Back to Search
            </button>
          </motion.div>
        )}
      </motion.div>

      {userData && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-5xl"
        >
          <div ref={certificateRef} className="bg-gradient-to-br from-amber-50 to-orange-50 shadow-2xl p-20 relative overflow-hidden" style={{aspectRatio: '16/11'}}>
            {/* Premium Decorative Border */}
            <div className="absolute inset-0 border-8 border-double border-amber-700 m-4 pointer-events-none"></div>
            <div className="absolute inset-0 border-2 border-amber-500 m-6 pointer-events-none"></div>

            {/* Decorative Ornaments */}
            <div className="absolute top-6 left-6 w-12 h-12 border-t-4 border-l-4 border-amber-700"></div>
            <div className="absolute top-6 right-6 w-12 h-12 border-t-4 border-r-4 border-amber-700"></div>
            <div className="absolute bottom-6 left-6 w-12 h-12 border-b-4 border-l-4 border-amber-700"></div>
            <div className="absolute bottom-6 right-6 w-12 h-12 border-b-4 border-r-4 border-amber-700"></div>

            {/* Main Content */}
            <div className="relative z-10 h-full flex flex-col">
              {/* Header Section with Logos */}
              <div className="flex items-start justify-between mb-6">
                {/* YES Logo - Left */}
                <div className="w-20 h-20 flex-shrink-0">
                  <img src="logo.png" alt="YES India Logo" className="w-full h-full object-contain" />
                </div>

                {/* Title - Center */}
                <div className="flex-1 text-center px-6">
                  <h1 className="text-5xl font-bold text-amber-900" style={{fontFamily: 'Georgia, serif', letterSpacing: '1px'}}>
                    Certificate of Participation
                  </h1>
                  <div className="w-40 h-1 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 mx-auto mt-3"></div>
                </div>
              </div>
              {/* Main Certificate Text */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="bg-amber/600 p-8 border-2  text-center">
                  <p className="text-gray-800 leading-relaxed text-lg font-serif mb-4">
                    This certificate is proudly presented to
                  </p>
                  <h2 className="text-4xl font-bold text-purple-900 border-b-4 border-amber-600 pb-3 mb-4 inline-block min-w-96"
                      style={{fontFamily: 'Georgia, serif'}}>
                    {userData.name}
                  </h2>
                  <p className="text-gray-800 leading-relaxed text-base mb-4 font-serif">
                    Serving as a <span className="font-bold text-amber-900">{userData.designation}</span> from <span className="font-bold text-amber-900">{userData.zone}</span>, in recognition of his active participation in the Ahibba Summit 6.0 held on 25th-26th October 2025.
                  </p>
                  <p className="text-gray-700 leading-relaxed text-sm italic font-serif text-justify">
                    Your sincere involvement, enthusiasm, and valuable contribution during the program are truly appreciated. Your participation reflected great dedication towards continuous learning and professional excellence.
                  </p>
                </div>
              </div>

              {/* Signature Section */}
              <div className="flex justify-between items-end mt-8">
                {/* Program Coordinator - Left */}
                <div className="text-center w-32">
                  <div className="h-16 mb-2 flex items-end justify-center">
                    <img src="sign1.png" alt="Signature 1" className="h-14 object-contain" />
                  </div>
                  <div className="border-t-2 border-gray-900 pt-1">
                    <p className="font-bold text-gray-800 text-xs">Program Coordinator</p>
                    <p className="text-xs text-gray-700">Ahibba Summit</p>
                  </div>
                </div>

                {/* Certificate Number - Center */}
                <div className="text-center flex-1 px-4">
                  <p className="text-xs text-gray-600 mb-2">
                    Certificate No: {userData.id.substring(0, 12).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-600 font-semibold">
                    {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-700 mt-2 font-semibold">Issued by YES INDIA Foundation</p>
                </div>

                {/* Managing Director - Right */}
                <div className="text-center w-32">
                  <div className="h-16 mb-2 flex items-end justify-center">
                    <img src="sign2.png" alt="Signature 2" className="h-14 object-contain" />
                  </div>
                  <div className="border-t-2 border-gray-900 pt-1">
                    <p className="font-bold text-gray-800 text-xs">Managing Director</p>
                    <p className="text-xs text-gray-700">YES INDIA Foundation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-8 text-center"
      >
        <p className="text-sm text-white/80">
          © 2025 YES INDIA FOUNDATION | Powered by Cyberduce Technologies
        </p>
      </motion.div>
    </div>
  );
}