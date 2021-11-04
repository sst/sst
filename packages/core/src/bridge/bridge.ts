import udp from "dgram";
import stun from "stun";

type ReqMessage = {
  type: "req";
  body: any;
};

export type Message = ReqMessage;

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
      // I don't know how to use NodeJS buffers, so I'm just going to convert it to a string
      const msg = buf.toString();
      const header = msg.substring(0, 3);
      const body = msg.substring(header.length);
      switch (header) {
        case "req":
          this.socket.send("rsp" + body, from.port, from.address);
          break;
        case "png": {
          const peer = this.peers[from.address + ":" + from.port];
          peer.lastSeen = Date.now();
          break;
        }
        default: {
          console.log("Unknown message", buf);
        }
      }
    });
    const result = await stun.request("stun.l.google.com:19302", {
      socket: this.socket,
    });
    const xor = result.getXorAddress();
    this.addPeer({
      host: "18.219.189.126",
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
    for (const key in this.peers) {
      const peer = this.peers[key];
      this.socket.send("ping", peer.addr.port, peer.addr.host);
    }
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
