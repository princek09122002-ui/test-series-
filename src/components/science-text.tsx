import katex from "katex";
// Only KaTeX-generated, trust-disabled HTML is inserted. All prose is React-escaped.
export function ScienceText({ text }: { text: string }) {
  return (
    <span className="whitespace-pre-wrap leading-relaxed">
      {text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g).map((part, i) =>
        part.startsWith("$") ? (
          <span
            key={i}
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(part.replace(/^\$\$?|\$\$?$/g, ""), {
                throwOnError: false,
                trust: false,
                strict: "warn",
                displayMode: part.startsWith("$$"),
                maxExpand: 500,
                maxSize: 20,
              }),
            }}
          />
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}
