import KeyValueItem from "./KeyValueItem";
import CollapsiblePanel from "./CollapsiblePanel";

export default function WebSocketApiConstructPanel({ type, name, props }) {
  const { httpApiEndpoint, customDomainUrl, routes } = props;

  console.log({ type, name, props });
  function renderApiRoute(route, key) {
    return (
      <tr key={key}>
        <td>{route}</td>
      </tr>
    );
  }

  return (
    <div className="WebSocketApiConstructPanel">
      <CollapsiblePanel type={type} name={name}>
        <KeyValueItem name="URL" value={httpApiEndpoint} />
        {customDomainUrl && (
          <KeyValueItem name="Custom Domain URL" value={customDomainUrl} />
        )}
        <table>
          <tbody>
            {Object.values(routes).map((per, key) => renderApiRoute(per, key))}
          </tbody>
        </table>
      </CollapsiblePanel>
    </div>
  );
}
