"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type UploadCheckFormProps = {
  title: string;
  help: string;
  buttonLabel: string;
  note: string;
  labels: {
    name: string;
    namePlaceholder: string;
    format: string;
    price: string;
    pricePlaceholder: string;
    currency: string;
    features: string;
    file: string;
  };
  checklistTitle: string;
  checklistNote: string;
};

type CheckedFact = {
  key: string;
  value: string;
  state: string;
};

export default function UploadCheckForm(props: UploadCheckFormProps) {
  const [name, setName] = useState("");
  const [format, setFormat] = useState("Sheets");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [features, setFeatures] = useState("");
  const [fileName, setFileName] = useState("");
  const [facts, setFacts] = useState<CheckedFact[] | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const featureList = features
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    setFacts([
      {
        key: "Product name",
        value: name.trim() || "Not entered yet",
        state: name.trim() ? "Entered, not yet verified" : "Missing",
      },
      {
        key: "Format",
        value: format,
        state: "Entered, not yet verified",
      },
      {
        key: "Price",
        value: price.trim()
          ? `${price.trim()} ${currency}`
          : "Not entered yet",
        state: price.trim() ? "Entered, not yet verified" : "Missing",
      },
      {
        key: "Features",
        value:
          featureList.length > 0
            ? `${featureList.length} feature(s) entered`
            : "Not entered yet",
        state: featureList.length > 0 ? "Entered, not yet verified" : "Missing",
      },
      {
        key: "Source file",
        value: fileName || "No file selected yet",
        state: fileName ? "Selected, not yet verified" : "Missing",
      },
    ]);
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="product-name" className="block text-sm font-medium">
            {props.labels.name}
          </label>
          <input
            id="product-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={props.labels.namePlaceholder}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="product-format" className="block text-sm font-medium">
              {props.labels.format}
            </label>
            <select
              id="product-format"
              value={format}
              onChange={(event) => setFormat(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            >
              <option value="Sheets">Sheets</option>
              <option value="PDF">PDF</option>
              <option value="ZIP">ZIP</option>
            </select>
          </div>
          <div>
            <label htmlFor="product-currency" className="block text-sm font-medium">
              {props.labels.currency}
            </label>
            <select
              id="product-currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="product-price" className="block text-sm font-medium">
            {props.labels.price}
          </label>
          <input
            id="product-price"
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder={props.labels.pricePlaceholder}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="product-features" className="block text-sm font-medium">
            {props.labels.features}
          </label>
          <textarea
            id="product-features"
            value={features}
            onChange={(event) => setFeatures(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="product-file" className="block text-sm font-medium">
            {props.labels.file}
          </label>
          <input
            id="product-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(event) =>
              setFileName(event.target.files?.[0]?.name ?? "")
            }
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-brand-gold px-5 py-2 font-medium text-brand-navy hover:opacity-90"
        >
          {props.buttonLabel}
        </button>
        <p className="text-sm text-slate-500">{props.note}</p>
      </form>
      {facts !== null && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold">{props.checklistTitle}</h3>
          <p className="mt-1 text-sm text-slate-600">{props.checklistNote}</p>
          <ul className="mt-4 space-y-2">
            {facts.map((fact) => (
              <li
                key={fact.key}
                className="flex items-start justify-between gap-4 rounded border border-slate-200 px-3 py-2"
              >
                <span>
                  <span className="font-medium">{fact.key}: </span>
                  {fact.value}
                </span>
                <span className="shrink-0 text-sm text-slate-500">
                  {fact.state}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
