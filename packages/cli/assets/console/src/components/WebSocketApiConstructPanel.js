import KeyValueItem from "./KeyValueItem";
import CollapsiblePanel from "./CollapsiblePanel";
import "./WebSocketApiConstructPanel.scss";

export default function WebSocketApiConstructPanel({
  type,
  name,
  httpApiEndpoint,
  customDomainUrl,
  routes,
}) {
  function getRoutes() {
    return routes.map((routeData) =>
      formatRoute(customDomainUrl || httpApiEndpoint, routeData)
    );
  }

  function formatRoute(endpoint, { route }) {
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
        {Object.keys(routes).length > 0 && (
          <KeyValueItem name="Routes" values={getRoutes()} />
        )}
      </CollapsiblePanel>
    </div>
  );
}
