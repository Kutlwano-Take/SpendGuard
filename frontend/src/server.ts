import { renderErrorPage } from "./lib/error-page";

const serverEntry = {
  async fetch() {
    return new Response(renderErrorPage(), {
      status: 503,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
};

export default serverEntry;
