import { useRef, useState } from "react";
import Button from "./Button";
import "./KeyValueItem.scss";

export default function KeyValueItem({
  name,
  value,
  canCopy=true,
  ...props
}) {
  const textareaRef = useRef(null);
  const [showStatus, setShowStatus] = useState(false);

  function handleCopy() {
    textareaRef.current.select();
    document.execCommand("copy");
    textareaRef.current.focus();
    setShowStatus(true);
  }

  function handleBlur() {
    setShowStatus(false);
  }

  return (
    <div className="KeyValueItem">
      <div>
        <p className="name">{name}</p>
        <input
          readOnly
          ref={textareaRef}
          onBlur={handleBlur}
          value={value}
        />
      </div>
      { canCopy &&
        <div>
          {document.queryCommandSupported("copy") && (
            <>
              {showStatus && <span className="copied-status">Copied!</span>}
              <Button onClick={handleCopy}>Copy</Button>
            </>
          )}
        </div> }
    </div>
  );

}
