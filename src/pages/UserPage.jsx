import { useState } from "react";
import { motion } from "framer-motion";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../config/firebase";

export default function AttendancePage() {
  const [mobile, setMobile] = useState("");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [day, setDay] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!mobile.trim() || mobile.trim().length !== 10 || !/^\d+$/.test(mobile.trim())) {
      setMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    setMessage("");
    setUserData(null);
    setDay("");

    try {
      const q = query(collection(db, "registration"), where("mobile", "==", mobile.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setMessage("User not found. Please check the mobile number.");
        setSearchPerformed(true);
      } else {
        const user = snapshot.docs[0].data();
        user.id = snapshot.docs[0].id;
        setUserData(user);
        setSearchPerformed(true);
        setMessage("");
      }
    } catch (error) {
      console.error("Error searching user:", error);
      setMessage("Error searching. Please try again.");
      setSearchPerformed(true);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!day) {
      setMessage("Please select Day 1 or Day 2");
      return;
    }

    setLoading(true);

    try {
      const attendanceField = day === "1" ? "day1Attendance" : "day2Attendance";
      const userRef = doc(db, "registration", userData.id);

      await updateDoc(userRef, {
        [attendanceField]: true,
        [`${attendanceField}Time`]: new Date()
      });

      setMessage(`Day ${day} attendance marked successfully!`);
      setUserData(prev => ({
        ...prev,
        [attendanceField]: true
      }));
      setDay("");
      
      setTimeout(() => {
        setMobile("");
        setUserData(null);
        setSearchPerformed(false);
        setMessage("");
      }, 2000);
    } catch (error) {
      console.error("Error marking attendance:", error);
      setMessage("Failed to mark attendance. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isDay1Marked = userData?.day1Attendance;
  const isDay2Marked = userData?.day2Attendance;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex flex-col items-center justify-center px-4 py-8">
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
          Ahibba Summit 2025 - Attendance Tracking
        </h2>
      </motion.div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-800">Mark Attendance</h3>
          <p className="text-gray-600 mt-2 text-sm">Enter your mobile number to check in</p>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
            (message.includes("successfully") || message.includes("marked")) 
              ? "bg-green-100 text-green-700 border border-green-300"
              : "bg-red-100 text-red-700 border border-red-300"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-md transition-all transform hover:scale-105 disabled:transform-none flex items-center justify-center mt-6"
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
                  Search User
                </>
              )}
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-gray-800">{userData.name}</p>
                  <p className="text-sm text-gray-600">{userData.mobile}</p>
                </div>
              </div>
              <div className="text-sm space-y-1">
                <p>
  <span className="font-medium text-gray-700">Designation:</span>{' '}
  <span className="text-blue-600">{userData.designation}</span>
</p>
<p>
  <span className="font-medium text-gray-700">Zone:</span>{' '}
  <span className="text-blue-600">{userData.zone}</span>
</p>

              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Day <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setDay("1")}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                    day === "1"
                      ? "bg-green-600 text-white shadow-lg scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  } ${isDay1Marked ? "opacity-60 cursor-not-allowed" : ""}`}
                  disabled={isDay1Marked}
                >
                  <div className="flex items-center justify-center gap-2">
                    {isDay1Marked && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    Day 1 {isDay1Marked ? "✓" : ""}
                  </div>
                </button>
                <button
                  onClick={() => setDay("2")}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                    day === "2"
                      ? "bg-green-600 text-white shadow-lg scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  } ${isDay2Marked ? "opacity-60 cursor-not-allowed" : ""}`}
                  disabled={isDay2Marked}
                >
                  <div className="flex items-center justify-center gap-2">
                    {isDay2Marked && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    Day 2 {isDay2Marked ? "✓" : ""}
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={handleMarkAttendance}
              disabled={loading || !day}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-md transition-all transform hover:scale-105 disabled:transform-none flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Marking...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Mark Attendance
                </>
              )}
            </button>

            <button
              onClick={() => {
                setMobile("");
                setUserData(null);
                setDay("");
                setMessage("");
                setSearchPerformed(false);
              }}
              className="w-full px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-all"
            >
              Search Another User
            </button>
          </motion.div>
        )}
      </motion.div>

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