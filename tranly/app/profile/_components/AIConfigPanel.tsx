"use client";

import { useState, useEffect } from "react";
import { useAIConfig } from "../_lib/useAIConfig";
import { useStrings } from "@/app/_lib/strings";

const MODEL_OPTIONS = [
  { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4o", label: "GPT-4o" },
];

export default function AIConfigPanel() {
  const { 
    apiKey, 
    model, 
    maskedKey, 
    saveConfig, 
    clearConfig, 
    callsUsed, 
    callsMax, 
    simulateUsage, 
    resetUsage 
  } = useAIConfig();
  const [showKey, setShowKey] = useState(false);
  const [inputKey, setInputKey] = useState("");
  const [selectedModel, setSelectedModel] = useState(model);
  const t = useStrings();

  // Sync selectedModel when hook value loads from localStorage
  useEffect(() => {
    setSelectedModel(model);
  }, [model]);

  const handleSave = () => {
    const keyToSave = inputKey.trim() || apiKey;
    if (keyToSave) {
      saveConfig(keyToSave, selectedModel);
      setInputKey("");
    }
  };

  const handleClear = () => {
    clearConfig();
    setInputKey("");
    setShowKey(false);
  };

  const displayValue = showKey ? (apiKey ?? "") : (maskedKey ?? "");
  const percent = Math.round((callsUsed / callsMax) * 100);

  return (
    <div className="w-full">
      <p className="text-sm font-semibold text-text-primary mb-3">{t.profile.aiSection}</p>

      {/* AI Usage Meter */}
      <div className="mb-5 p-3 rounded-xl border-3 border-border-color bg-[#FFF9F0] dark:bg-[#1a1a2e] flex flex-col gap-2 shadow-nb-sm">
        <div className="flex justify-between items-center text-xs font-bold text-text-secondary">
          <span>AI Usage (API Calls)</span>
          <span>{callsUsed} / {callsMax} calls ({percent}%)</span>
        </div>
        
        {/* Sleek Neobrutalist Progress Bar */}
        <div className="w-full h-4 rounded-full border-3 border-border-color bg-white dark:bg-[#2d2d44] overflow-hidden shadow-nb-sm relative">
          <div 
            className="h-full bg-accent-blue border-r-3 border-border-color transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Interactive controls for simulation/reset */}
        <div className="flex justify-end gap-3 text-[10px] font-bold text-text-meta mt-1">
          <button 
            type="button"
            onClick={simulateUsage} 
            className="hover:underline cursor-pointer transition-colors"
          >
            + Simulate Call
          </button>
          <span>•</span>
          <button 
            type="button"
            onClick={resetUsage} 
            className="hover:underline cursor-pointer text-red-500 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* API Key Input */}
      <div className="mb-3">
        <label htmlFor="ai-api-key" className="text-xs font-medium text-text-secondary mb-1 block">
          API Key
        </label>
        <div className="relative">
          <input
            id="ai-api-key"
            type={showKey ? "text" : "password"}
            value={inputKey || displayValue}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="Enter your API key"
            className="w-full rounded-xl border-3 border-border-color bg-card-bg text-text-primary px-3 py-2 pr-10 text-sm shadow-nb-sm outline-none focus:shadow-nb-sm dark:focus:shadow-nb-sm transition-shadow"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            aria-label={showKey ? "Hide API key" : "Show API key"}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary cursor-pointer"
          >
            {showKey ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Model Selector */}
      <div className="mb-4">
        <label htmlFor="ai-model-select" className="text-xs font-medium text-text-secondary mb-1 block">
          Model
        </label>
        <select
          id="ai-model-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full rounded-xl border-3 border-border-color px-3 py-2 text-sm shadow-nb-sm outline-none focus:shadow-nb-sm dark:focus:shadow-nb-sm transition-shadow bg-card-bg text-text-primary appearance-none cursor-pointer"
        >
          {MODEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 rounded-xl border-3 border-border-color bg-accent-green px-4 py-2 text-sm font-bold text-white shadow-nb-sm transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="flex-1 rounded-xl border-3 border-border-color bg-card-bg px-4 py-2 text-sm font-bold text-text-primary shadow-nb-sm transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
