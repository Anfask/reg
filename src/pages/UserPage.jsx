import { useState, useEffect } from "react"
import { collection, query, where, getDocs, addDoc } from "firebase/firestore"
import { db } from "../config/firebase"
import { motion } from "framer-motion"

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

export default function UserPage() {
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    designation: "",
    zone: ""
  })
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [errors, setErrors] = useState({})
  const [availableRooms, setAvailableRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState("")
  const [isFetchingRooms, setIsFetchingRooms] = useState(false)
  const [roomsStatus, setRoomsStatus] = useState("")

  const speakWelcomeMessage = (name, bedspace) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        const message = `Welcome ${name} to the Ahibba Summit 6.0. Your bed space is ${bedspace}.`;
        const utterance = new SpeechSynthesisUtterance(message);

        utterance.rate = 0.7;
        utterance.pitch = 0.9;
        utterance.volume = 1;

        const setVoice = () => {
          const voices = window.speechSynthesis.getVoices();
          const indianVoice = voices.find(v => v.lang.includes('en-IN')) || voices[0];
          if (indianVoice) utterance.voice = indianVoice;
          window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = setVoice;
        } else {
          setVoice();
        }
      }
    } catch (error) {
      console.error("Error with text-to-speech:", error);
    }
  }

  // Fixed room fetching function
  const fetchAvailableRooms = async (zone) => {
    if (!zone) return [];
    
    setIsFetchingRooms(true)
    setRoomsStatus("loading")
    
    try {
      // Get all rooms first
      const roomsSnapshot = await getDocs(collection(db, "rooms"));
      const allRooms = roomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get allocations for this zone
      const allocationQuery = query(
        collection(db, "bedAllocations"),
        where("zone", "==", zone)
      );
      const allocationSnapshot = await getDocs(allocationQuery);
      
      const availableRoomsList = [];
      
      for (const allocDoc of allocationSnapshot.docs) {
        const allocation = allocDoc.data();
        
        // Find the room by ID
        const room = allRooms.find(r => r.id === allocation.roomId);
        
        if (room) {
          // Count attendees for this room and zone
          const attendeeQuery = query(
            collection(db, "ahibba"),
            where("zone", "==", zone),
            where("bedspace", "==", room.name)
          );
          const attendeeSnapshot = await getDocs(attendeeQuery);
          const occupiedBeds = attendeeSnapshot.size;
          const availableBeds = allocation.bedsAllocated - occupiedBeds;
          
          if (availableBeds > 0) {
            availableRoomsList.push({
              id: room.id,
              name: room.name,
              availableBeds: availableBeds,
              totalAllocated: allocation.bedsAllocated,
              occupiedBeds: occupiedBeds
            });
          }
        }
      }
      
      setAvailableRooms(availableRoomsList);
      
      if (availableRoomsList.length > 0) {
        setRoomsStatus("available");
        if (!selectedRoom) {
          setSelectedRoom(availableRoomsList[0].id);
        }
      } else {
        setRoomsStatus("full");
      }
      
      return availableRoomsList;
    } catch (error) {
      console.error("Error fetching available rooms:", error);
      setAvailableRooms([]);
      
      if (error.code === 'permission-denied') {
        setRoomsStatus("permission-error");
      } else if (error.code === 'unavailable') {
        setRoomsStatus("network-error");
      } else {
        setRoomsStatus("error");
      }
      
      return [];
    } finally {
      setIsFetchingRooms(false);
    }
  }

  const isValidMobileNumber = (mobile) => {
    if (!mobile || mobile.trim() === "") return false;
    const cleanMobile = mobile.trim();
    if (!/^\d+$/.test(cleanMobile)) return false;
    return cleanMobile.length === 10;
  }

  const checkMobileExists = async (mobile) => {
    try {
      const mobileQuery = query(
        collection(db, "ahibba"),
        where("mobile", "==", mobile.trim())
      );
      const snapshot = await getDocs(mobileQuery);
      return !snapshot.empty;
    } catch (error) {
      console.error("Error checking mobile number:", error);
      return false;
    }
  }

  const validateForm = async () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Please enter your name";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters long";
    }

    if (!formData.mobile.trim()) {
      newErrors.mobile = "Please enter your mobile number";
    } else if (!isValidMobileNumber(formData.mobile)) {
      newErrors.mobile = "Please enter a valid 10-digit mobile number";
    } else {
      const mobileExists = await checkMobileExists(formData.mobile);
      if (mobileExists) {
        newErrors.mobile = "This mobile number is already registered";
      }
    }

    if (!formData.designation.trim()) {
      newErrors.designation = "Please enter your designation";
    }

    if (!formData.zone) {
      newErrors.zone = "Please select your zone";
    } else if (availableRooms.length === 0 && roomsStatus === "full") {
      newErrors.zone = "No available bed spaces in this zone. Please contact administrator.";
    }

    if (!selectedRoom) {
      newErrors.room = "Please select a room";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  }

  const handleZoneChange = async (e) => {
    const zone = e.target.value;
    setFormData(prev => ({
      ...prev,
      zone: zone
    }));
    setSelectedRoom("");
    setAvailableRooms([]);
    setRoomsStatus("");
    
    if (errors.zone) {
      setErrors(prev => ({
        ...prev,
        zone: ""
      }));
    }

    if (zone) {
      await fetchAvailableRooms(zone);
    }
  }

  const handleRoomChange = (e) => {
    const roomId = e.target.value;
    setSelectedRoom(roomId);
    if (errors.room) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const isValid = await validateForm();
    if (!isValid) {
      return;
    }

    setLoading(true);

    try {
      const selectedRoomInfo = availableRooms.find(room => room.id === selectedRoom);
      
      if (!selectedRoomInfo) {
        setErrors({ general: "Selected room not available. Please try again." });
        setLoading(false);
        return;
      }

      // Final availability check
      const updatedRooms = await fetchAvailableRooms(formData.zone);
      const currentRoom = updatedRooms.find(room => room.id === selectedRoom);
      
      if (!currentRoom || currentRoom.availableBeds <= 0) {
        setErrors({ general: "Sorry, this room is no longer available. Please select another room." });
        setLoading(false);
        return;
      }

      const userRef = await addDoc(collection(db, "ahibba"), {
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        designation: formData.designation.trim(),
        zone: formData.zone,
        bedspace: selectedRoomInfo.name,
        roomId: selectedRoom,
        present: true,
        timestamp: new Date(),
        isSubUser: false,
        parentUserId: "",
        checkinTime: new Date()
      });

      setUserData({
        id: userRef.id,
        ...formData,
        bedspace: selectedRoomInfo.name,
        roomId: selectedRoom,
        checkinTime: new Date()
      });

      speakWelcomeMessage(formData.name, selectedRoomInfo.name);
      setHasSubmitted(true);
    } catch (error) {
      console.error("Error submitting registration:", error);
      
      if (error.code === 'permission-denied') {
        setErrors({ general: "Registration failed due to security restrictions. Please contact administrator." });
      } else if (error.code === 'unavailable') {
        setErrors({ general: "Network error. Please check your internet connection and try again." });
      } else {
        setErrors({ general: "Registration failed. Please try again or contact support." });
      }
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = () => {
    setFormData({ name: "", mobile: "", designation: "", zone: "" });
    setUserData(null);
    setHasSubmitted(false);
    setErrors({});
    setAvailableRooms([]);
    setSelectedRoom("");
    setRoomsStatus("");
    setIsFetchingRooms(false);
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  const renderRoomStatusMessage = () => {
    switch (roomsStatus) {
      case "loading":
        return (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 text-center">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent inline-block mr-2"></div>
              Loading available rooms for {formData.zone}...
            </p>
          </div>
        );
      
      case "available":
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Room <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedRoom}
              onChange={handleRoomChange}
              className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-200 transition-all ${
                errors.room ? "border-red-300 bg-red-50" : "border-gray-300"
              }`}
              disabled={loading}
            >
              <option value="">-- Select Room --</option>
              {availableRooms.map(room => (
                <option key={room.id} value={room.id}>
                  {room.name} ({room.availableBeds} bed{room.availableBeds !== 1 ? 's' : ''} available)
                </option>
              ))}
            </select>
            {errors.room && (
              <p className="text-sm text-red-600 mt-1">{errors.room}</p>
            )}
            
            <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-700 font-medium mb-1">Available Rooms in {formData.zone}:</p>
              <div className="space-y-1">
                {availableRooms.map(room => (
                  <div key={room.id} className="flex justify-between text-xs">
                    <span className={selectedRoom === room.id ? "font-bold text-green-800" : "text-green-700"}>
                      {room.name}
                    </span>
                    <span className="text-green-600">
                      {room.availableBeds} / {room.totalAllocated} available
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case "full":
        return (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">
                <strong>All rooms are currently full for {formData.zone}.</strong><br />
                Please contact the administrator for assistance.
              </p>
            </div>
          </div>
        );
      
      case "permission-error":
        return (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              <strong>Access restricted.</strong><br />
              Please contact administrator to resolve permission issues.
            </p>
          </div>
        );
      
      case "network-error":
        return (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              <strong>Network connection issue.</strong><br />
              Please check your internet connection and try again.
            </p>
          </div>
        );
      
      case "error":
      default:
        return (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              <strong>Error loading rooms for {formData.zone}.</strong><br />
              Please try again or contact administrator.
            </p>
          </div>
        );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8 text-center"
      >
        <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg mb-2">
          YES INDIA Foundation
        </h1>
        <h2 className="text-lg md:text-2xl text-white drop-shadow-lg font-light">
          Ahibba Summit 2025 Registration
        </h2>
      </motion.div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md"
      >
        {!hasSubmitted ? (
          <>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Register</h3>
              <p className="text-gray-600 mt-2 text-sm">
                Enter your details to check in
              </p>
            </div>

            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {errors.general}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-200 transition-all ${
                    errors.name ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  disabled={loading}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="Enter 10-digit mobile number"
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-200 transition-all ${
                    errors.mobile ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  disabled={loading}
                />
                {errors.mobile && (
                  <p className="text-sm text-red-600 mt-1">{errors.mobile}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleInputChange}
                  placeholder="e.g., Manager, Coordinator, Student"
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-200 transition-all ${
                    errors.designation ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  disabled={loading}
                />
                {errors.designation && (
                  <p className="text-sm text-red-600 mt-1">{errors.designation}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zone <span className="text-red-500">*</span>
                </label>
                <select
                  name="zone"
                  value={formData.zone}
                  onChange={handleZoneChange}
                  className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-200 transition-all ${
                    errors.zone ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  disabled={loading}
                >
                  <option value="">-- Select Zone --</option>
                  {ZONES.map(zone => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
                {errors.zone && (
                  <p className="text-sm text-red-600 mt-1">{errors.zone}</p>
                )}
              </div>

              {formData.zone && (
                <div>
                  {renderRoomStatusMessage()}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || availableRooms.length === 0 || !selectedRoom || roomsStatus === "full"}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-md transition-all transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed flex items-center justify-center mt-6"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Register & Check-in
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Successfully Registered!</h3>
              <p className="text-gray-600 mb-4">Your check-in has been recorded</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-3 text-left">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium text-gray-600">Name:</span>
                <span className="text-gray-800">{userData?.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium text-gray-600">Mobile:</span>
                <span className="text-gray-800">{userData?.mobile}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium text-gray-600">Designation:</span>
                <span className="text-gray-800">{userData?.designation}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium text-gray-600">Zone:</span>
                <span className="text-gray-800">{userData?.zone}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium text-gray-600">Check-in Time:</span>
                <span className="text-gray-800">{formatTime(userData?.checkinTime)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="font-medium text-gray-600">Date:</span>
                <span className="text-gray-800">{formatDate(userData?.checkinTime)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                <span className="font-bold text-blue-700">Bed Space:</span>
                <span className="text-blue-900 font-bold text-lg">{userData?.bedspace}</span>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-700 font-medium">
                Welcome to Ahibba Summit 2025! Your bed space has been assigned.
              </p>
            </div>

            <button
              onClick={handleRefresh}
              className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg shadow-md transition-all transform hover:scale-105"
            >
              Register Another User
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