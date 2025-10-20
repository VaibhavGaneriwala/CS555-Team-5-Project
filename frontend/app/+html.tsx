import { ScrollViewStyleReset } from 'expo-router/html';

// This file configures the root HTML for every web page during static rendering.
// It works only in Node.js (no DOM/browser APIs).
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
      </head>
      <body className="bg-white text-black dark:bg-[#0d1117] dark:text-white transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
