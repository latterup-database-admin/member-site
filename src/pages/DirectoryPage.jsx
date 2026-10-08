import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Users } from "lucide-react";

import DirectoryFilters from "../components/directory/DirectoryFilters";
import FamilyCard from "../components/directory/FamilyCard";
import FamilyDetailDrawer from "../components/directory/FamilyDetailDrawer";

import {
  householdAudience,
  loadMemberDirectory,
} from "../data/directory";

export default function DirectoryPage() {
  const [households, setHouseholds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [search, setSearch] = useState("");
  const [audience, setAudience] = useState("all");
  const [state, setState] = useState("all");

  const [selectedHousehold, setSelectedHousehold] =
    useState(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setLoadError(null);

    loadMemberDirectory()
      .then((result) => {
        if (!active) return;

        setHouseholds(result.households ?? []);
      })
      .catch((error) => {
        if (!active) return;

        console.error(
          "Member directory failed to load:",
          error,
        );

        setLoadError(
          error.message ||
            "The member directory could not be loaded.",
        );

        setHouseholds([]);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const stateOptions = useMemo(() => {
    return [
      ...new Set(
        households
          .map(
            (household) =>
              household.location?.state,
          )
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [households]);

  const filteredHouseholds = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return households.filter((household) => {
      if (
        audience !== "all" &&
        householdAudience(household) !== audience
      ) {
        return false;
      }

      if (
        state !== "all" &&
        household.location?.state !== state
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchable = [
        household.familyName,
        household.location?.city,
        household.location?.state,

        ...household.members.flatMap((member) => [
          member.displayName,
          member.firstName,
          member.preferredName,
          member.lastName,
          member.workspaceEmail,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [
    households,
    search,
    audience,
    state,
  ]);

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-brand-taupe">
          <Users size={18} />
          Latter UP Community
        </div>

        <h1 className="brand-title mt-1 text-4xl text-brand-navy">
          Member Directory
        </h1>

        <p className="mt-2 max-w-2xl text-brand-taupe">
          Find Latter UP families and connect with
          members of our community.
        </p>
      </header>

      <DirectoryFilters
        search={search}
        onSearchChange={setSearch}
        audience={audience}
        onAudienceChange={setAudience}
        state={state}
        onStateChange={setState}
        stateOptions={stateOptions}
      />

      {!loading && !loadError && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-brand-taupe">
            {filteredHouseholds.length}{" "}
            {filteredHouseholds.length === 1
              ? "family"
              : "families"}
          </p>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-brand-sand/45 bg-white px-6 py-10 text-center text-sm font-semibold text-brand-taupe">
          Loading member directory…
        </div>
      )}

      {loadError && !loading && (
        <div className="rounded-2xl border border-brand-junior/35 bg-brand-junior/10 px-5 py-4 text-sm font-semibold text-brand-navy">
          We couldn't load the member directory.
          <div className="mt-1 font-normal text-brand-taupe">
            {loadError}
          </div>
        </div>
      )}

      {!loading &&
        !loadError &&
        filteredHouseholds.length === 0 && (
          <div className="rounded-2xl border border-brand-sand/45 bg-white px-6 py-12 text-center">
            <Users
              size={28}
              className="mx-auto text-brand-sky"
            />

            <h2 className="mt-3 font-extrabold text-brand-navy">
              No families found
            </h2>

            <p className="mt-1 text-sm text-brand-taupe">
              Try changing your search or filters.
            </p>
          </div>
        )}

      {!loading &&
        !loadError &&
        filteredHouseholds.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredHouseholds.map((household) => (
              <FamilyCard
                key={household.id}
                household={household}
                onOpen={setSelectedHousehold}
              />
            ))}
          </div>
        )}

      <FamilyDetailDrawer
        household={selectedHousehold}
        open={Boolean(selectedHousehold)}
        onClose={() =>
          setSelectedHousehold(null)
        }
      />
    </div>
  );
}