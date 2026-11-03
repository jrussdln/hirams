// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";

// export default function SystemUnderMaintenance() {
//   const navigate = useNavigate();
//   const [mounted, setMounted] = useState(false);

//   useEffect(() => {
//     setMounted(true);
//   }, []);

//   return (
//     <div
//       style={{
//         minHeight: "100vh",
//         background:
//           "linear-gradient(145deg, #f0f4ff 0%, #fafafa 50%, #f5f0ff 100%)",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         padding: "24px",
//         fontFamily: "'Georgia', serif",
//         overflow: "hidden",
//         position: "relative",
//       }}
//     >
//       {/* Soft background orbs */}
//       <div
//         style={{
//           position: "absolute",
//           width: "500px",
//           height: "500px",
//           borderRadius: "50%",
//           background:
//             "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
//           top: "-150px",
//           left: "-150px",
//           animation: "float 8s ease-in-out infinite",
//         }}
//       />
//       <div
//         style={{
//           position: "absolute",
//           width: "400px",
//           height: "400px",
//           borderRadius: "50%",
//           background:
//             "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)",
//           bottom: "-100px",
//           right: "-100px",
//           animation: "float 6s ease-in-out infinite reverse",
//         }}
//       />
//       <div
//         style={{
//           position: "absolute",
//           width: "250px",
//           height: "250px",
//           borderRadius: "50%",
//           background:
//             "radial-gradient(circle, rgba(236,72,153,0.05) 0%, transparent 70%)",
//           top: "40%",
//           right: "15%",
//           animation: "float 10s ease-in-out infinite 2s",
//         }}
//       />

//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap');

//         @keyframes float {
//           0%, 100% { transform: translateY(0px) scale(1); }
//           50% { transform: translateY(-30px) scale(1.05); }
//         }
//         @keyframes fadeUp {
//           from { opacity: 0; transform: translateY(24px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         @keyframes pulseRing {
//           0% { transform: scale(0.85); opacity: 0.8; }
//           100% { transform: scale(2); opacity: 0; }
//         }
//         @keyframes shimmer {
//           0% { background-position: -200% center; }
//           100% { background-position: 200% center; }
//         }
//         @keyframes spin {
//           from { transform: rotate(0deg); }
//           to { transform: rotate(360deg); }
//         }
//         .retry-btn:hover {
//           background: linear-gradient(135deg, #4338ca, #7c3aed) !important;
//           transform: translateY(-2px) !important;
//           box-shadow: 0 12px 32px rgba(99,102,241,0.35) !important;
//         }
//         .retry-btn:active {
//           transform: translateY(0px) !important;
//         }
//       `}</style>

//       <div
//         style={{
//           position: "relative",
//           background: "rgba(255,255,255,0.85)",
//           backdropFilter: "blur(24px)",
//           border: "1px solid rgba(99,102,241,0.12)",
//           borderRadius: "24px",
//           padding: "52px 44px",
//           maxWidth: "460px",
//           width: "100%",
//           textAlign: "center",
//           boxShadow:
//             "0 8px 40px rgba(99,102,241,0.1), 0 1px 0 rgba(255,255,255,0.9) inset",
//           animation: mounted ? "fadeUp 0.7s ease forwards" : "none",
//           opacity: mounted ? 1 : 0,
//         }}
//       >
//         {/* Icon with pulse rings */}
//         <div
//           style={{
//             position: "relative",
//             display: "inline-block",
//             marginBottom: "32px",
//           }}
//         >
//           <div
//             style={{
//               position: "absolute",
//               inset: 0,
//               borderRadius: "50%",
//               border: "2px solid rgba(99,102,241,0.3)",
//               animation: "pulseRing 2s ease-out infinite",
//             }}
//           />
//           <div
//             style={{
//               position: "absolute",
//               inset: 0,
//               borderRadius: "50%",
//               border: "2px solid rgba(99,102,241,0.15)",
//               animation: "pulseRing 2s ease-out infinite 0.5s",
//             }}
//           />
//           <div
//             style={{
//               width: "80px",
//               height: "80px",
//               borderRadius: "50%",
//               background:
//                 "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))",
//               border: "1px solid rgba(99,102,241,0.2)",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               position: "relative",
//             }}
//           >
//             <svg
//               width="32"
//               height="32"
//               viewBox="0 0 24 24"
//               fill="none"
//               stroke="rgba(99,102,241,0.9)"
//               strokeWidth="1.5"
//               strokeLinecap="round"
//               strokeLinejoin="round"
//               style={{
//                 animation: "spin 3s linear infinite",
//                 transformOrigin: "center",
//               }}
//             >
//               <circle cx="12" cy="12" r="3" />
//               <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
//             </svg>
//           </div>
//         </div>

