import Link from "next/link";
import React, { memo } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import remarkGfm from "remark-gfm";

const markdownComponents: Components = {
  code: ({ node, inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <SyntaxHighlighter
        style={oneDark}
        language={match[1]}
        PreTag="div"
        className="rounded-lg my-2 text-sm"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code
        className={`${className} text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md`}
        {...props}
      >
        {children}
      </code>
    );
  },
  ol: ({ node, children, ...props }: any) => (
    <ol className="list-decimal list-outside ml-6 my-2 space-y-1" {...props}>
      {children}
    </ol>
  ),
  li: ({ node, children, ...props }: any) => (
    <li className="py-1" {...props}>
      {children}
    </li>
  ),
  ul: ({ node, children, ...props }: any) => (
    <ul className="list-decimal list-outside ml-6 my-2 space-y-1" {...props}>
      {children}
    </ul>
  ),
  strong: ({ node, children, ...props }: any) => (
    <span className="font-semibold text-zinc-900 dark:text-zinc-100" {...props}>
      {children}
    </span>
  ),
  a: ({ node, children, ...props }: any) => (
    <Link
      className="text-blue-500 hover:underline"
      target="_blank"
      rel="noreferrer"
      {...props}
    >
      {children}
    </Link>
  ),
  p: ({ node, children, ...props }: any) => (
    <p className="my-2" {...props}>{children}</p>
  ),
  h1: ({ node, children, ...props }: any) => (
    <h1 className="text-xl font-bold mt-4 mb-2 text-zinc-900 dark:text-zinc-100" {...props}>{children}</h1>
  ),
  h2: ({ node, children, ...props }: any) => (
    <h2 className="text-lg font-bold mt-4 mb-2 text-zinc-900 dark:text-zinc-100" {...props}>{children}</h2>
  ),
  h3: ({ node, children, ...props }: any) => (
    <h3 className="text-md font-bold mt-3 mb-1 text-zinc-900 dark:text-zinc-100" {...props}>{children}</h3>
  ),
  blockquote: ({ node, children, ...props }: any) => (
    <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 py-1 my-2 text-zinc-700 dark:text-zinc-300 italic" {...props}>
      {children}
    </blockquote>
  ),
};

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {children}
    </ReactMarkdown>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
