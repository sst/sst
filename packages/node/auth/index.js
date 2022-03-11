import { CognitoJwtVerifier } from "aws-jwt-verify";
let verifier = undefined;
export function init(userPoolId) {
    verifier = createVerifier(userPoolId);
}
function createVerifier(userPoolId) {
    return CognitoJwtVerifier.create({
        userPoolId,
    });
}
function verify(token) {
    if (!verifier)
        throw new Error(`Auth must be initialized with "Auth.init(userPoolId)"`);
    return verifier.verify(token, { clientId: null, tokenUse: "access" });
}
export const Auth = {
    init,
    verify,
};
