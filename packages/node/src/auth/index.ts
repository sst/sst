import { CognitoJwtVerifier } from "aws-jwt-verify";

let verifier: ReturnType<typeof createVerifier> | undefined = undefined;

export function init(userPoolId: string) {
  verifier = createVerifier(userPoolId);
}

function createVerifier(userPoolId: string) {
  return CognitoJwtVerifier.create({
    userPoolId,
  });
}

function verify(token: string) {
  if (!verifier)
    throw new Error(`Auth must be initialized with "Auth.init(userPoolId)"`);
  return verifier.verify(token, { clientId: null, tokenUse: "access" });
}

export const Auth = {
  init,
  verify,
};
