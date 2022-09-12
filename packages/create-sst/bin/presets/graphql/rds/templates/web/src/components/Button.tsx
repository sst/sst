import React from "react";
import { CgSpinner } from "react-icons/cg";
import * as styles from "./Button.css";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: keyof typeof styles.button;
}

export default function Button({
  type,
  children,
  className = "",
  loading = false,
  variant = "primary",
  ...props
}: ButtonProps) {
  const baseClassName = styles.button[variant];

  return (
    <button type={type} className={`${baseClassName} ${className}`}>
      {loading && <CgSpinner className={styles.spinner} />}
      {children}
    </button>
  );
}
