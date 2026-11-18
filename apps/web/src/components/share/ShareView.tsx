// Read only share view. A reviewer sees the pack and can comment. They
// cannot edit the original. Comments are stored against the share link,
// never written into the pack.

"use client";

import { useState } from "react";
import type { ReviewComment } from "@listing-photos-generator/builder/browser";
import { siteCopy } from "../../config/site-copy";
import { addReviewCommentAction, type SharedPackSummary } from "../../app/seller/actions";
import { Alert, Button, Card, Field, inputStyle } from "../ui";

const copy = siteCopy.share;

export function ShareView(props: { token: string; pack: SharedPackSummary; viewCount: number; canComment: boolean; initialComments: ReviewComment[] }) {
  const [comments, setComments] = useState<ReviewComment[]>(props.initialComments);
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (text.trim() === "") {
      return;
    }
    setError(null);
    const result = await addReviewCommentAction(props.token, author, text);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setComments((prev) => [...prev, result.value]);
    setText("");
  }

  return (
    <div>
      <Card title={copy.heading}>
        <Alert tone="info">{copy.readOnlyNote}</Alert>
        <p>Views: {props.viewCount}</p>
        <h2>{props.pack.title === "" ? "(Title not set yet)" : props.pack.title}</h2>
        <p>{props.pack.description}</p>
        <p>
          {props.pack.tabCount === null ? "Tab count not confirmed" : props.pack.tabCount + " tabs"} | {props.pack.format}
        </p>
        {props.pack.tags.length > 0 ? <p>Tags: {props.pack.tags.join(", ")}</p> : null}
      </Card>
      {props.canComment ? (
        <Card title="Comments">
          {comments.length === 0 ? <p>No comments yet.</p> : null}
          {comments.map((comment) => (
            <p key={comment.id}>
              <strong>{comment.authorLabel}</strong> ({comment.createdAt}): {comment.text}
            </p>
          ))}
          <form onSubmit={(event) => void submit(event)}>
            <Field label="Your name">
              <input style={inputStyle} value={author} onChange={(e) => setAuthor(e.target.value)} />
            </Field>
            <Field label={copy.commentLabel}>
              <textarea style={inputStyle} rows={3} value={text} onChange={(e) => setText(e.target.value)} required />
            </Field>
            {error ? <Alert tone="danger">{error}</Alert> : null}
            <Button type="submit">{copy.commentButton}</Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
