// Read only share view. A reviewer sees the pack and can comment. They
// cannot edit the original. Comments are stored against the share link,
// never written into the pack.

"use client";

import { useState } from "react";
import type { ListingPack } from "@listing-photos-generator/builder/browser";
import { siteCopy } from "../../config/site-copy";
import { addDemoComment, listDemoComments } from "../../lib/demo-store";
import { Alert, Button, Card, Field, inputStyle } from "../ui";

const copy = siteCopy.share;

export function ShareView(props: { pack: ListingPack; viewCount: number }) {
  const [comments, setComments] = useState(() => listDemoComments(props.pack.id));
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (text.trim() === "") {
      return;
    }
    const comment = addDemoComment(props.pack.id, author, text);
    setComments((prev) => [...prev, comment]);
    setText("");
  }

  return (
    <div>
      <Card title={copy.heading}>
        <Alert tone="info">{copy.readOnlyNote}</Alert>
        <p>Views: {props.viewCount}</p>
        <h2>{props.pack.copy.title === "" ? "(Title not set yet)" : props.pack.copy.title}</h2>
        <p>{props.pack.copy.description}</p>
        <p>
          {props.pack.productFacts.tabCount === null ? "Tab count not confirmed" : props.pack.productFacts.tabCount + " tabs"} |{" "}
          {props.pack.productFacts.formatDetail || props.pack.productFacts.format}
        </p>
        {props.pack.copy.tags.length > 0 ? <p>Tags: {props.pack.copy.tags.join(", ")}</p> : null}
      </Card>
      <Card title="Comments">
        {comments.length === 0 ? <p>No comments yet.</p> : null}
        {comments.map((comment) => (
          <p key={comment.id}>
            <strong>{comment.authorLabel}</strong> ({comment.createdAt}): {comment.text}
          </p>
        ))}
        <form onSubmit={submit}>
          <Field label="Your name">
            <input style={inputStyle} value={author} onChange={(e) => setAuthor(e.target.value)} />
          </Field>
          <Field label={copy.commentLabel}>
            <textarea style={inputStyle} rows={3} value={text} onChange={(e) => setText(e.target.value)} required />
          </Field>
          <Button type="submit">{copy.commentButton}</Button>
        </form>
      </Card>
    </div>
  );
}
