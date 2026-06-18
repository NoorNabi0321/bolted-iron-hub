import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { projectsRouter } from "./routers/projects";
import { subcontractorsRouter } from "./routers/subcontractors";
import { financialsRouter } from "./routers/financials";
import { notesRouter } from "./routers/notes";
import { filesRouter } from "./routers/files";
import { adminUsersRouter } from "./routers/adminUsers";
import { checklistsRouter } from "./routers/checklists";
import { changeOrdersRouter } from "./routers/changeOrders";
import { messagesRouter } from "./routers/messages";
import { proposalsRouter } from "./routers/proposals";
import { emailAuthRouter } from "./routers/emailAuth";
import { bulkImportRouter } from "./routers/bulkImport";
import { whatsappRouter } from "./routers/whatsapp";
import { whatsappAdminRouter } from "./routers/whatsappAdmin";
import { whatsappBotRouter } from "./routers/whatsappBot";
import { logsRouter } from "./routers/logs";
import { serviceTokensRouter } from "./routers/serviceTokens";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  projects: projectsRouter,
  subcontractors: subcontractorsRouter,
  financials: financialsRouter,
  notes: notesRouter,
  files: filesRouter,
  adminUsers: adminUsersRouter,
  checklists: checklistsRouter,
  changeOrders: changeOrdersRouter,
  messages: messagesRouter,
  proposals: proposalsRouter,
  emailAuth: emailAuthRouter,
  bulkImport: bulkImportRouter,
  whatsapp: whatsappRouter,
  whatsappAdmins: whatsappAdminRouter,
  whatsappBot: whatsappBotRouter,
  logs: logsRouter,
  serviceTokens: serviceTokensRouter,
});

export type AppRouter = typeof appRouter;
