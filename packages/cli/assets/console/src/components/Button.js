import BsButton from "react-bootstrap/Button";
import { ArrowRepeat } from "react-bootstrap-icons";
import "./Button.scss";

const variantMap = {
  link: "link",
  danger: "outline-danger",
  primary: "outline-warning",
  secondary: "outline-light",
};

export default function Button({ loading = false, ...props }) {
  props = {
    ...props,
    size: props.size || "lg",
    disabled: props.disabled || loading,
    className: `Button ${props.className || ""}`,
    variant: variantMap[props.variant] || variantMap.secondary,
  };

  return (
    <BsButton {...props}>
      {loading && <ArrowRepeat className="spinner" />}
      {props.children}
    </BsButton>
  );
}
