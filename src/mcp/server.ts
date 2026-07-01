import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { getExpenseTools, Tool as CustomTool } from './tools/expenses'
import { getGroupTools } from './tools/groups'
import { getMemberTools } from './tools/members'
import { getReportTools } from './tools/reports'
import { getNotificationTools } from './tools/notifications'
import { getInvitationTools } from './tools/invitations'

interface ToolWithHandler extends CustomTool {
  handle: (args: unknown) => Promise<unknown>
}

const allTools: ToolWithHandler[] = [
  ...getExpenseTools() as ToolWithHandler[],
  ...getGroupTools() as ToolWithHandler[],
  ...getMemberTools() as ToolWithHandler[],
  ...getReportTools() as ToolWithHandler[],
  ...getNotificationTools() as ToolWithHandler[],
  ...getInvitationTools() as ToolWithHandler[],
]

const server = new Server(
  {
    name: 'expense-book-mcp',
    version: '1.0.0',
  },
  {
    capabilities: { tools: {} },
  }
)

server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: allTools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const tool = allTools.find((t) => t.name === name)

  if (!tool) {
    return {
      content: [{ type: 'text', text: `Tool "${name}" not found` }],
      isError: true,
    }
  }

  try {
    const result = await tool.handle(args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    }
  }
})

export async function startServer() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Expense Book MCP Server started')
}
