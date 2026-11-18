// Seller profile form. Fields come from the admin configurable field list
// in packages/builder/src/config.ts, so admin can add a field without a
// code change. Values start empty: no shop detail is hard coded.

"use client";

import { useState } from "react";
import { sellerProfileFields } from "@listing-photos-generator/builder/browser";
import { siteCopy } from "../config/site-copy";
import { saveProfileAction } from "../app/seller/actions";
import { Alert, Button, Card, Field, inputStyle } from "./ui";

const copy = siteCopy.profile;

export function SellerProfileForm(props: { initialValues: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>(props.initialValues);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const result = await saveProfileAction(values);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setValues(result.value.values);
    setSaved(true);
  }

  return (
    <Card title={copy.heading}>
      <p>{copy.help}</p>
      <form onSubmit={(event) => void submit(event)}>
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
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Button type="submit">{copy.saveButton}</Button>
      </form>
    </Card>
  );
}
