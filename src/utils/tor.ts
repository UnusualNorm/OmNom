import net from "net";
import { fetch, FetchResultTypes, RequestOptions } from "@sapphire/fetch";
import { SocksProxyAgent } from "socks-proxy-agent";
const agent = new SocksProxyAgent("socks5://127.0.0.1:9050");

export class Tor {
  opts: {
    host: string;
    port: number;
    password: string;
  };

  connection: net.Socket | undefined;

  constructor({
    host,
    port,
    password,
  }: {
    host?: string;
    port?: number;
    password?: string;
  } = {}) {
    this.opts = {
      host: host || "localhost",
      port: port || 9051,
      password: password || "",
    };
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.connection = net.connect({
        host: this.opts.host,
        port: this.opts.port,
      });

      this.connection.on("error", function (err) {
        reject({
          type: 0,
          message: err,
          data: err,
        });
      });

      this.connection.on("data", function (data) {
        const dataS = data.toString();
        const ret = /([0-9]{1,3})\s(.*)\r\n/.exec(dataS);

        if (ret !== null && ret[1] && ret[2] && parseInt(ret[1]) === 250)
          resolve({
            type: parseInt(ret[1]),
            message: ret[2],
            data: dataS,
          });

        reject({
          type: 0,
          message: "Authentication failed",
          data: data,
        });
      });

      this.connection.write('AUTHENTICATE "' + this.opts.password + '"\r\n'); // Chapter 3.5
    });
  }

  sendCommand(command: string) {
    return new Promise((resolve, reject) => {
      if (this.connection === undefined)
        reject({
          type: 0,
          message: "Need a socket connection (please call connect function)",
          data: "",
        });

      this.connection?.once("error", function (err) {
        reject({
          type: 0,
          message: err,
          data: err,
        });
      });

      this.connection?.once("data", function (data) {
        const dataS = data.toString();
        const ret = /([0-9]{1,3})\s(.*)\r\n/.exec(dataS);
        if (!ret || !ret[1] || !ret[2])
          return reject({
            type: 0,
            message: "Failed parsing data",
            data: data,
          });

        try {
          resolve({
            type: parseInt(ret[1]),
            message: ret[2],
            data: dataS,
          });
        } catch (e) {
          reject({
            type: 0,
            message: "Failed parsing data",
            data: data,
          });
        }
      });

      this.connection?.write(command + "\r\n");
    });
  }

  quit() {
    return this.sendCommand("QUIT");
  }
  setConf(request: string) {
    return this.sendCommand("SETCONF " + request);
  }
  resetConf(request: string) {
    return this.sendCommand("RESETCONF " + request);
  }
  getConf(request: string) {
    return this.sendCommand("GETCONF " + request);
  }
  getEvents(request: string) {
    return this.sendCommand("GETEVENTS " + request);
  }
  saveConf(request: string) {
    return this.sendCommand("SAVECONF " + request);
  }
  signal(signal: string) {
    return this.sendCommand("SIGNAL " + signal);
  }
  signalReload() {
    return this.signal("RELOAD");
  }
  signalHup() {
    return this.signal("HUP");
  }
  signalShutdown() {
    return this.signal("SHUTDOWN");
  }
  signalDump() {
    return this.signal("DUMP");
  }
  signalUsr1() {
    return this.signal("USR1");
  }
  signalDebug() {
    return this.signal("DEBUG");
  }
  signalUsr2() {
    return this.signal("USR2");
  }
  signalHalt() {
    return this.signal("HALT");
  }
  signalTerm() {
    return this.signal("TERM");
  }
  signalInt() {
    return this.signal("INT");
  }
  signalNewnym() {
    return this.signal("NEWNYM");
  }
  signalCleardnscache() {
    return this.signal("CLEARDNSCACHE");
  }

  mapAddress(address: string) {
    return this.sendCommand("MAPADDRESS " + address);
  }
  getInfo(request: string[]) {
    return this.sendCommand("GETINFO " + request.join(" "));
  }
  extendCircuit(id: string, superspec: string, purpose: string) {
    let str = "EXTENDCIRCUIT " + id;
    if (superspec) str += " " + superspec;

    if (purpose) str += " " + purpose;

    return this.sendCommand(str);
  }
  setCircuitPurpose(id: string, purpose: string) {
    return this.sendCommand("SETCIRCUITPURPOSE " + id + " purpose=" + purpose);
  }
  setRouterPurpose(nicknameOrKey: string, purpose: string) {
    return this.sendCommand(
      "SETROUTERPURPOSE " + nicknameOrKey + " " + purpose
    );
  }
  attachStream(streamId: string, circuitId: string, hop: string) {
    let str = "ATTACHSTREAM " + streamId + " " + circuitId;

    if (hop) str += " " + hop;

    return this.sendCommand(str);
  }
}
export const TorController = new Tor();

export async function ReFetch(
  url: string,
  options?: RequestOptions,
  verifier: (res: Response, out: string) => boolean = (res) =>
    res.status >= 200 && res.status < 300
): Promise<string> {
  if (!TorController.connection) await TorController.connect();

  try {
    const req = await fetch(
      url,
      Object.assign({}, options, { agent }),
      FetchResultTypes.Result
    );
    const out = await req.text();

    if (!verifier(req, out)) {
      await TorController.signalNewnym();
      return ReFetch(url, options, verifier);
    }

    return out;
  } catch (e) {
    console.error(e);
    await TorController.signalNewnym();
    return ReFetch(url, options, verifier);
  }
}

export async function ReRun<Output>(
  runner: () => Output | Promise<Output>,
  verifier: (out: Output) => boolean
): Promise<Output> {
  if (!TorController.connection) await TorController.connect();

  try {
    const out = await runner();

    if (!verifier(out)) {
      await TorController.signalNewnym();
      return ReRun(runner, verifier);
    }

    return out;
  } catch (e) {
    console.error(e);
    await TorController.signalNewnym();
    return ReRun(runner, verifier);
  }
}
