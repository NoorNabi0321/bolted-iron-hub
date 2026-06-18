import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Mail, Phone, MapPin, Briefcase } from "lucide-react";
import type { Subcontractor } from "@/lib/types";

interface SubcontractorListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subcontractors: Subcontractor[];
  isLoading?: boolean;
}

export function SubcontractorListDialog({
  open,
  onOpenChange,
  subcontractors,
  isLoading = false,
}: SubcontractorListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground">
            Subcontractors
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {subcontractors.length} subcontractor{subcontractors.length !== 1 ? 's' : ''} in the system
          </p>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-secondary/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : subcontractors.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No subcontractors found</p>
            </div>
          ) : (
            subcontractors.map((sub) => (
              <Card
                key={sub.id}
                className="p-4 border-border bg-card"
              >
                <div className="space-y-3">
                  {/* Company Name and Trade */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm sm:text-base">
                        {sub.companyName}
                      </h3>
                      {sub.trade && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          {sub.trade}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-2">
                    {/* Email */}
                    {sub.email && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Mail className="w-4 h-4 flex-shrink-0 text-red-600" />
                        <a 
                          href={`mailto:${sub.email}`}
                          className="hover:text-red-600 transition-colors truncate"
                        >
                          {sub.email}
                        </a>
                      </div>
                    )}

                    {/* Phone */}
                    {sub.phone && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Phone className="w-4 h-4 flex-shrink-0 text-red-600" />
                        <a 
                          href={`tel:${sub.phone}`}
                          className="hover:text-red-600 transition-colors"
                        >
                          {sub.phone}
                        </a>
                      </div>
                    )}

                    {/* Address */}
                    {sub.address && (
                      <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
                        <span className="line-clamp-2">{sub.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Additional Info */}
                  {(sub.contactPerson || sub.notes) && (
                    <div className="pt-2 border-t border-border space-y-1">
                      {sub.contactPerson && (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Contact:</span> {sub.contactPerson}
                        </p>
                      )}
                      {sub.notes && (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Notes:</span> {sub.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
