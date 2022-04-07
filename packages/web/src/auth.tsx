import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CognitoUserSession,
  ISignUpResult,
} from "amazon-cognito-identity-js";

const CognitoContext = createContext<{ cognito: Cognito }>(undefined as any);

export function CognitoProvider(props: PropsWithChildren<{ value: Cognito }>) {
  const [auth, setAuth] = useState({ cognito: props.value });

  useEffect(() => {
    props.value.onChange((cognito) =>
      setAuth({
        cognito,
      })
    );
    props.value.init()?.catch();
  }, []);

  return (
    <CognitoContext.Provider value={auth}>
      {props.children}
    </CognitoContext.Provider>
  );
}

type CognitoOpts = {
  UserPoolId: string;
  ClientId: string;
};

export class Cognito {
  public readonly pool: CognitoUserPool;
  private callbacks: ((cognito: Cognito) => void)[] = [];

  private _session?: CognitoUserSession;
  private _isInitializing = true;

  public get isInitializing() {
    return this._isInitializing;
  }

  private set isInitializing(val: boolean) {
    this._isInitializing = val;
    this.trigger();
  }

  get session() {
    return this._session;
  }

  private set session(session: CognitoUserSession | undefined) {
    this._session = session;
    this.trigger();
  }

  get user() {
    return this.pool.getCurrentUser();
  }

  constructor(opts: CognitoOpts) {
    this.pool = new CognitoUserPool({
      UserPoolId: opts.UserPoolId,
      ClientId: opts.ClientId,
    });
  }

  public onChange(cb: (cognito: Cognito) => void) {
    this.callbacks.push(cb);
  }

  private trigger() {
    for (const cb of this.callbacks) {
      cb(this);
    }
  }

  public init() {
    if (!this.user) {
      this.isInitializing = false;
      return Promise.resolve(undefined);
    }
    return new Promise<CognitoUserSession | undefined>((resolve) => {
      this.user!.getSession(
        (err: Error | null, session: CognitoUserSession) => {
          if (err) {
            this.user!.signOut();
            resolve(undefined);
            this.isInitializing = false;
            return;
          }
          this.session = session;
          resolve(session);
          this.isInitializing = false;
        }
      );
    });
  }

  public async login(email: string, password: string) {
    const user = new CognitoUser({
      Username: email,
      Pool: this.pool,
    });

    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    return new Promise((resolve, reject) => {
      user.authenticateUser(authDetails, {
        onSuccess: (result) => {
          this.session = result;
          this.trigger();
          resolve(result);
        },
        onFailure: (err) => {
          reject(err);
        },
      });
    });
  }

  public async register(
    email: string,
    password: string,
    attributes: CognitoUserAttribute[] = []
  ) {
    return new Promise<ISignUpResult>((resolve, reject) => {
      this.pool.signUp(
        email,
        password,
        [
          ...attributes,
          new CognitoUserAttribute({
            Name: "email",
            Value: email,
          }),
        ],
        [],
        (err, resp) => {
          if (err) {
            reject(err);
            return;
          }
          this.trigger();
          resolve(resp!);
        }
      );
    });
  }

  public async confirm(username: string, code: string) {
    const user = new CognitoUser({
      Username: username,
      Pool: this.pool,
    });
    return new Promise((resolve, reject) => {
      user.confirmRegistration(code, true, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  }

  public async resend(username: string) {
    const user = new CognitoUser({
      Username: username,
      Pool: this.pool,
    });
    return new Promise((resolve, reject) => {
      user.resendConfirmationCode((err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  }
}

export function useCognito() {
  const auth = useContext(CognitoContext);
  return auth.cognito;
}
