import { useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "./Button";
import PayloadForm from "./PayloadForm";
import KeyValueItem from "./KeyValueItem";
import CollapsiblePanel from "./CollapsiblePanel";
import "./QueueConstructPanel.scss";

const defaultPayload = JSON.stringify({ data: "placeholder" }, null, 2);

export default function QueueConstructPanel({
  type,
  name,
  props,
  triggering,
  onTrigger,
}) {
  const [payload, setPayload] = useState(defaultPayload);

  return (
    <div className="QueueConstructPanel">
      <CollapsiblePanel type={type} name={name}>
        <KeyValueItem name="Queue URL" values={[props.queueUrl]} />
        <PayloadForm
          label="Message"
          button={
            <Button
              size="sm"
              loading={triggering}
              onClick={() =>
                onTrigger({
                  type,
                  queueUrl: props.queueUrl,
                  payload,
                })
              }
            >
              Send Message
            </Button>
          }
        >
          <Form.Control
            rows={3}
            size="sm"
            as="textarea"
            onChange={(e) => setPayload(e.target.value)}
            value={payload}
          ></Form.Control>
        </PayloadForm>
      </CollapsiblePanel>
    </div>
  );
}
