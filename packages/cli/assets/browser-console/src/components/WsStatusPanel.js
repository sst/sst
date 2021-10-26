import "./WsStatusPanel.scss";

export default function WsStatusPanel({
  connected = false,
}) {
  const cs = connected ? "connected" : "disconnected";

  return (
    <div
      class={`WsStatusPanel ${cs}`}
      title={ connected
        ? "Connected to local dev environment"
        : "Not connected to local dev environment"
      }
    >
      <div class="indicator"></div>
      <span>
        {connected ? "Connected" : "Disconnected"}
      </span>
    </div>
  );
}
