import KeyValueItem from "./KeyValueItem";
import CollapsiblePanel from "./CollapsiblePanel";
import "./ApiConstructPanel.scss";

export default function ApiConstructPanel({ type, name, props }) {
  const { httpApiEndpoint, restApiEndpoint, customDomainUrl, routes } = props;
  const url = httpApiEndpoint || restApiEndpoint;

  function getRoutes() {
    return Object.values(routes).map((per, key) =>
      formatRoute(customDomainUrl || url, per, key)
    );
  }

  function formatRoute(endpoint, { method, path }, key) {
    let routeKey, routePath;
    if (path === "$default") {
      routeKey = path;
      routePath = `${endpoint}/${path}`;
    } else {
      routeKey = `${method} ${path}`;
      routePath = `${endpoint}${path}`;
    }

    return { url: routePath, text: routeKey };
  }

  return (
    <div className="ApiConstructPanel">
      <CollapsiblePanel type={type} name={name}>
        <KeyValueItem name="URL" values={[{ url }]} />
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
