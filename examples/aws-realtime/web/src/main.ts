import "./style.css";
import { iot, mqtt } from "aws-iot-device-sdk-v2";
import { createId } from "@paralleldrive/cuid2";

const endpoint = import.meta.env.VITE_REALTIME_ENDPOINT;
const topic = import.meta.env.VITE_TOPIC;
const authorizer = import.meta.env.VITE_AUTHORIZER;

const messages: string[] = [];

// Setup MQTT connection
let connection: mqtt.MqttClientConnection;
async function createConnection() {
  const config = iot.AwsIotMqttConnectionConfigBuilder.new_with_websockets()
    .with_clean_session(true)
    .with_client_id("client_" + createId())
    .with_endpoint(endpoint)
    .with_custom_authorizer("", authorizer, "", "PLACEHOLDER_TOKEN")
    .with_keep_alive_seconds(1200)
    .build();
  const client = new mqtt.MqttClient();
  connection = client.new_connection(config);
  connection.on("connect", async () => {
    console.log("WS connected");
    await connection.subscribe(topic, mqtt.QoS.AtLeastOnce);
    console.log("WS subscribed to chat");
  });
  connection.on("interrupt", (e) => {
    console.log("interrupted, restarting", e, JSON.stringify(e));
    createConnection();
  });
  connection.on("error", (e) => {
    console.log("connection error", e);
  });
  connection.on("resume", console.log);
  connection.on("message", (_fullTopic, payload) => {
    const message = new TextDecoder("utf8").decode(new Uint8Array(payload));
    addMessage(message);
  });
  connection.on("disconnect", console.log);
  await connection.connect();
}
createConnection();

const addMessage = (message: string) => {
  messages.push(message);
  document.querySelector<HTMLButtonElement>("#messages")!.innerHTML = messages
    .map((m) => `<div>${m}</div>`)
    .join("");
};

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>Realtime Demo</h1>
    <div id="messages"></div>
    <div>
      <input id="message" type="text" placeholder="Press Enter to send..."/>
    </div>
  </div>
`;

const input = document.querySelector<HTMLInputElement>("#message")!;
input.addEventListener("keypress", (event: KeyboardEvent) => {
  const message = input.value.trim();
  if (event.key === "Enter" && message.length > 0) {
    connection.publish(
      topic,
      JSON.stringify({ message }),
      mqtt.QoS.AtLeastOnce
    );
    input.value = "";
  }
});
