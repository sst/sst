import { useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "./Button";
import PayloadForm from "./PayloadForm";
import KeyValueItem from "./KeyValueItem";
import CollapsiblePanel from "./CollapsiblePanel";
import "./KinesisStreamConstructPanel.scss";

const defaultPayload = JSON.stringify({ data: "placeholder" }, null, 2);

export default function KinesisStreamConstructPanel({
  type,
  name,
  streamName,
  triggering,
  onTrigger,
}) {
  const [payload, setPayload] = useState(defaultPayload);

  return (
    <div className="KinesisStreamConstructPanel">
      <CollapsiblePanel type={type} name={name}>
        <KeyValueItem name="Stream Name" values={[streamName]} />
        <PayloadForm
          fields={{
            Record: (
              <Form.Control
                rows={3}
                size="sm"
                as="textarea"
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
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
                  streamName,
                  payload,
                })
              }
            >
              Put Record
            </Button>
          }
        />
      </CollapsiblePanel>
    </div>
  );
}
