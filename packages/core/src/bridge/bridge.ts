import udp from "dgram";
import stun from "stun";

type ReqMessage = {
  type: "ping";
  body: any;
};

type ResponseMessage = {
  type: "response";
  body: any;
};

type RequestMessage = {
  type: "request";
  body: any;
};

export type Message = ReqMessage | ResponseMessage | RequestMessage;

export class Server {
  private peers: Record<string, PeerEntry> = {};
  private readonly socket: udp.Socket;
  private pinger?: NodeJS.Timeout;

  constructor() {
    this.socket = udp.createSocket("udp4");
  }

  public async start() {
    this.pinger = setInterval(() => this.ping(), 5000);
    this.socket.bind(10280);
    const result = await stun.request("stun.l.google.com:19302", {
      socket: this.socket,
    });
    const xor = result.getXorAddress();
    this.socket.on("message", (buf, from) => this.onMessage(buf, from));
    this.addPeer({
      host: process.env.PEER!,
      port: 10280,
    });
    return `${xor.address}:${xor.port}`;
  }

  private windows: Record<string, string[]> = {};
  private onMessage(buf: Buffer, from: udp.RemoteInfo) {
    const id = buf.toString("utf8", 0, 4);
    const length = buf.readInt8(4);
    const index = buf.readInt8(5);
    const payload = buf.toString("utf8", 6);
    let parts = this.windows[id];
    if (!parts) {
      parts = Array(length).fill(null);
      this.windows[id] = parts;
    }
    parts[index] = payload;

    // Check if all parts have been received
    if (!parts.every((x) => x)) return;
    delete this.windows[id];

    const msg = JSON.parse(parts.join("")) as Message;
    switch (msg.type) {
      case "request":
        this.socket.send(
          this.encode({
            type: "response",
            body: "Hello",
          }),
          from.port,
          from.address
        );
        break;
      case "ping": {
        this.addPeer({
          host: from.address,
          port: from.port,
        });
        break;
      }
      default: {
        console.log("unknown message type", msg.type);
      }
    }
  }

  public stop() {
    this.socket.close();
    if (this.pinger) clearInterval(this.pinger);
  }

  public addPeer(addr: Address) {
    const key = addr.host + ":" + addr.port;
    const peer: PeerEntry = {
      addr,
      lastSeen: Date.now(),
    };
    this.peers[key] = peer;
    return peer;
  }

  private ping() {
    const msg = this.encode({
      type: "ping",
      body: "ping",
    });

    for (const key in this.peers) {
      const peer = this.peers[key];
      if (Date.now() - peer.lastSeen > 1000 * 60 * 5) {
        console.log("Removing peer", peer.addr);
        delete this.peers[key];
        continue;
      }
      this.socket.send(msg, peer.addr.port, peer.addr.host);
    }
  }

  private encode(msg: Message) {
    const length = Buffer.alloc(1);
    length.writeInt8(1);
    const index = Buffer.alloc(1);
    index.writeInt8(0);
    const buf = [
      Buffer.from((Math.random() * 1000).toString().substring(0, 4)),
      length,
      index,
      Buffer.from(JSON.stringify(msg)),
    ];

    return Buffer.concat(buf);
  }
}

type PeerEntry = {
  addr: Address;
  lastSeen: number;
};

type Address = {
  host: string;
  port: number;
};
