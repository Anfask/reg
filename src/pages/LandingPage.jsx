import { useState } from "react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const [showModal, setShowModal] = useState(false);

  const handleRegisterClick = () => {
    setShowModal(true);
  };

  const regions = [
    "Jammu & Kashmir",
    "Rajasthan",
    "Delhi",
    "Bihar",
    "West Bengal",
    "Maharashtra",
    "Andhra Pradesh",
    "Karnataka",
    "Kerala"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-950 to-slate-900 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-900/30 rounded-full blur-3xl"></div>

      {/* Header */}
      <header className="bg-white/5 backdrop-blur-md border-b border-white/10 relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img src="yeslogo.png" alt="YES INDIA Foundation" className="h-12 w-auto" />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 relative z-10">
        <div className="container mx-auto">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="max-w-5xl mx-auto"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Left Content */}
              <div className="lg:col-span-2">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="mb-8"
                >
                  <p className="text-emerald-200 text-lg font-light mb-4">
                    "Empowering <span className="text-white font-semibold">Change</span>, Inspiring <span className="text-white font-semibold">Action</span>!"
                  </p>
                  
                  <img src="ahibba.png" alt="Ahibba Summit" className="max-w-lg mb-6" />

                  <div className="flex items-center space-x-4 mb-8">
                    <div className="flex-1 h-1 bg-gradient-to-r from-yellow-300 to-transparent rounded-full"></div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-lg">25 - 26 October 2025</p>
                        <p className="text-emerald-200 text-sm">Youth Leadership & Empowerment Conference</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-lg">@Poonch, J&K</p>
                        <p className="text-emerald-200 text-sm">Jammu & Kashmir Region</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Program Highlights */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="mb-8"
                >
                  <h2 className="text-2xl font-bold text-white mb-5">Program Highlights</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {["Leadership Workshops", "Industry Expert Sessions", "Networking Opportunities", "Skill Development", "Cultural Programs", "Accommodation Provided"].map((item, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-yellow-300 rounded-full flex-shrink-0"></div>
                        <span className="text-emerald-100 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* CTA Button */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                >
                  <button
                    onClick={handleRegisterClick}
                    className="bg-gradient-to-r from-yellow-300 to-yellow-400 hover:from-yellow-400 hover:to-yellow-500 text-teal-900 font-bold text-lg py-4 px-10 rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center mb-4"
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    REGISTER NOW
                  </button>
                  <p className="text-emerald-200 text-sm">
                    Limited seats available. Secure your spot today!
                  </p>
                </motion.div>
              </div>

              {/* Right Sidebar - Regions */}
              <motion.div
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="lg:col-span-1"
              >
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <h3 className="text-white font-bold text-lg mb-4 flex items-center space-x-2">
                    <span>Participating Regions</span>
                  </h3>
                  <div className="space-y-3">
                    {regions.map((region, index) => (
                      <motion.div
                        key={index}
                        initial={{ x: 10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.7 + index * 0.05, duration: 0.4 }}
                        className="flex items-center space-x-2 group"
                      >
                        <div className="w-2 h-2 bg-yellow-300 rounded-full group-hover:scale-150 transition-transform"></div>
                        <span className="text-emerald-100 text-sm group-hover:text-white transition-colors">{region}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Registration Modal */}
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-teal-800 to-teal-900 rounded-2xl p-8 max-w-md w-full border border-white/20"
          >
            <h2 className="text-3xl font-bold text-white mb-4">Join Ahibba Summit 6.0</h2>
            <p className="text-emerald-200 mb-6">Get ready to be part of an inspiring youth leadership conference!</p>
            
            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Full Name"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-emerald-300/50 focus:outline-none focus:border-yellow-300 transition-colors"
              />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-emerald-300/50 focus:outline-none focus:border-yellow-300 transition-colors"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-emerald-300/50 focus:outline-none focus:border-yellow-300 transition-colors"
              />
              <select className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-300 transition-colors">
                <option value="" className="bg-teal-900">Select Your Region</option>
                {regions.map((region) => (
                  <option key={region} value={region} className="bg-teal-900">{region}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-gradient-to-r from-yellow-300 to-yellow-400 hover:from-yellow-400 hover:to-yellow-500 text-teal-900 font-bold py-3 rounded-lg transition-all"
              >
                Register
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Footer */}
      <footer className="bg-black/40 backdrop-blur-md border-t border-white/10 py-8 relative z-10">
  <div className="container mx-auto px-4">
    <div className="flex flex-col items-center justify-center space-y-2">
      <p className="text-emerald-200 text-sm text-center">
        © 2025 YES INDIA FOUNDATION | Ahibba Summit 6.0
      </p>
      <p className="text-emerald-200 text-sm text-center">
        Powered by Cyberduce Technologies
      </p>
    </div>
  </div>
</footer>

    </div>
  );
}