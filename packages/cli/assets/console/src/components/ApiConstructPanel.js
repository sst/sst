import KeyValueItem from "./KeyValueItem";
import CollapsiblePanel from "./CollapsiblePanel";
import "./ApiConstructPanel.scss";

export default function ApiConstructPanel({
  type,
  name,
  httpApiEndpoint,
  restApiEndpoint,
  customDomainUrl,
  routes,
}) {
  const url = httpApiEndpoint || restApiEndpoint;

  function getRoutes() {
    return Object.keys(routes).map((route) =>
      formatRoute(customDomainUrl || url, route)
    );
  }

  function formatRoute(endpoint, route) {
    let routePath;
    if (route === "$default") {
      routePath = `${endpoint}/${route}`;
    } else {
      let [, path] = route.split(" ");
      routePath = `${endpoint}${path}`;
    }

    return { url: routePath, text: route };
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
        {Object.keys(routes).length > 0 && (
          <KeyValueItem name="Routes" values={getRoutes()} />
        )}
      </CollapsiblePanel>
    </div>
  );
}
