import { useState, useRef, useEffect } from "react";
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
  const [schedule, setSchedule] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const canvasRef = useRef(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Event Dates
  const eventDates = {
    day1: new Date('2025-10-24T00:00:00+05:30'), // October 24, 2025 IST
    day2: new Date('2025-10-25T00:00:00+05:30')  // October 25, 2025 IST
  };

  // Day 1 Schedule - October 24, 2025
  const day1Schedule = {
    morning: { 
      start: "10:00", 
      end: "12:00", 
      display: "Morning 10:00 AM",
      date: "2025-10-25"
    },
    afternoon: { 
      start: "14:30", 
      end: "16:30", 
      display: "Afternoon 2:30 PM",
      date: "2025-10-26"
    },
    evening: { 
      start: "18:20", 
      end: "20:20", 
      display: "Evening 6:20 PM",
      date: "2025-10-24"
    }
  };

  // Day 2 Schedule - October 25, 2025
  const day2Schedule = {
    morning: { 
      start: "08:30", 
      end: "10:30", 
      display: "Morning 8:30 AM",
      date: "2025-10-25"
    },
    afternoon: { 
      start: "14:30", 
      end: "16:30", 
      display: "Afternoon 2:30 PM",
      date: "2025-10-25"
    },
    evening: { 
      start: "19:00", 
      end: "21:00", 
      display: "Evening 7:00 PM",
      date: "2025-10-25"
    }
  };

  // Check if a specific day is active (current date matches event date)
  const isDayActive = (dayNum) => {
    const now = currentTime;
    const eventDate = dayNum === "1" ? eventDates.day1 : eventDates.day2;
    
    // Check if it's the same day (ignoring time)
    return now.toDateString() === eventDate.toDateString();
  };

  // Check if current time is within a schedule slot on the correct date
  const isScheduleActive = (dayNum, scheduleType) => {
    const schedule = dayNum === "1" ? day1Schedule : day2Schedule;
    const slot = schedule[scheduleType];
    
    if (!slot) return false;

    const now = currentTime;
    const eventDate = dayNum === "1" ? eventDates.day1 : eventDates.day2;
    
    // Check if it's the correct event date
    if (now.toDateString() !== eventDate.toDateString()) {
      return false;
    }

    // Create datetime objects for the schedule slot
    const startTime = new Date(`${slot.date}T${slot.start}:00+05:30`);
    const endTime = new Date(`${slot.date}T${slot.end}:00+05:30`);
    
    return now >= startTime && now <= endTime;
  };

  // Check if schedule is locked (attendance already marked for this schedule)
  const isScheduleLocked = (dayNum, scheduleType) => {
    if (!userData) return true;
    
    const attendanceField = `day${dayNum}Attendance`;
    const scheduleField = `day${dayNum}Schedule`;
    
    // Check if user has already marked attendance for this schedule
    return userData[attendanceField] && userData[scheduleField] === scheduleType;
  };

  // Check if day is completely locked (all schedules marked or day not active)
  const isDayLocked = (dayNum) => {
    if (!userData) return true;
    
    const attendanceField = `day${dayNum}Attendance`;
    
    // If day is already marked, it's locked
    if (userData[attendanceField]) return true;
    
    // If it's not the event day, it's locked
    return !isDayActive(dayNum);
  };

  // Get available schedules for a day
  const getAvailableSchedules = (dayNum) => {
    const schedule = dayNum === "1" ? day1Schedule : day2Schedule;
    const available = [];

    Object.keys(schedule).forEach(scheduleType => {
      if (isScheduleActive(dayNum, scheduleType) && !isScheduleLocked(dayNum, scheduleType)) {
        available.push({
          type: scheduleType,
          display: schedule[scheduleType].display
        });
      }
    });

    return available;
  };

  // Get schedule status message
  const getScheduleStatus = (dayNum, scheduleType) => {
    const schedule = dayNum === "1" ? day1Schedule : day2Schedule;
    const slot = schedule[scheduleType];
    
    if (!slot) return "Invalid schedule";

    const now = currentTime;
    const eventDate = dayNum === "1" ? eventDates.day1 : eventDates.day2;
    const slotDate = new Date(slot.date + 'T00:00:00+05:30');
    
    // Check if it's before the event date
    if (now < slotDate) {
      return `Starts on ${formatDate(slotDate)}`;
    }
    
    // Check if it's the correct event date
    if (now.toDateString() !== eventDate.toDateString()) {
      return "Not today";
    }

    const startTime = new Date(`${slot.date}T${slot.start}:00+05:30`);
    const endTime = new Date(`${slot.date}T${slot.end}:00+05:30`);
    
    if (now < startTime) {
      return `Starts at ${slot.start}`;
    } else if (now > endTime) {
      return "Ended";
    } else {
      return "Active Now";
    }
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
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
    setSchedule("");

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
    if (!day || !schedule) {
      setMessage("Please select both Day and Schedule");
      return;
    }

    // Double-check schedule availability before marking
    if (!isScheduleActive(day, schedule)) {
      setMessage("This schedule is no longer active. Please refresh and try again.");
      return;
    }

    setLoading(true);

    try {
      const attendanceField = `day${day}Attendance`;
      const scheduleField = `day${day}Schedule`;
      const timeField = `day${day}AttendanceTime`;
      
      const userRef = doc(db, "registration", userData.id);

      await updateDoc(userRef, {
        [attendanceField]: true,
        [scheduleField]: schedule,
        [timeField]: new Date()
      });

      // Trigger voice and confetti for Day 1
      if (day === "1") {
        playWelcomeVoice(userData.name);
        createConfetti();
      }

      setMessage(`Day ${day} - ${getScheduleDisplay(day, schedule)} attendance marked successfully!`);
      setUserData(prev => ({
        ...prev,
        [attendanceField]: true,
        [scheduleField]: schedule
      }));
      setDay("");
      setSchedule("");
      
      setTimeout(() => {
        setMobile("");
        setUserData(null);
        setSearchPerformed(false);
        setMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error marking attendance:", error);
      setMessage("Failed to mark attendance. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getScheduleDisplay = (dayNum, scheduleType) => {
    const schedule = dayNum === "1" ? day1Schedule : day2Schedule;
    return schedule[scheduleType]?.display || scheduleType;
  };

  const isDay1Marked = userData?.day1Attendance;
  const isDay2Marked = userData?.day2Attendance;
  
  // Day 2 can only be selected if Day 1 is marked AND it's Day 2 event date
  const canSelectDay2 = isDay1Marked && isDayActive("2");

  // Get available schedules for selected day
  const availableSchedules = day ? getAvailableSchedules(day) : [];

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
            <p className="text-white-400 text-xs mt-1">
              Current Time: {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST | 
              Date: {currentTime.toLocaleDateString('en-IN')}
            </p>
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
                  {userData.day1Attendance && (
                    <p className="text-green-600 font-medium">
                      ✓ Day 1: {getScheduleDisplay("1", userData.day1Schedule)} on {formatDate(eventDates.day1)}
                    </p>
                  )}
                  {userData.day2Attendance && (
                    <p className="text-green-600 font-medium">
                      ✓ Day 2: {getScheduleDisplay("2", userData.day2Schedule)} on {formatDate(eventDates.day2)}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-white-700">
                  Select Day <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setDay("1");
                      setSchedule("");
                    }}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                      day === "1"
                        ? "bg-green-600 text-white shadow-lg scale-105"
                        : isDayLocked("1") 
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    disabled={isDayLocked("1")}
                    title={isDayLocked("1") ? 
                      (isDay1Marked ? "Day 1 attendance already marked" : `Available only on ${formatDate(eventDates.day1)}`) 
                      : `Mark attendance for ${formatDate(eventDates.day1)}`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {isDay1Marked && (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      Day 1 {isDay1Marked ? "✓" : ""}
                    </div>
                    <div className="text-xs mt-1 opacity-75">
                      {formatDate(eventDates.day1)}
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (canSelectDay2) {
                        setDay("2");
                        setSchedule("");
                      }
                    }}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all relative ${
                      day === "2"
                        ? "bg-green-600 text-white shadow-lg scale-105"
                        : !canSelectDay2 || isDayLocked("2")
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    disabled={!canSelectDay2 || isDayLocked("2")}
                    title={!isDay1Marked ? "Complete Day 1 attendance first" : 
                           isDayLocked("2") ? `Available only on ${formatDate(eventDates.day2)}` : 
                           `Mark attendance for ${formatDate(eventDates.day2)}`}
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
                    <div className="text-xs mt-1 opacity-75">
                      {formatDate(eventDates.day2)}
                    </div>
                  </button>
                </div>
                {!isDay1Marked && !isDayActive("1") && (
                  <p className="text-xs text-amber-600 mt-1">
                    📅 Day 1 available only on {formatDate(eventDates.day1)}
                  </p>
                )}
                {isDay1Marked && !isDayActive("2") && (
                  <p className="text-xs text-amber-600 mt-1">
                    📅 Day 2 available only on {formatDate(eventDates.day2)}
                  </p>
                )}
              </div>

              {day && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-white-700">
                    Select Schedule <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {availableSchedules.length > 0 ? (
                      availableSchedules.map((slot) => (
                        <button
                          key={slot.type}
                          onClick={() => setSchedule(slot.type)}
                          className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                            schedule === slot.type
                              ? "bg-blue-600 text-white shadow-lg scale-105"
                              : "bg-green-100 text-green-700 hover:bg-green-200 border border-green-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{slot.display}</span>
                            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">Active Now</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center p-4 bg-gray-100 rounded-lg">
                        <p className="text-gray-600 text-sm">
                          {getAvailableSchedules(day).length === 0 
                            ? "No active schedules available at this time"
                            : "You have already marked attendance for all available schedules"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Check the schedule timings and try again during active slots
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Schedule Display */}
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      {day === "1" ? `Day 1 Schedule - ${formatDate(eventDates.day1)}` : `Day 2 Schedule - ${formatDate(eventDates.day2)}`}
                    </h4>
                    <div className="space-y-2 text-xs text-gray-600">
                      {Object.entries(day === "1" ? day1Schedule : day2Schedule).map(([scheduleType, slot]) => (
                        <div key={scheduleType} className="flex justify-between items-center p-2 bg-white rounded border">
                          <span>{slot.display}</span>
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            isScheduleActive(day, scheduleType) 
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : isScheduleLocked(day, scheduleType)
                              ? "bg-blue-100 text-blue-700 border border-blue-300"
                              : "bg-gray-100 text-gray-500 border border-gray-300"
                          }`}>
                            {isScheduleLocked(day, scheduleType) 
                              ? "✓ Marked" 
                              : getScheduleStatus(day, scheduleType)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleMarkAttendance}
                disabled={loading || !day || !schedule}
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
                  setSchedule("");
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