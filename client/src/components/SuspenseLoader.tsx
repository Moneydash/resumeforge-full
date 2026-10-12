import React from "react";
import "@/styles/landing.css";
import "@/styles/loader.css";

interface LoaderProps {
  label?: string;
}

// Fallback shown while a lazy route's code loads (and while the editor loads a resume).
// Calm and brand-forward: the mark, a thin moving bar and a label.
const Loader: React.FC<LoaderProps> = ({ label = "Loading" }) => (
  <div className="app-loader" role="status" aria-live="polite">
    <img className="app-loader__mark" src="/icon.png" alt="" width={44} height={44} />
    <div className="app-loader__track" aria-hidden="true">
      <i />
    </div>
    <p className="l-eyebrow app-loader__label">{label}</p>
  </div>
);

export default Loader;
