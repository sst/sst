import { useRef } from "react";

export default function ErrorAlert({ message }) {
  const shown = useRef(false);

  if (!shown.current) {
    window.alert(message);
    shown.current = true;
  }

  return null;
}
