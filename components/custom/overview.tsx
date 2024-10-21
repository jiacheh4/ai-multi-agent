import { motion } from "framer-motion";
import Link from "next/link";

import { LogoOpenAI, MessageIcon, VercelIcon } from "./icons";

export const Overview = () => {
  return (
    <motion.div
      key="overview"
      className="max-w-[500px] mt-20 mx-4 md:mx-0"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm dark:text-zinc-400 dark:border-zinc-700">
        <p className="flex flex-row justify-center gap-4 items-center text-zinc-900 dark:text-zinc-50">
          <VercelIcon />
          <span>+</span>
          <MessageIcon />
        </p>
        <p>
          This is a AI Chatbot built with {" "}
          <code className="rounded-md bg-muted px-1 py-0.5">Next.js</code>{" "}
          and {" "}
          <code className="rounded-md bg-muted px-1 py-0.5">Vercel</code> 

        </p>
        <p>
          {" "}
          You can learn more about the AI-4-AI by visiting the{" "}
          <Link
            className="text-blue-500 dark:text-blue-400"
            href="https://ai4ai.vercel.app/"
            target="_blank"
          >
            AI4AI
          </Link>
          .
        </p>
      </div>
    </motion.div>
  );
};
