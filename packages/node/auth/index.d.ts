export declare function init(userPoolId: string): void;
declare function verify(token: string): Promise<import("aws-jwt-verify/jwt-model").CognitoJwtPayload>;
export declare const Auth: {
    init: typeof init;
    verify: typeof verify;
};
export {};
