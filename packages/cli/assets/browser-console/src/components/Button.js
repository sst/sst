import BsButton from "react-bootstrap/Button";

const variantMap = {
  primary: "outline-primary",
  secondary: "outline-light",
  highlight: "outline-warning",
  danger: "outline-danger",
};

export default function Button(props) {
  props = {
    ...props,
    size: props.size || "lg",
    variant: variantMap[props.variant] || variantMap.secondary,
  };

  return <BsButton {...props}>{props.children}</BsButton>;
}
