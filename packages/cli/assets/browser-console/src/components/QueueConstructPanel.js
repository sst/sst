import { useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "./Button";
import KeyValueItem from "./KeyValueItem";
import CollapsiblePanel from "./CollapsiblePanel";

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
        <KeyValueItem name="Queue URL" value={props.queueUrl} />
        <Form.Control
          rows={4}
          as="textarea"
          onChange={(e) => setPayload(e.target.value)}
          value={payload}
        ></Form.Control>
        <br />
        <Button
          loading={triggering}
          onClick={() =>
            onTrigger({
              type,
              queueUrl: props.queueUrl,
              payload,
            })
          }
        >
          Send message
        </Button>
      </CollapsiblePanel>
    </div>
  );
}