//         {/* Error badge */}
//         <div
//           style={{
//             fontFamily: "'DM Sans', sans-serif",
//             fontSize: "0.7rem",
//             fontWeight: 500,
//             letterSpacing: "3px",
//             textTransform: "uppercase",
//             marginBottom: "12px",
//             background: "linear-gradient(90deg, #6366f1, #a78bfa, #6366f1)",
//             backgroundSize: "200% auto",
//             WebkitBackgroundClip: "text",
//             WebkitTextFillColor: "transparent",
//             animation: "shimmer 3s linear infinite",
//           }}
//         >
//           Under Maintenance
//         </div>

//         {/* Title */}
//         <h1
//           style={{
//             fontFamily: "'Playfair Display', serif",
//             fontSize: "1.9rem",
//             fontWeight: 700,
//             color: "#1e1b4b",
//             margin: "0 0 16px 0",
//             lineHeight: 1.2,
//             letterSpacing: "-0.3px",
//           }}
//         >
//           We'll Be Right Back
//         </h1>

//         {/* Description */}
//         <p
//           style={{
//             fontFamily: "'DM Sans', sans-serif",
//             fontSize: "0.9rem",
//             color: "#64748b",
//             lineHeight: 1.7,
//             margin: "0 0 12px 0",
//             fontWeight: 300,
//           }}
//         >
//           The system is currently undergoing scheduled maintenance. We're
//           working to improve your experience and will be back online shortly.
//         </p>

//         {/* Info chips */}
//         <div
//           style={{
//             display: "flex",
//             gap: "8px",
//             justifyContent: "center",
//             flexWrap: "wrap",
//             margin: "24px 0 32px 0",
//           }}
//         >
//           {["Scheduled Downtime", "System Update", "Please Wait"].map(
//             (tag, i) => (
//               <span
//                 key={i}
//                 style={{
//                   fontFamily: "'DM Sans', sans-serif",
//                   fontSize: "0.7rem",
//                   fontWeight: 500,
//                   color: "#6366f1",
//                   background: "rgba(99,102,241,0.08)",
//                   border: "1px solid rgba(99,102,241,0.18)",
//                   borderRadius: "99px",
//                   padding: "4px 12px",
//                   letterSpacing: "0.3px",
//                   animation: `fadeUp 0.5s ease forwards ${0.2 + i * 0.1}s`,
//                   opacity: 0,
//                 }}
//               >
//                 {tag}
//               </span>
//             ),
//           )}
//         </div>

//         {/* Divider */}
//         <div
//           style={{
//             height: "1px",
//             background:
//               "linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent)",
//             marginBottom: "28px",
//           }}
//         />

//         {/* Button */}
//         <button
//           className="retry-btn"
//           onClick={() => {
//             window.location.reload();
//           }}
//           style={{
//             width: "100%",
//             padding: "14px",
//             background: "linear-gradient(135deg, #6366f1, #7c3aed)",
//             color: "#fff",
//             border: "none",
//             borderRadius: "12px",
//             fontFamily: "'DM Sans', sans-serif",
//             fontSize: "0.9rem",
//             fontWeight: 500,
//             cursor: "pointer",
//             letterSpacing: "0.3px",
//             transition: "all 0.25s ease",
//             boxShadow: "0 4px 20px rgba(99,102,241,0.25)",
//           }}
//         >
//           ↻ Try Again
//         </button>

//         {/* Footer note */}
//         <p
//           style={{
//             fontFamily: "'DM Sans', sans-serif",
//             fontSize: "0.72rem",
//             color: "#94a3b8",
//             marginTop: "20px",
//             marginBottom: 0,
//             fontWeight: 300,
//           }}
//         >
//           Thank you for your patience. Contact your administrator for more
//           details.
//         </p>
//       </div>
//     </div>
//   );
// }
