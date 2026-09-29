import { createServer } from "node:http";

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "Sample upstream" }));
    return;
  }

  if (request.method === "GET" && request.url === "/products") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify([
        { id: 1, name: "Notebook" },
        { id: 2, name: "Pen" },
      ]),
    );
    return;
  }

  if (request.method === "POST" && request.url === "/login") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "Login endpoint reached" }));
    return;
  }

  const url = new URL(request.url ?? "/", "http://localhost");

  if (url.pathname === "/echo") {
    const chunks: Buffer[] = [];

    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        method: request.method,
        path: url.pathname,
        query: url.search,
        headers: request.headers,
        bodyBase64: Buffer.concat(chunks).toString("base64"),
      }),
    );
    return;
  }

  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

server.listen(3000, () => {
  console.log("Sample upstream listening on port 3000");
});