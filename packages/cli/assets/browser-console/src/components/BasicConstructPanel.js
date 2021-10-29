import KeyValueItem from "./KeyValueItem";
import CollapsiblePanel from "./CollapsiblePanel";

export default function BasicConstructPanel({ type, name, keyValues }) {
  return (
    <div className="BasicConstructPanel">
      <CollapsiblePanel type={type} name={name}>
        {Object.entries(keyValues)
          .filter(([key, value]) => value !== undefined)
          .map(([key, value]) => (
            <KeyValueItem key={key} name={key} value={value} />
          ))}
      </CollapsiblePanel>
    </div>
  );
}
