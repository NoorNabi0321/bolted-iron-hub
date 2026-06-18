import React, { useState } from "react";
import { ProposalUploadSection } from "./ProposalUploadSection";
import { ProjectChecklist } from "./ProjectChecklist";
import { trpc } from "@/lib/trpc";

interface ProposalAndChecklistSectionProps {
  projectId: number;
}

export function ProposalAndChecklistSection({
  projectId,
}: ProposalAndChecklistSectionProps) {
  // Fetch proposal info
  const { data: proposal } = trpc.projects.getProposal.useQuery({
    projectId,
  });

  // Get tRPC utils for invalidation
  const utils = trpc.useUtils();

  const handleProposalUploaded = () => {
    // Invalidate the proposal query to refetch fresh data
    utils.projects.getProposal.invalidate({ projectId });
  };

  return (
    <div className="space-y-6">
      {/* Proposal Upload Section */}
      <ProposalUploadSection
        projectId={projectId}
        proposalId={proposal?.id}
        proposalFileUrl={proposal?.fileUrl}
        extractedItemsCount={proposal?.extractedItemsCount || 0}
        onProposalUploaded={handleProposalUploaded}
      />

      {/* Checklist Section */}
      <ProjectChecklist projectId={projectId} />
    </div>
  );
}
