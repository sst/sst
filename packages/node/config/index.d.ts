export interface ParameterResources {
}
export interface SecretResources {
}
export interface ConfigTypes {
}
export declare type ParameterTypes = {
    [T in keyof ParameterResources]: string;
};
export declare type SecretTypes = {
    [T in keyof SecretResources]: string;
};
export declare const Config: ConfigTypes & ParameterTypes & SecretTypes;
