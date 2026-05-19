"use client";

import { useEffect } from "react";

export default function ThemeScript() {
  useEffect(() => {
    const tema = localStorage.getItem("tema");
    if (tema === "oscuro") {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return null;
}