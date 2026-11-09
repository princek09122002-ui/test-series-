import type { ComponentProps } from "react";
export function QuestionImage(props: ComponentProps<"img"> & { alt: string }) {
  // Remote editorial diagrams load in the browser; a server-side optimizer must not fetch arbitrary URLs.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      {...props}
      alt={props.alt}
    />
  );
}
