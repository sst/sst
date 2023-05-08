import React from "react";
import { CgSpinner } from "react-icons/cg";
import styles from "./Button.module.css";

type Variants = "primary" | "secondary";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: Variants;
}

export default function Button({
  type,
  children,
  className = "",
  loading = false,
  variant = "primary",
  ...props
}: ButtonProps) {
  const baseClassName = styles[variant];

  return (
    <button type={type} className={`${baseClassName} ${className}`}>
      {loading && <CgSpinner className={styles.spinner} />}
      {children}
    </button>
  );
}
