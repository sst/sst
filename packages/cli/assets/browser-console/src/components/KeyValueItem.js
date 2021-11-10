import { useRef, useState } from "react";
import { Clipboard } from "react-bootstrap-icons";
import Button from "./Button";
import "./KeyValueItem.scss";

export default function KeyValueItem({ name, values, ...props }) {
  const textareaRefs = useRef({});
  const [showStatus, setShowStatus] = useState(false);

  function formatUrl(url) {
    return url.replace(/^https?:\/\//, "");
  }

  function handleCopy(value, index) {
    textareaRefs.current[index].select();
    document.execCommand("copy");
    textareaRefs.current[index].focus();
    setShowStatus(index);
  }

  function handleBlur() {
    setShowStatus(false);
  }

  return (
    <div className="KeyValueItem">
      <p className="name">{name}</p>
      {values.map((value, index) => (
        <div key={index} className="value">
          <div>
            {value.url && (
              <a target="_blank" rel="noreferrer" href={value.url}>
                {value.text || formatUrl(value.url)}
              </a>
            )}
            {!value.url && (
              <input
                readOnly
                value={value}
                onBlur={handleBlur}
                ref={(el) => (textareaRefs.current[index] = el)}
              />
            )}
          </div>
          <div>
            {!value.url && (
              <>
                {showStatus === index && (
                  <span className="status">Copied!</span>
                )}
                <Button
                  size="md"
                  variant="link"
                  onClick={() => handleCopy(value, index)}
                  className={showStatus === index ? "copied" : ""}
                  disabled={!document.queryCommandSupported("copy")}
                >
                  <Clipboard size={14} />
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
