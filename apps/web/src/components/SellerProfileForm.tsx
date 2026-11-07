// Seller profile form. Fields come from the admin configurable field list
// in packages/builder/src/config.ts, so admin can add a field without a
// code change. Values start empty: no shop detail is hard coded.

"use client";

import { useState } from "react";
import { sellerProfileFields } from "@listing-photos-generator/builder/browser";
import { siteCopy } from "../config/site-copy";
import { getDemoProfile, saveDemoProfile } from "../lib/demo-store";
import { Alert, Button, Card, Field, inputStyle } from "./ui";

const copy = siteCopy.profile;

export function SellerProfileForm(props: { userId: string }) {
  const existing = getDemoProfile(props.userId);
  const [values, setValues] = useState<Record<string, string>>(existing?.values ?? {});
  const [saved, setSaved] = useState(false);

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    saveDemoProfile(props.userId, values);
    setSaved(true);
  }

  return (
    <Card title={copy.heading}>
      <p>{copy.help}</p>
      <form onSubmit={submit}>
        {sellerProfileFields.map((field) => (
          <Field key={field.key} label={field.label} help={field.helpText}>
            {field.type === "textarea" ? (
              <textarea style={inputStyle} rows={3} value={values[field.key] ?? ""} onChange={(e) => setValue(field.key, e.target.value)} />
            ) : field.type === "select" ? (
              <select style={inputStyle} value={values[field.key] ?? ""} onChange={(e) => setValue(field.key, e.target.value)}>
                <option value="">Select</option>
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                style={inputStyle}
                type={field.type}
                value={values[field.key] ?? ""}
                onChange={(e) => setValue(field.key, e.target.value)}
                required={field.required}
              />
            )}
          </Field>
        ))}
        {saved ? <Alert tone="success">{copy.saved}</Alert> : null}
        <Button type="submit">{copy.saveButton}</Button>
      </form>
    </Card>
  );
}
