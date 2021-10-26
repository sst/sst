import React from "react";
import "./LoadingSpinner.scss";

export default function LoadingSpinner(props) {
  return (
    <div className="LoadingSpinner">
      <div className="spinner">
        <div className="bounce1"></div>
        <div className="bounce2"></div>
        <div className="bounce3"></div>
      </div>
    </div>
  );
}
