import { eventHandler } from "vinxi/http";
export default eventHandler({
  handler() { },
  websocket: {
    async open(peer) {
      console.log("open", peer.id, peer.url);
    },
    async message(peer, msg) {
      const message = msg.text();
      console.log("msg", peer.id, peer.url, message);

      setTimeout(() => {
        peer.send("Message received from: #" + peer.id);
      }, 3000);
    },
    async close(peer, _details) {
      console.log("close", peer.id, peer.url);
    },
    async error(peer, error) {
      console.log("error", peer.id, peer.url, error);
    },
  },
});
