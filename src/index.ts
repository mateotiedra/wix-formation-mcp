import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { createServer } from "./mcp-server.js";
import { runWithCredentials } from "./wix-context.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

const app = createMcpExpressApp();
const mcpServer = createServer();

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// MCP Streamable HTTP endpoint
app.post("/mcp", async (req, res) => {
  const token = (req.headers["x-wix-api-token"] as string) ?? "";
  const siteId = (req.headers["x-wix-site-id"] as string) ?? "";

  const transport = new NodeStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — credentials per-request via headers
  });

  await mcpServer.connect(transport);

  await runWithCredentials({ token, siteId }, async () => {
    await transport.handleRequest(req, res, req.body);
  });
});

app.listen(PORT, () => {
  console.error(`Wix Bookings MCP server listening on port ${PORT}`);
});
