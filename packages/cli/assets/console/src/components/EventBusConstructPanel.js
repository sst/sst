import { useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "./Button";
import PayloadForm from "./PayloadForm";
import KeyValueItem from "./KeyValueItem";
import CollapsiblePanel from "./CollapsiblePanel";
import "./EventBusConstructPanel.scss";

const defaultPayload = JSON.stringify({ data: "placeholder" }, null, 2);

export default function EventBusConstructPanel({
  type,
  name,
  eventBusName,
  defaultSource,
  defaultDetailType,
  triggering,
  onTrigger,
}) {
  const [source, setSource] = useState(defaultSource);
  const [detailType, setDetailType] = useState(defaultDetailType);
  const [payload, setPayload] = useState(defaultPayload);

  return (
    <div className="EventBusConstructPanel">
      <CollapsiblePanel type={type} name={name}>
        <KeyValueItem name="EventBus Name" values={[eventBusName]} />
        <PayloadForm label="Event source">
          <Form.Control
            size="sm"
            type="text"
            onChange={(e) => setSource(e.target.value)}
            value={source}
          ></Form.Control>
        </PayloadForm>

        <PayloadForm label="Event detail type">
          <Form.Control
            size="sm"
            type="text"
            onChange={(e) => setDetailType(e.target.value)}
            value={detailType}
          ></Form.Control>
        </PayloadForm>

        <PayloadForm
          label="Event Detail"
          button={
            <Button
              size="sm"
              loading={triggering}
              onClick={() =>
                onTrigger({
                  type,
                  eventBusName,
                  source,
                  detailType,
                  payload,
                })
              }
            >
              Invoke
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
