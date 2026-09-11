\# Instant DANA SSE Integration with MCP

This guide helps first-time developers install and configure a custom MCP server for DANA's SSE endpoint using popular IDEs and tools.

\## Specification

\| Item \| Details \|
\| \-\-\- \| \-\-\- \|
\| Document \| MCP Server Integration \|
\| Function \| Configure and run a custom MCP server for DANA SSE \|
\| Config File \| mcp-config.json \|
\| Endpoint \| https://dana-mcp.dana.id/sse \|

\## Prerequisites

\| Tool \| Minimum Version \| Details \|
\| \-\-\- \| \-\-\- \| \-\-\- \|
\| Node.js \| v.18+ \| Runtime for npm/npx \|
\| npm \| v.9+ \| Package manager (bundled with Node) \|

\## Setup Custom MCP Server Using IDE

\- Claude Desktop: https://modelcontextprotocol.info/docs/quickstart/user/
\- Windsurf: https://apidog.com/blog/windsurf-mcp-servers/
\- Cursor: https://docs.cursor.com/context/model-context-protocol

\## Configuration

Fill your \`mcp-config.json\` with the following content to connect to DANA's MCP endpoint:

\`\`\`json
{
 "mcpServers": {
 "DANA-MCP-INTEGRATION": {
 "command": "npx",
 "args": \[\
 "mcp-remote",\
 "https://dana-mcp.dana.id/sse"\
 \]
 }
 }
}
\`\`\`

\## Ask the GPT Integration Assistant

Need sample code or want to explore other MCP configurations? Ask Claude or your favorite assistant with prompts like:

\> \*Buatin code integrasi QR dengan bahasa Go (Golang) ke DANA menggunakan MCP server dan SSE endpoint\*

\- Create code snippets to integrate with DANA, complete with handling of signature generation and verification.
\- Make integration achievable in less than one day, so you can spend time on other tasks.

\## DANA LLM API Documentation

Embed LLM-friendly examples and code snippets to help AI assistants and developers quickly bootstrap integrations.

\### Quick Start

\`\`\`bash
\# Install dependencies
npm install crypto axios

\# Set up environment variables
export DANA\_CLIENT\_KEY=your\_client\_key
export DANA\_PRIVATE\_KEY\_PATH=./keys/private\_key.pem
export DANA\_BASE\_URL=https://partner.dana.id
\`\`\`

\### RSA Key Generation

\`\`\`bash
openssl genrsa -out rsa\_private\_key.pem 2048
openssl pkcs8 -topk8 -in rsa\_private\_key.pem \
 -out pkcs8\_rsa\_private\_key.pem -nocrypt
openssl rsa -in rsa\_private\_key.pem -out rsa\_public\_key.pem -pubout
\`\`\`

\### Signature Generation (JavaScript)

\`\`\`javascript
import { generateRSASignature } from 'dana-signature';

const stringToSign = 'POST:/v1/charge:yourAccessToken:payloadHash:timestamp';
const signature = generateRSASignature(
 stringToSign,
 './keys/pkcs8\_rsa\_private\_key.pem'
);
console.log('X-SIGNATURE:', signature);
\`\`\`

\### Error Handling Reference

\- \`4015400 Unauthorized\` - Invalid token, regenerate credentials.
\- \`4035414 Insufficient Funds\` - Prompt user to top-up balance.
\- \`5XX\` - Retry with exponential backoff.

Use these snippets directly or ask your LLM:

\> \*Generate full Node.js DANA API client with authentication and charge endpoint\*