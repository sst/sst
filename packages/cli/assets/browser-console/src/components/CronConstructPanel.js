import Button from "./Button";
import KeyValueItem from "./KeyValueItem";
import CollapsiblePanel from "./CollapsiblePanel";

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
        <KeyValueItem name="Schedule" value={props.schedule} canCopy={false} />
        <Button
          loading={triggering}
          onClick={() =>
            onTrigger({
              type,
              ruleName: props.ruleName,
              functionName: props.functionName,
            })
          }
        >
          Trigger now
        </Button>
      </CollapsiblePanel>
    </div>
  );
}
