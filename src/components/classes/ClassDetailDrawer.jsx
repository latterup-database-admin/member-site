import {
  ExternalLink,
  FileText,
  PlayCircle,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  formatMeeting,
  periodLabel,
} from "../../data/classes";
import RegistrationPanel from "./RegistrationPanel";

export default function ClassDetailDrawer({
  offering,
  onClose,
}) {
  const offerings = useMemo(() => {
    if (!offering) return [];

    return offering.offerings?.length
      ? offering.offerings
      : [offering];
  }, [offering]);

  const [selectedOfferingId, setSelectedOfferingId] =
    useState(null);

  useEffect(() => {
    if (!offering) {
      setSelectedOfferingId(null);
      return;
    }

    const firstOffering =
      offering.offerings?.[0] ?? offering;

    setSelectedOfferingId(firstOffering.id);
  }, [offering]);

  if (!offering) return null;

  const selectedOffering =
    offerings.find(
      (item) => item.id === selectedOfferingId,
    ) ?? offerings[0];

  const instructors =
    offering.instructors
      ?.map((instructor) => instructor.name)
      .join(", ") ||
    selectedOffering?.instructors
      ?.map((instructor) => instructor.name)
      .join(", ") ||
    "Instructor TBD";

  const multipleOfferings =
    offerings.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-brand-navy/45"
        aria-label="Close class details"
      />

      <aside className="relative h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div
          className={`h-2 ${
            offering.program === "junior"
              ? "bg-brand-junior"
              : "bg-brand-sky"
          }`}
        />

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-brand-sand/35 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-taupe">
              Class details
            </p>

            <p className="brand-title text-xl text-brand-navy">
              {offering.title}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-lg p-2 text-brand-navy transition hover:bg-brand-sand/15"
            aria-label="Close"
          >
            <X />
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <Pill>
              {offering.program === "junior"
                ? "Junior"
                : "Youth"}
            </Pill>

            {getAvailablePeriods(offering).map(
              (period) => (
                <Pill key={period}>
                  {periodLabel(period)}
                </Pill>
              ),
            )}

            {!multipleOfferings &&
              offering.catalogGroup && (
                <Pill>
                  {offering.catalogGroup}
                </Pill>
              )}

            {offering.category && (
              <Pill>{offering.category}</Pill>
            )}
          </div>

          <section>
            <h2 className="brand-title text-lg text-brand-navy">
              About this class
            </h2>

            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-brand-taupe">
              {offering.description ||
                "Class description coming soon."}
            </p>
          </section>

          {multipleOfferings && (
            <section>
              <h2 className="brand-title text-lg text-brand-navy">
                Choose an offering
              </h2>

              <p className="mt-1 text-sm text-brand-taupe">
                Select the session you want to
                review or register for.
              </p>

              <div className="mt-3 grid gap-2">
                {offerings.map((item) => {
                  const selected =
                    item.id ===
                    selectedOffering?.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setSelectedOfferingId(
                          item.id,
                        )
                      }
                      className={`focus-ring rounded-xl border px-4 py-3 text-left transition ${
                        selected
                          ? "border-brand-navy bg-brand-navy text-white"
                          : "border-brand-sand/45 bg-stone-50 text-brand-navy hover:border-brand-sky"
                      }`}
                    >
                      <p className="font-extrabold">
                        {offeringChoiceLabel(
                          item,
                          offerings,
                        )}
                      </p>

                      {item.meetings?.length >
                        0 && (
                        <p
                          className={`mt-1 text-xs font-semibold ${
                            selected
                              ? "text-white/75"
                              : "text-brand-taupe"
                          }`}
                        >
                          {item.meetings
                            .map(formatMeeting)
                            .join(" · ")}
                        </p>
                      )}

                      {item.scheduleMode ===
                        "flexible" && (
                        <p
                          className={`mt-1 text-xs font-semibold ${
                            selected
                              ? "text-white/75"
                              : "text-brand-taupe"
                          }`}
                        >
                          Flexible / anytime
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {selectedOffering && (
            <>
              <section className="grid gap-3 rounded-2xl border border-brand-sand/40 bg-stone-50 p-4 sm:grid-cols-2">
                <Detail
                  label="Instructor"
                  value={instructors}
                />

                <Detail
                  label="Fee"
                  value={
                    selectedOffering.fee > 0
                      ? `$${selectedOffering.fee.toFixed(
                          2,
                        )}`
                      : "No class fee"
                  }
                />

                <Detail
                  label="Availability"
                  value={
                    selectedOffering.isFull
                      ? "Full — waitlist available"
                      : availabilityText(
                          selectedOffering,
                        )
                  }
                />

                <Detail
                  label="Term / Session"
                  value={periodLabel(
                    selectedOffering.offeringPeriod,
                  )}
                />

                {selectedOffering.catalogGroup && (
                  <Detail
                    label="Age range"
                    value={
                      selectedOffering.catalogGroup
                    }
                  />
                )}
              </section>

              <section>
                <h2 className="brand-title text-lg text-brand-navy">
                  Schedule
                </h2>

                <div className="mt-2 space-y-2">
                  {selectedOffering.scheduleMode ===
                  "flexible" ? (
                    <div className="rounded-xl border border-brand-sky/35 bg-brand-sky/10 px-4 py-3 text-sm font-semibold text-brand-navy">
                      Flexible / anytime — this
                      class does not have a fixed
                      weekly meeting time.
                    </div>
                  ) : selectedOffering.meetings
                      ?.length ? (
                    selectedOffering.meetings.map(
                      (meeting, index) => (
                        <div
                          key={`${meeting.dayOfWeek}-${meeting.startTime}-${index}`}
                          className="rounded-xl border border-brand-sand/35 px-4 py-3 text-sm font-semibold text-brand-navy"
                        >
                          {formatMeeting(
                            meeting,
                          )}
                        </div>
                      ),
                    )
                  ) : (
                    <p className="text-sm text-brand-taupe">
                      Schedule TBD
                    </p>
                  )}
                </div>
              </section>

              {selectedOffering.prerequisites && (
                <section>
                  <h2 className="brand-title text-lg text-brand-navy">
                    Prerequisites
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-brand-taupe">
                    {
                      selectedOffering.prerequisites
                    }
                  </p>
                </section>
              )}

              {(selectedOffering.syllabusUrl ||
                selectedOffering.introVideoUrl) && (
                <section>
                  <h2 className="brand-title text-lg text-brand-navy">
                    Class resources
                  </h2>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedOffering.syllabusUrl && (
                      <ResourceLink
                        href={
                          selectedOffering.syllabusUrl
                        }
                        icon={FileText}
                      >
                        View syllabus
                      </ResourceLink>
                    )}

                    {selectedOffering.introVideoUrl && (
                      <ResourceLink
                        href={
                          selectedOffering.introVideoUrl
                        }
                        icon={PlayCircle}
                      >
                        Watch intro video
                      </ResourceLink>
                    )}
                  </div>
                </section>
              )}

              <RegistrationPanel
                key={selectedOffering.id}
                offering={selectedOffering}
              />
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="rounded-full bg-brand-sand/20 px-3 py-1 text-xs font-extrabold text-brand-navy">
      {children}
    </span>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-taupe">
        {label}
      </p>

      <p className="mt-1 font-extrabold text-brand-navy">
        {value}
      </p>
    </div>
  );
}

function ResourceLink({
  href,
  icon: Icon,
  children,
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="focus-ring inline-flex items-center gap-2 rounded-xl border border-brand-sand/50 px-3 py-2 text-sm font-extrabold text-brand-navy transition hover:bg-brand-sky/10"
    >
      <Icon size={16} />
      {children}
      <ExternalLink size={13} />
    </a>
  );
}

function getAvailablePeriods(offering) {
  if (offering.offeringPeriods?.length) {
    return offering.offeringPeriods;
  }

  if (offering.offeringPeriod) {
    return [offering.offeringPeriod];
  }

  return [];
}

function offeringChoiceLabel(
  offering,
  allOfferings,
) {
  const base =
    periodLabel(offering.offeringPeriod) ||
    "Offering";

  const samePeriod = allOfferings.filter(
    (item) =>
      item.offeringPeriod ===
      offering.offeringPeriod,
  );

  if (samePeriod.length === 1) {
    return base;
  }

  const details = [];

  if (offering.catalogGroup) {
    details.push(offering.catalogGroup);
  }

  if (offering.meetings?.[0]) {
    details.push(
      formatMeeting(offering.meetings[0]),
    );
  }

  return details.length
    ? `${base} — ${details.join(" · ")}`
    : base;
}

function availabilityText(offering) {
  if (offering.seatsRemaining === null) {
    return "Open";
  }

  return `${offering.seatsRemaining} ${
    offering.seatsRemaining === 1
      ? "seat"
      : "seats"
  } available`;
}

function ageText(offering) {
  if (
    offering.minimumAge !== null &&
    offering.maximumAge !== null
  ) {
    return `Recommended ages ${offering.minimumAge}–${offering.maximumAge}.`;
  }

  if (offering.minimumAge !== null) {
    return `Recommended for ages ${offering.minimumAge} and up.`;
  }

  if (offering.maximumAge !== null) {
    return `Recommended through age ${offering.maximumAge}.`;
  }

  return (
    offering.catalogGroup ||
    "See catalog grouping for guidance."
  );
}