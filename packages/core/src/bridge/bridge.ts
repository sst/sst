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
    this.socket.on("message", (buf, from) => {
      // const _length = buf.readInt8(4);
      // const _index = buf.readInt8(5);

      try {
        console.log(buf.toString("utf8", 6));
        const msg = JSON.parse(buf.toString("utf8", 6)) as Message;
        switch (msg.type) {
          case "request":
            console.log("Sent response");
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
            const peer = this.peers[from.address + ":" + from.port];
            peer.lastSeen = Date.now();
            break;
          }
          default: {
            console.log("unknown message type", msg.type);
          }
        }
      } catch (e) {
        console.log("Invalid message", buf);
      }
    });
    const result = await stun.request("stun.l.google.com:19302", {
      socket: this.socket,
    });
    const xor = result.getXorAddress();
    this.addPeer({
      host: process.env.PEER!,
      port: 6060,
    });
    return `${xor.address}:${xor.port}`;
  }

  public stop() {
    this.socket.close();
    if (this.pinger) clearInterval(this.pinger);
  }

  public addPeer(addr: Address) {
    const key = addr.host + ":" + addr.port;
    this.peers[key] = {
      addr,
      lastSeen: Date.now(),
    };
  }

  private ping() {
    const msg = this.encode({
      type: "ping",
      body: "ping",
    });

    for (const key in this.peers) {
      const peer = this.peers[key];
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
