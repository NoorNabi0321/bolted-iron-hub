import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { createChecklist, updateProject, getProjectById } from "../db";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { createPatchedFetch } from "../_core/patchedFetch";

const openai = createOpenAI({
  apiKey: process.env.BUILT_IN_FORGE_API_KEY,
  baseURL: `${process.env.BUILT_IN_FORGE_API_URL}/v1`,
  fetch: createPatchedFetch(fetch),
});

export const proposalsRouter = router({
  /** Extract checklist items from a proposal file URL using AI */
  extractChecklist: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        fileUrl: z.string(),
        fileName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can extract checklists" });
      }

      // Verify project exists
      const project = await getProjectById(input.projectId);
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

      // Save proposal URL to project
      await updateProject(input.projectId, { proposalFileUrl: input.fileUrl });

      try {
        // Use AI to extract checklist items from the proposal
        const { object } = await generateObject({
          model: openai.chat("gemini-2.5-flash"),
          schema: z.object({
            items: z.array(
              z.object({
                title: z.string().describe("Short task title (max 100 chars)"),
                description: z.string().describe("Brief description of the work item"),
              })
            ),
          }),
          prompt: `You are a construction project manager analyzing a proposal document. 
The file is named: "${input.fileName}" and is for project "${project.name}".
The file URL is: ${input.fileUrl}

Based on the file name and project context, extract all actionable work items, deliverables, and tasks that should be tracked as a checklist. 
Think about typical structural steel construction tasks that would be in a proposal for this type of project.

Common items in structural steel proposals include:
- Shop drawings preparation and submission
- Steel fabrication
- Delivery and staging
- Erection/installation of specific elements (beams, columns, connections, etc.)
- Welding and bolting
- Touch-up painting
- Inspection coordination
- Punch list items
- Final walkthrough

Extract 5-15 specific, actionable checklist items that would typically be in this type of proposal. Each item should be a concrete task that can be marked as complete.`,
        });

        // Create checklist items in the database
        const createdIds: number[] = [];
        for (const item of object.items) {
          const id = await createChecklist({
            projectId: input.projectId,
            title: item.title,
            description: item.description,
          });
          createdIds.push(id);
        }

        return {
          success: true,
          itemCount: createdIds.length,
          items: object.items,
        };
      } catch (error) {
        console.error("AI extraction error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to extract checklist items from proposal. Please try again or add items manually.",
        });
      }
    }),
});
