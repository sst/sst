import KeyValueItem from "./KeyValueItem";
import CollapsiblePanel from "./CollapsiblePanel";
import "./WebSocketApiConstructPanel.scss";

export default function WebSocketApiConstructPanel({ type, name, props }) {
  const { httpApiEndpoint, customDomainUrl, routes } = props;

  function getRoutes() {
    return Object.values(routes).map((per, key) =>
      formatRoute(customDomainUrl || httpApiEndpoint, per, key)
    );
  }

  function formatRoute(endpoint, route, key) {
    return { url: `${endpoint}/${route}`, text: route };
  }

  return (
    <div className="WebSocketApiConstructPanel">
      <CollapsiblePanel type={type} name={name}>
        <KeyValueItem name="URL" values={[{ url: httpApiEndpoint }]} />
        {customDomainUrl && (
          <KeyValueItem
            name="Custom Domain URL"
            values={[{ url: customDomainUrl }]}
          />
        )}
        {Object.values(routes).length > 0 && (
          <KeyValueItem name="Routes" values={getRoutes()} />
        )}
      </CollapsiblePanel>
    </div>
  );
}
