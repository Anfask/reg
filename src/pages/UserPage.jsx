import { useState, useRef } from "react";
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
  const canvasRef = useRef(null);

  // Check if Day 2 is unlocked (October 26, 2025, 12:00 AM IST)
  const isDay2Unlocked = () => {
    const now = new Date();
    const unlockDate = new Date('2025-10-26T00:00:00+05:30'); // IST timezone
    return now >= unlockDate;
  };

  // Confetti animation function
  const createConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const confetti = [];
    const confettiCount = 100;

    for (let i = 0; i < confettiCount; i++) {
      confetti.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 5 + 2,
        speedX: Math.random() * 4 - 2,
        speedY: Math.random() * 5 + 5,
        color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][Math.floor(Math.random() * 5)],
        rotation: Math.random() * Math.PI * 2
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      confetti.forEach((piece, index) => {
        piece.y += piece.speedY;
        piece.x += piece.speedX;
        piece.rotation += 0.1;

        if (piece.y > canvas.height) {
          confetti.splice(index, 1);
        }

        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);
        ctx.restore();
      });

      if (confetti.length > 0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  };

  // Voice function
  const playWelcomeVoice = (name) => {
    const text = `Welcome Back ${name} to the Ahibba Summit 2025! We are delighted to have you here. Enjoy the event and make the most of this incredible experience!`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 0.8;
    utterance.pitch = 0.8;
    utterance.volume = 1;

    // Set voice to Indian male English if available
    const voices = window.speechSynthesis.getVoices();
    const indianVoice = voices.find(v => v.lang.includes('en-IN')) || voices.find(v => v.lang.includes('en'));
    if (indianVoice) {
      utterance.voice = indianVoice;
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

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

      // Trigger voice and confetti for Day 1
      if (day === "1") {
        playWelcomeVoice(userData.name);
        createConfetti();
      }

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
  const day2Unlocked = isDay2Unlocked();

  // Day 2 can only be selected if Day 1 is marked AND the unlock date has passed
  const canSelectDay2 = isDay1Marked && day2Unlocked;

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative"
      style={{
        backgroundImage: 'url("/bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Confetti Canvas */}
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 pointer-events-none z-50"
      />

      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black opacity-50"></div>
      
      <div className="relative z-10 w-full flex flex-col items-center">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-transparent p-8 rounded-2xl shadow-2xl w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-yellow-500">Mark Attendance</h3>
            <p className="text-white-600 mt-2 text-sm">Enter your mobile number to check in</p>
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
                <label className="block text-sm font-medium text-white-700 mb-2">
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
                className="w-full px-6 py-3 bg-yellow-500 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-md transition-all transform hover:scale-105 disabled:transform-none flex items-center justify-center mt-6"
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
                <label className="block text-sm font-medium text-white-700">
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
                    onClick={() => canSelectDay2 && setDay("2")}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all relative ${
                      day === "2"
                        ? "bg-green-600 text-white shadow-lg scale-105"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } ${!canSelectDay2 || isDay2Marked ? "opacity-60 cursor-not-allowed" : ""}`}
                    disabled={!canSelectDay2 || isDay2Marked}
                    title={!isDay1Marked ? "Complete Day 1 attendance first" : !day2Unlocked ? "Unlocks on Oct 26, 2025" : ""}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {!canSelectDay2 && !isDay2Marked && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {isDay2Marked && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      Day 2 {isDay2Marked ? "✓" : ""}
                    </div>
                  </button>
                </div>
                {!isDay1Marked && (
                  <p className="text-xs text-amber-600 mt-1">
                    📌 Complete Day 1 attendance to unlock Day 2
                  </p>
                )}
                {isDay1Marked && !day2Unlocked && (
                  <p className="text-xs text-amber-600 mt-1">
                    🔒 Day 2 unlocks on October 26, 2025 at 12:00 AM IST
                  </p>
                )}
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
    </div>
  );
}