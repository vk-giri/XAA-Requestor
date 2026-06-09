export interface Token {
  raw: string;
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
}

export interface HttpCall {
  stage: string;
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody: string | null;
  status: number;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
  durationMs: number;
  ok: boolean;
}

export interface XaaResult {
  tokens: {
    idToken: Token;
    idJag: Token;
    accessToken: Token;
  };
  httpCalls: HttpCall[];
  resource: unknown;
}

export interface User {
  sub: string;
  name: string | null;
  email: string | null;
  preferred_username: string | null;
}

export interface MeResponse {
  user: User | null;
  idToken?: Token | null;
}
