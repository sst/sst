import KeyValueItem from "./KeyValueItem";
import CollapsiblePanel from "./CollapsiblePanel";

export default function ApiConstructPanel({ type, name, props }) {
  const { httpApiEndpoint, restApiEndpoint, customDomainUrl, routes } = props;
  const url = httpApiEndpoint || restApiEndpoint;

  function renderApiRoute(endpoint, { method, path }, key) {
    let routeKey, routePath;
    if (path === "$default") {
      routeKey = path;
      routePath = `${endpoint}/${path}`;
    } else {
      routeKey = `${method} ${path}`;
      routePath = `${endpoint}${path}`;
    }

    return (
      <tr key={key}>
        <td>{routeKey}</td>
        <td>
          <a href={routePath} target="_blank" rel="noreferrer">
            {routePath}
          </a>
        </td>
      </tr>
    );
  }

  return (
    <div className="ApiConstructPanel">
      <CollapsiblePanel type={type} name={name}>
        <KeyValueItem name="URL" value={url} />
        {customDomainUrl && (
          <KeyValueItem name="Custom Domain URL" value={customDomainUrl} />
        )}
        <table>
          <tbody>
            {Object.values(routes).map((per, key) =>
              renderApiRoute(customDomainUrl || url, per, key)
            )}
          </tbody>
        </table>
      </CollapsiblePanel>
    </div>
  );
}
