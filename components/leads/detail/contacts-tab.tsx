"use client";

import { Mail, Phone, Link2, User } from "lucide-react";
import { AddContactDialog } from "@/components/leads/detail/add-contact-dialog";
import type { LeadContact, LeadDetail } from "@/lib/leads";

type ContactsTabProps = {
  lead: LeadDetail;
};

/** Kişiler sekmesi — şirkete bağlı contact listesi */
export function ContactsTab({ lead }: ContactsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-zinc-900">İlgili Kişiler</h3>
          <p className="text-xs text-zinc-500">
            {lead.contacts.length} kişi listeleniyor
          </p>
        </div>
        <AddContactDialog
          companyId={lead.companyId}
          companyName={lead.companyName}
        />
      </div>

      {lead.contacts.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-zinc-50 p-8 text-center text-sm text-zinc-500">
          Bu şirkete bağlı kişi henüz yok.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lead.contacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContactCard({ contact }: { contact: LeadContact }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-zinc-100">
          <User className="size-4 text-zinc-600" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-medium text-zinc-900">
            {contact.fullName}
          </p>
          <p className="text-sm text-zinc-500">{contact.jobTitle || "Unvan yok"}</p>

          <div className="mt-3 space-y-1.5 text-sm text-zinc-600">
            <p className="flex items-center gap-2 truncate">
              <Mail className="size-3.5 shrink-0" />
              {contact.email || "—"}
            </p>
            <p className="flex items-center gap-2">
              <Phone className="size-3.5 shrink-0" />
              {contact.phone || "—"}
            </p>
            <p className="flex items-center gap-2 truncate">
              <Link2 className="size-3.5 shrink-0" />
              {contact.linkedin || "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
