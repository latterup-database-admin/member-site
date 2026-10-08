import { useEffect } from "react";

import { Mail, MapPin, Phone, X } from "lucide-react";

import { MemberAvatar } from "./FamilyCard";
import { formatPhone } from "../../data/directory";

export default function FamilyDetailDrawer({ household, open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !household) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close family details"
        onClick={onClose}
        className="absolute inset-0 bg-brand-navy/30 backdrop-blur-[1px]"
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <header className="border-b border-brand-sand/40 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-taupe">
                Member Directory
              </p>

              <h2 className="brand-title mt-1 text-3xl text-brand-navy">
                {household.familyName}
              </h2>

              <LocationLine location={household.location} />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="focus-ring rounded-full p-2 text-brand-taupe transition hover:bg-brand-sand/15 hover:text-brand-navy"
            >
              <X size={21} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-7">
            {household.address && (
              <section>
                <SectionHeading>Address</SectionHeading>

                <div className="flex items-start gap-3 rounded-xl bg-brand-sand/10 p-4 text-sm text-brand-navy">
                  <MapPin
                    size={18}
                    className="mt-0.5 shrink-0 text-brand-taupe"
                  />

                  <div>
                    {household.address.streetAddress && (
                      <div>{household.address.streetAddress}</div>
                    )}

                    {household.address.addressLine2 && (
                      <div>{household.address.addressLine2}</div>
                    )}

                    <div>
                      {[household.address.city, household.address.state]
                        .filter(Boolean)
                        .join(", ")}
                      {household.address.postalCode
                        ? ` ${household.address.postalCode}`
                        : ""}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {household.adults.length > 0 && (
              <section>
                <SectionHeading>Adults</SectionHeading>

                <div className="space-y-3">
                  {household.adults.map((member) => (
                    <MemberDetail key={member.id} member={member} />
                  ))}
                </div>
              </section>
            )}

            {household.youth.length > 0 && (
              <section>
                <SectionHeading>Youth</SectionHeading>

                <div className="space-y-3">
                  {household.youth.map((member) => (
                    <MemberDetail key={member.id} member={member} />
                  ))}
                </div>
              </section>
            )}

            {household.juniors.length > 0 && (
              <section>
                <SectionHeading>Juniors</SectionHeading>

                <div className="space-y-3">
                  {household.juniors.map((member) => (
                    <MemberDetail key={member.id} member={member} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function MemberDetail({ member }) {
  return (
    <div className="rounded-xl border border-brand-sand/45 p-4">
      <div className="flex items-start gap-3">
        <MemberAvatar member={member} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-extrabold text-brand-navy">
              {member.displayName}
            </h3>

            <MemberTypeBadge type={member.memberType} />
            {member.isBringAFriend && (
              <span className="text-xs font-semibold text-brand-gold">
                Bring A Friend
              </span>
            )}
          </div>

          <div className="mt-2 space-y-1.5">
            {member.workspaceEmail && (
              <a
                href={`mailto:${member.workspaceEmail}`}
                className="flex items-center gap-2 text-sm text-brand-taupe transition hover:text-brand-navy"
              >
                <Mail size={15} />
                <span className="break-all">{member.workspaceEmail}</span>
              </a>
            )}

            {member.phone && (
              <a
                href={`tel:${member.phone}`}
                className="flex items-center gap-2 text-sm text-brand-taupe transition hover:text-brand-navy"
              >
                <Phone size={15} />
                {formatPhone(member.phone)}
              </a>
            )}
          </div>

          {member.teaching?.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-taupe">
                Teaching
              </div>

              <div className="mt-2 space-y-2">
                {member.teaching.map((item) => {
                  const isJunior = item.program === "junior";

                  return (
                    <div
                      key={item.courseId}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <span className="text-sm font-semibold text-brand-navy">
                        {item.title}
                      </span>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                          isJunior
                            ? "bg-brand-junior/15 text-[#9f3d39] ring-1 ring-brand-junior/30"
                            : "bg-brand-sky/20 text-brand-navy ring-1 ring-brand-sky/35"
                        }`}
                      >
                        {isJunior ? "Junior" : "Youth"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {member.servicePositions?.length > 0 && (
            <div className="mt-5 border-t border-brand-sand/40 pt-4">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-taupe">
                Service & Leadership
              </div>

              <div className="mt-2 space-y-1.5">
                {member.servicePositions.map((position) => (
                  <div
                    key={position.id}
                    className="text-sm font-semibold text-brand-navy"
                  >
                    {position.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberTypeBadge({ type }) {
  if (type === "junior") {
    return (
      <span className="rounded-full bg-brand-junior/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#9f3d39] ring-1 ring-brand-junior/30">
        Junior
      </span>
    );
  }

  if (type === "youth") {
    return (
      <span className="rounded-full bg-brand-sky/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-brand-navy ring-1 ring-brand-sky/35">
        Youth
      </span>
    );
  }

  return (
    <span className="rounded-full bg-brand-sand/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-brand-navy ring-1 ring-brand-sand/40">
      Adult
    </span>
  );
}

function LocationLine({ location }) {
  const label = [location?.city, location?.state].filter(Boolean).join(", ");

  if (!label) {
    return null;
  }

  return (
    <div className="mt-1 flex items-center gap-1.5 text-sm text-brand-taupe">
      <MapPin size={15} />
      {label}
    </div>
  );
}

function SectionHeading({ children }) {
  return (
    <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-brand-taupe">
      {children}
    </h3>
  );
}
