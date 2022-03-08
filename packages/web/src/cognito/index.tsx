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

const Context = createContext<Cognito>(undefined as any);

export function Provider(props: PropsWithChildren<{ value: Cognito }>) {
  const [, setAuth] = useState(props.value.state);

  useEffect(() => {
    props.value.onChange((state) => setAuth(state));
    props.value.init()?.catch();
  }, []);

  return (
    <Context.Provider value={props.value}>{props.children}</Context.Provider>
  );
}

type Opts = {
  UserPoolId: string;
  ClientId: string;
};

type Cognito = ReturnType<typeof create>;

export function create(opts: Opts) {
  const pool = new CognitoUserPool({
    UserPoolId: opts.UserPoolId,
    ClientId: opts.ClientId,
  });

  const state = {
    isInitializing: true,
    session: undefined as CognitoUserSession | undefined,
    get user() {
      return pool.getCurrentUser();
    },
  };
  const callbacks: ((s: typeof state) => void)[] = [];

  function init() {
    if (!state.user) {
      state.isInitializing = false;
      return Promise.resolve(undefined);
    }
    return new Promise<CognitoUserSession | undefined>((resolve) => {
      state.user!.getSession(
        (err: Error | null, session: CognitoUserSession) => {
          if (err) {
            state.user!.signOut();
            resolve(undefined);
            state.isInitializing = false;
            trigger();
            return;
          }
          state.session = session;
          resolve(session);
          state.isInitializing = false;
          trigger();
        }
      );
    });
  }

  async function login(email: string, password: string) {
    const user = new CognitoUser({
      Username: email,
      Pool: pool,
    });

    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    return new Promise((resolve, reject) => {
      user.authenticateUser(authDetails, {
        onSuccess: (result) => {
          state.session = result;
          trigger();
          resolve(result);
        },
        onFailure: (err) => {
          reject(err);
        },
      });
    });
  }

  async function register(
    email: string,
    password: string,
    attributes: CognitoUserAttribute[] = []
  ) {
    return new Promise<ISignUpResult>((resolve, reject) => {
      pool.signUp(
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
          trigger();
          resolve(resp!);
        }
      );
    });
  }

  async function confirm(username: string, code: string) {
    const user = new CognitoUser({
      Username: username,
      Pool: pool,
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

  async function resend(username: string) {
    const user = new CognitoUser({
      Username: username,
      Pool: pool,
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

  function onChange(cb: (opts: typeof state) => void) {
    callbacks.push(cb);
  }

  function trigger() {
    for (const cb of callbacks) {
      cb(state);
    }
  }

  return {
    state,
    init,
    login,
    onChange,
    register,
    confirm,
    resend,
  };
}

export function use() {
  const auth = useContext(Context);
  return auth;
}
