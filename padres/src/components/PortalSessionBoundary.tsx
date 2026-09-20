"use client";

import { useEffect } from "react";
import axios from "axios";

function clearPortalSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("selectedChild");
  localStorage.removeItem("avatar_url");
}

function isPortalToken(token: string) {
  try {
    const segment = token.split(".")[1] || "";
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded));
    return payload.canal === "portal-padres";
  } catch {
    return false;
  }
}

export default function PortalSessionBoundary() {
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && !isPortalToken(token)) {
      clearPortalSession();
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          clearPortalSession();
          if (window.location.pathname !== "/login") {
            window.location.replace("/login");
          }
        }
        return Promise.reject(error);
      },
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  return null;
}
