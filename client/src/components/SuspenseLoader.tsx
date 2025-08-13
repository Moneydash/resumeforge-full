import React from "react";

const Loader: React.FC = () => (
  <div style={{
    minHeight: "60vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  }}>
    <div className="loader-spinner" />
    <div style={{ marginTop: 20, color: "#555", fontWeight: 500, fontSize: 18 }}>
      Loading, please wait...
    </div>
    <style>
      {`
        .loader-spinner {
          width: 48px;
          height: 48px;
          border: 5px solid #e0e0e0;
          border-top: 5px solid #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);

export default Loader;