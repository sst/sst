import { useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "./Button";
import PayloadForm from "./PayloadForm";
import KeyValueItem from "./KeyValueItem";
import CollapsiblePanel from "./CollapsiblePanel";
import "./FunctionConstructPanel.scss";

const defaultPayload = JSON.stringify({ data: "placeholder" }, null, 2);

export default function FunctionConstructPanel({
  type,
  name,
  functionArn,
  functionName,
  triggering,
  onTrigger,
}) {
  const [payload, setPayload] = useState(defaultPayload);

  return (
    <div className="FunctionConstructPanel">
      <CollapsiblePanel type={type} name={name}>
        <KeyValueItem name="Function Name" values={[functionName]} />
        <PayloadForm
          fields={{
            Message: (
              <Form.Control
                rows={3}
                size="sm"
                as="textarea"
                onChange={(e) => setPayload(e.target.value)}
                value={payload}
              ></Form.Control>
            ),
          }}
          button={
            <Button
              size="sm"
              loading={triggering}
              onClick={() =>
                onTrigger({
                  type,
                  functionArn,
                  payload,
                })
              }
            >
              Invoke
            </Button>
          }
        />
      </CollapsiblePanel>
    </div>
  );
}
