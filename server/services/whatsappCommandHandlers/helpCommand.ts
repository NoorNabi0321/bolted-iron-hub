/**
 * /help Command Handler
 * Lists all available commands with descriptions
 */

export async function handleHelpCommand(): Promise<string> {
  const helpMessage = `
*🤖 Bolted Iron Hub Bot - Available Commands*

Here are all the commands you can use:

*1. /help*
   Lists all available commands (this message)

*2. /status <project_name>*
   Get the current status of a project
   Example: /status 610 dekalb

*3. /project <project_name>*
   Get full project details including dates, subcontractors, and status
   Example: /project 610 dekalb

*4. /list*
   List all active projects (10 per page)
   Shows: Name, Status, Start Date, End Date

*5. /weekly*
   Get the weekly schedule for the current week
   Shows projects organized by day

*6. /pending*
   List pending approvals and items needing attention
   Shows: Pending checklist items, change orders, approvals

*7. /report*
   Generate a detailed project report as PDF
   Includes: All projects, status, timeline, financials

---
*Need help?* Reply with any command above!
  `.trim();

  return helpMessage;
}
