import Button from "./Button";
import KeyValueItem from "./KeyValueItem";
import CollapsiblePanel from "./CollapsiblePanel";
import "./CronConstructPanel.scss";

export default function CronConstructPanel({
  type,
  name,
  props,
  triggering,
  onTrigger,
}) {
  return (
    <div className="CronConstructPanel">
      <CollapsiblePanel type={type} name={name}>
        <KeyValueItem name="Schedule" values={[props.schedule]} />
        <div className="controls">
          <p>Trigger function</p>
          <Button
            size="sm"
            loading={triggering}
            onClick={() =>
              onTrigger({
                type,
                ruleName: props.ruleName,
                functionName: props.functionName,
              })
            }
          >
            Trigger
          </Button>
        </div>
      </CollapsiblePanel>
    </div>
  );
}
