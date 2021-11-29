import { useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "./Button";
import PayloadForm from "./PayloadForm";
import KeyValueItem from "./KeyValueItem";
import CollapsiblePanel from "./CollapsiblePanel";
import "./TopicConstructPanel.scss";

const defaultPayload = JSON.stringify({ data: "placeholder" }, null, 2);

export default function TopicConstructPanel({
  type,
  name,
  topicArn,
  triggering,
  onTrigger,
}) {
  const [payload, setPayload] = useState(defaultPayload);

  return (
    <div className="TopicConstructPanel">
      <CollapsiblePanel type={type} name={name}>
        <KeyValueItem name="Topic ARN" values={[topicArn]} />
        <PayloadForm
          label="Message"
          button={
            <Button
              size="sm"
              loading={triggering}
              onClick={() =>
                onTrigger({
                  type,
                  topicArn,
                  payload,
                })
              }
            >
              Publish Message
            </Button>
          }
        >
          <Form.Control
            rows={3}
            size="sm"
            as="textarea"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
          ></Form.Control>
        </PayloadForm>
      </CollapsiblePanel>
    </div>
  );
}
