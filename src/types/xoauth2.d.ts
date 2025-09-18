declare module 'xoauth2' {
  interface XOAuth2Options {
    user: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    accessToken?: string;
    accessUrl?: string;
  }
  
  interface XOAuth2Generator {
    getToken(callback: (error: Error | null, token?: string) => void): void;
    generateToken(callback: (error: Error | null, token?: string) => void): void;
  }
  
  function createXOAuth2Generator(options: XOAuth2Options): XOAuth2Generator;
  
  export = createXOAuth2Generator;
}