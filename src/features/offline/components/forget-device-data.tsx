"use client";

import { useEffect } from "react";

import { clearDeviceData } from "../device";

/** After an account is deleted, nothing of it stays cached on this device. */
export function ForgetDeviceData() {
  useEffect(() => {
    void clearDeviceData().catch(() => undefined);
  }, []);
  return null;
}
