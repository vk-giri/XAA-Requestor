import axios, { AxiosError } from "axios";
import type { MeResponse, XaaResult } from "./types";

const http = axios.create({ withCredentials: true });

export const api = {
  async me(): Promise<MeResponse> {
    const { data } = await http.get<MeResponse>("/auth/me");
    return data;
  },

  async logout(): Promise<void> {
    await http.post("/auth/logout");
  },

  /**
   * Runs the XAA flow on the backend. The backend returns a partial result
   * (with whatever httpCalls succeeded) even on error, so we surface that
   * uniformly instead of throwing.
   */
  async runXaa(): Promise<{ ok: boolean; data: Partial<XaaResult> & { message?: string } }> {
    try {
      const { data } = await http.post<XaaResult>("/api/xaa");
      return { ok: true, data };
    } catch (e) {
      const err = e as AxiosError<Partial<XaaResult> & { message?: string; error?: string }>;
      return {
        ok: false,
        data: err.response?.data ?? { message: err.message },
      };
    }
  },
};
