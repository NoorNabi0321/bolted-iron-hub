import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createAuthorizedGroup,
  getAuthorizedGroupByChatId,
  getAllAuthorizedGroups,
  updateAuthorizedGroup,
  deleteAuthorizedGroup,
  updateGroupLastActivity,
  logWhatsAppMessage,
  getMessagesLogForGroup,
  getMessagesLogByCommandType,
  getMessagesLogByStatus,
  getAllMessagesLog,
  deleteMessageLog,
} from "./db";

describe("WhatsApp Bot Database Functions", () => {
  let groupId: number;
  let messageId: number;
  const testGroupChatId = "120363123456789@g.us";
  const testGroupName = "Test Project Group";

  describe("Authorized Groups", () => {
    it("should create an authorized group", async () => {
      groupId = await createAuthorizedGroup({
        groupChatId: testGroupChatId,
        groupName: testGroupName,
        isEnabled: true,
      });
      expect(groupId).toBeGreaterThan(0);
    });

    it("should retrieve group by chat ID", async () => {
      const group = await getAuthorizedGroupByChatId(testGroupChatId);
      expect(group).toBeDefined();
      expect(group?.groupChatId).toBe(testGroupChatId);
      expect(group?.groupName).toBe(testGroupName);
      expect(group?.isEnabled).toBe(true);
    });

    it("should get all authorized groups", async () => {
      const groups = await getAllAuthorizedGroups();
      expect(Array.isArray(groups)).toBe(true);
      expect(groups.length).toBeGreaterThan(0);
      const testGroup = groups.find((g) => g.groupChatId === testGroupChatId);
      expect(testGroup).toBeDefined();
    });

    it("should update authorized group", async () => {
      await updateAuthorizedGroup(groupId, {
        groupName: "Updated Project Group",
        isEnabled: false,
      });
      const updated = await getAuthorizedGroupByChatId(testGroupChatId);
      expect(updated?.groupName).toBe("Updated Project Group");
      expect(updated?.isEnabled).toBe(false);
    });

    it("should update group last activity", async () => {
      const before = await getAuthorizedGroupByChatId(testGroupChatId);
      const beforeTime = before?.lastActivityAt;

      await new Promise((resolve) => setTimeout(resolve, 100));
      await updateGroupLastActivity(testGroupChatId);

      const after = await getAuthorizedGroupByChatId(testGroupChatId);
      expect(after?.lastActivityAt).toBeDefined();
      if (beforeTime) {
        expect(after?.lastActivityAt?.getTime()).toBeGreaterThanOrEqual(
          beforeTime.getTime()
        );
      }
    });
  });

  describe("Messages Log", () => {
    it("should log a WhatsApp message", async () => {
      messageId = await logWhatsAppMessage({
        groupChatId: testGroupChatId,
        senderPhoneNumber: "+1234567890",
        messageText: "/project 274marcy",
        commandType: "project",
        responseText: "Project details: 274 Marcy Avenue...",
        status: "success",
      });
      expect(messageId).toBeGreaterThan(0);
    });

    it("should retrieve messages log for group", async () => {
      const messages = await getMessagesLogForGroup(testGroupChatId, 10);
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
      const testMessage = messages.find((m) => m.id === messageId);
      expect(testMessage).toBeDefined();
      expect(testMessage?.commandType).toBe("project");
    });

    it("should retrieve messages log by command type", async () => {
      const messages = await getMessagesLogByCommandType("project", 10);
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
      messages.forEach((m) => {
        expect(m.commandType).toBe("project");
      });
    });

    it("should retrieve messages log by status", async () => {
      const messages = await getMessagesLogByStatus("success", 10);
      expect(Array.isArray(messages)).toBe(true);
      messages.forEach((m) => {
        expect(m.status).toBe("success");
      });
    });

    it("should log error messages", async () => {
      const errorMessageId = await logWhatsAppMessage({
        groupChatId: testGroupChatId,
        senderPhoneNumber: "+1234567890",
        messageText: "/invalid",
        commandType: "invalid",
        status: "error",
        errorMessage: "Unknown command: /invalid",
      });
      expect(errorMessageId).toBeGreaterThan(0);

      const messages = await getMessagesLogByStatus("error", 10);
      const errorMsg = messages.find((m) => m.id === errorMessageId);
      expect(errorMsg).toBeDefined();
      expect(errorMsg?.errorMessage).toBe("Unknown command: /invalid");
    });

    it("should log unauthorized messages", async () => {
      const unauthorizedId = await logWhatsAppMessage({
        groupChatId: "999999999@g.us",
        senderPhoneNumber: "+9876543210",
        messageText: "/project 274marcy",
        commandType: "project",
        status: "unauthorized",
        errorMessage: "Group not authorized for bot access",
      });
      expect(unauthorizedId).toBeGreaterThan(0);

      const messages = await getMessagesLogByStatus("unauthorized", 10);
      const unauthorizedMsg = messages.find((m) => m.id === unauthorizedId);
      expect(unauthorizedMsg).toBeDefined();
      expect(unauthorizedMsg?.status).toBe("unauthorized");
    });

    it("should get all messages log", async () => {
      const messages = await getAllMessagesLog(100);
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
    });

    it("should delete message log", async () => {
      const messagesToDelete = await getMessagesLogForGroup(testGroupChatId, 1);
      if (messagesToDelete.length > 0) {
        const idToDelete = messagesToDelete[0].id;
        await deleteMessageLog(idToDelete);

        const remaining = await getMessagesLogForGroup(testGroupChatId, 100);
        const deleted = remaining.find((m) => m.id === idToDelete);
        expect(deleted).toBeUndefined();
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle non-existent group gracefully", async () => {
      const group = await getAuthorizedGroupByChatId("non-existent@g.us");
      expect(group).toBeUndefined();
    });

    it("should handle empty messages log gracefully", async () => {
      const messages = await getMessagesLogForGroup("empty@g.us", 10);
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBe(0);
    });

    it("should handle command type filtering with no results", async () => {
      const messages = await getMessagesLogByCommandType("nonexistent", 10);
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBe(0);
    });

    it("should support different limit values", async () => {
      const messages1 = await getMessagesLogForGroup(testGroupChatId, 1);
      const messages10 = await getMessagesLogForGroup(testGroupChatId, 10);

      expect(messages1.length).toBeLessThanOrEqual(1);
      expect(messages10.length).toBeLessThanOrEqual(10);
    });
  });

  describe("Cleanup", () => {
    it("should delete authorized group", async () => {
      await deleteAuthorizedGroup(groupId);
      const deleted = await getAuthorizedGroupByChatId(testGroupChatId);
      expect(deleted).toBeUndefined();
    });
  });
});
