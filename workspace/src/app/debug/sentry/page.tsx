"use client";

import React from "react";
import * as Sentry from "@sentry/nextjs";

export default function SentryDebugPage() {
  const handleThrow = () => {
    throw new Error("Sentry test: uncaught client error");
  };

  const handleCapture = () => {
    Sentry.captureException(new Error("Sentry test: manual capture"));
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">🧪 Sentry Debug</h1>
      <p className="text-sm text-gray-600 mb-4">
        Usa estas acciones para verificar que Sentry captura errores del cliente.
      </p>
      <div className="flex gap-3">
        <button
          onClick={handleThrow}
          className="rounded bg-red-600 text-white px-4 py-2"
        >
          Throw Error
        </button>
        <button
          onClick={handleCapture}
          className="rounded bg-orange-600 text-white px-4 py-2"
        >
          Capture Exception
        </button>
      </div>
      <div className="mt-6 text-xs text-gray-500">
        <div>Env: {process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT}</div>
        <div>Release: {process.env.NEXT_PUBLIC_SENTRY_RELEASE}</div>
      </div>
    </div>
  );
}