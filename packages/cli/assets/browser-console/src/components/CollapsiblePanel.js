import { useState } from "react";
import Collapse from "react-bootstrap/Collapse";
import { ChevronUp, ChevronDown } from "react-bootstrap-icons";
import Button from "./Button";
import "./CollapsiblePanel.scss";

export default function CollapsiblePanel({
  type,
  name,
  expanded = false,
  ...props
}) {
  const [open, setOpen] = useState(expanded);
  const openCs = open ? "expanded" : "collapsed";

  return (
    <div className={`CollapsiblePanel ${openCs}`}>
      <div className="header" onClick={() => setOpen(!open)}>
        <div className="copy">
          <span>{type}</span>
          <h1>{name}</h1>
        </div>
        <span className="icon">
          <ChevronDown />
        </span>
      </div>
      <Collapse in={open}>
        <div className="body">
          <div>{props.children}</div>
        </div>
      </Collapse>
    </div>
  );
}
