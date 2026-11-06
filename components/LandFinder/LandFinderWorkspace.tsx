import React from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  Check,
  Crosshair,
  FileDown,
  GripVertical,
  List,
  LoaderCircle,
  Map as MapIcon,
  MapPinned,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import type {
  AppraisalPlanningStatus,
  AppraisalSiteStatus,
  DevelopmentAppraisal,
  DevelopmentAppraisalKind,
} from "../../types";
import { useAppContext } from "../../contexts/AppContext";
import { useToast } from "../../contexts/ToastContext";
import {
  calculateAppraisalOption,
  createDefaultAppraisal,
} from "../../utils/appraisal";
import { exportLandFinderStatusReport } from "../../utils/landFinderStatusReport";
import { appraisalSiteGroupKey } from "../../utils/appraisalSiteStatus";
import "leaflet/dist/leaflet.css";

const DEFAULT_MAP_CENTRE: [number, number] = [55.9533, -3.1883];
const ACRES_PER_HECTARE = 2.47105381;
const OPEN_STREET_MAP_TILE_URL =
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const COUNTRIES = ["Scotland", "England", "Wales", "Northern Ireland"] as const;
const SCOTTISH_COUNTIES = [
  "Aberdeenshire",
  "Angus",
  "Argyll and Bute",
  "City of Edinburgh",
  "Clackmannanshire",
  "Dumfries and Galloway",
  "Dundee City",
  "East Ayrshire",
  "East Dunbartonshire",
  "East Lothian",
  "East Renfrewshire",
  "Falkirk",
  "Fife",
  "Glasgow City",
  "Highland",
  "Inverclyde",
  "Midlothian",
  "Moray",
  "Na h-Eileanan Siar",
  "North Ayrshire",
  "North Lanarkshire",
  "Orkney Islands",
  "Perth and Kinross",
  "Renfrewshire",
  "Scottish Borders",
  "Shetland Islands",
  "South Ayrshire",
  "South Lanarkshire",
  "Stirling",
  "West Dunbartonshire",
  "West Lothian",
];
const COUNTIES_BY_COUNTRY: Record<(typeof COUNTRIES)[number], string[]> = {
  Scotland: SCOTTISH_COUNTIES,
  England: [
    "Bedfordshire",
    "Berkshire",
    "Bristol",
    "Buckinghamshire",
    "Cambridgeshire",
    "Cheshire",
    "City of London",
    "Cornwall",
    "Cumbria",
    "Derbyshire",
    "Devon",
    "Dorset",
    "County Durham",
    "East Riding of Yorkshire",
    "East Sussex",
    "Essex",
    "Gloucestershire",
    "Greater London",
    "Greater Manchester",
    "Hampshire",
    "Herefordshire",
    "Hertfordshire",
    "Isle of Wight",
    "Kent",
    "Lancashire",
    "Leicestershire",
    "Lincolnshire",
    "Merseyside",
    "Norfolk",
    "North Yorkshire",
    "Northamptonshire",
    "Northumberland",
    "Nottinghamshire",
    "Oxfordshire",
    "Rutland",
    "Shropshire",
    "Somerset",
    "South Yorkshire",
    "Staffordshire",
    "Suffolk",
    "Surrey",
    "Tyne and Wear",
    "Warwickshire",
    "West Midlands",
    "West Sussex",
    "West Yorkshire",
    "Wiltshire",
    "Worcestershire",
  ],
  Wales: [
    "Blaenau Gwent",
    "Bridgend",
    "Caerphilly",
    "Cardiff",
    "Carmarthenshire",
    "Ceredigion",
    "Conwy",
    "Denbighshire",
    "Flintshire",
    "Gwynedd",
    "Isle of Anglesey",
    "Merthyr Tydfil",
    "Monmouthshire",
    "Neath Port Talbot",
    "Newport",
    "Pembrokeshire",
    "Powys",
    "Rhondda Cynon Taf",
    "Swansea",
    "Torfaen",
    "Vale of Glamorgan",
    "Wrexham",
  ],
  "Northern Ireland": [
    "Antrim",
    "Armagh",
    "Down",
    "Fermanagh",
    "Londonderry",
    "Tyrone",
  ],
};
const SITE_STATUS_OPTIONS: Array<{
  id: AppraisalSiteStatus;
  label: string;
  className: string;
}> = [
  {
    id: "NOT_VIABLE",
    label: "Not viable",
    className:
      "border-slate-950 bg-slate-950 text-white dark:border-slate-600 dark:bg-slate-800",
  },
  {
    id: "VIABLE_DISCOUNTED",
    label: "Viable but discounted",
    className:
      "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
  },
  {
    id: "NOT_APPRAISED",
    label: "Not appraised",
    className:
      "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
  },
  {
    id: "APPRAISAL_IN_PROGRESS",
    label: "Appraisal in progress",
    className:
      "border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200",
  },
  {
    id: "APPRAISED_VIABLE",
    label: "Appraised and viable",
    className:
      "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200",
  },
  {
    id: "APPRAISED_PURSUED",
    label: "Appraised and being pursued",
    className:
      "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
  },
  {
    id: "SITE_ACQUIRED",
    label: "Site acquired",
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  {
    id: "BID_LOST",
    label: "Bid lost",
    className:
      "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
  },
];

type LandOpportunity = {
  appraisal: DevelopmentAppraisal;
  mapAppraisal: DevelopmentAppraisal;
  versions: DevelopmentAppraisal[];
  groupKey: string;
};

const PLANNING_STATUS_OPTIONS: Array<{
  id: AppraisalPlanningStatus;
  label: string;
}> = [
  { id: "UNKNOWN", label: "Unknown" },
  { id: "NONE", label: "None" },
  { id: "IN_LDP", label: "In LDP" },
  { id: "EXPIRED", label: "Expired" },
  { id: "IN_PRINCIPLE", label: "In principle" },
  { id: "DETAILED_CONSENT", label: "Detailed consent" },
];

type SiteDetailsDraft = {
  site: string;
  country: string;
  county: string;
  status: AppraisalSiteStatus;
  planningStatus: AppraisalPlanningStatus;
  offMarket: boolean;
  areaHectares: string;
  areaAcres: string;
  landPriceKnown: boolean;
  landPrice: string;
};

function money(value: number) {
  return `\u00A3${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function parsePositiveNumber(value: string) {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function formatAreaInput(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function hasCoordinates(appraisal: DevelopmentAppraisal) {
  return (
    typeof appraisal.siteLatitude === "number" &&
    typeof appraisal.siteLongitude === "number"
  );
}

function formatCoordinates(appraisal: DevelopmentAppraisal) {
  return hasCoordinates(appraisal)
    ? `${appraisal.siteLatitude!.toFixed(6)}, ${appraisal.siteLongitude!.toFixed(6)}`
    : "No location saved";
}

function siteGroupKey(appraisal: DevelopmentAppraisal) {
  return appraisalSiteGroupKey(appraisal);
}

function siteStatusInfo(status: AppraisalSiteStatus | undefined) {
  return (
    SITE_STATUS_OPTIONS.find((option) => option.id === status) ||
    SITE_STATUS_OPTIONS[2]
  );
}

function siteStatusMapColour(status: AppraisalSiteStatus | undefined) {
  switch (status) {
    case "NOT_VIABLE":
      return "#0f172a";
    case "BID_LOST":
      return "#64748b";
    case "VIABLE_DISCOUNTED":
      return "#e11d48";
    case "APPRAISAL_IN_PROGRESS":
      return "#0f766e";
    case "APPRAISED_VIABLE":
      return "#7c3aed";
    case "APPRAISED_PURSUED":
      return "#d97706";
    case "SITE_ACQUIRED":
      return "#059669";
    default:
      return "#0284c7";
  }
}

function draftForSite(appraisal: DevelopmentAppraisal): SiteDetailsDraft {
  return {
    site: appraisal.site || appraisal.name,
    country: appraisal.siteCountry || inferLegacyCountry(appraisal),
    county: appraisal.siteCounty || "",
    status: appraisal.siteStatus || "NOT_APPRAISED",
    planningStatus: appraisal.sitePlanningStatus || "UNKNOWN",
    offMarket: appraisal.siteOffMarket === true,
    areaHectares: appraisal.siteAreaHectares
      ? formatAreaInput(appraisal.siteAreaHectares)
      : "",
    areaAcres: appraisal.siteAreaHectares
      ? formatAreaInput(appraisal.siteAreaHectares * ACRES_PER_HECTARE)
      : "",
    landPriceKnown: appraisal.siteLandPriceKnown === true,
    landPrice: appraisal.siteLandPrice ? String(appraisal.siteLandPrice) : "",
  };
}

function detailsPatch(draft: SiteDetailsDraft): Partial<DevelopmentAppraisal> {
  const landPrice = Number(draft.landPrice.replace(/[^0-9.-]/g, ""));
  const siteAreaHectares = parsePositiveNumber(draft.areaHectares);
  return {
    site: draft.site.trim(),
    siteCountry: draft.country,
    siteCounty: draft.county,
    siteStatus: draft.status,
    sitePlanningStatus: draft.planningStatus,
    siteOffMarket: draft.offMarket,
    siteLandPriceKnown: draft.landPriceKnown,
    siteLandPrice:
      draft.landPriceKnown && Number.isFinite(landPrice) && landPrice > 0
        ? landPrice
        : undefined,
    siteAreaHectares,
  };
}

function inferLegacyCountry(appraisal: DevelopmentAppraisal) {
  if (SCOTTISH_COUNTIES.includes(appraisal.siteCounty || "")) return "Scotland";
  if (appraisal.siteRegion === "Wales") return "Wales";
  if (appraisal.siteRegion === "Northern Ireland") return "Northern Ireland";
  if (appraisal.siteRegion && !appraisal.siteRegion.includes("Scotland"))
    return "England";
  if (appraisal.siteRegion?.includes("Scotland")) return "Scotland";
  return "";
}

function MapViewport({
  focus,
  pins,
  showAllRevision,
}: {
  focus: DevelopmentAppraisal | undefined;
  pins: DevelopmentAppraisal[];
  showAllRevision: number;
}) {
  const map = useMap();
  React.useEffect(() => {
    if (focus && hasCoordinates(focus))
      map.flyTo(
        [focus.siteLatitude!, focus.siteLongitude!],
        Math.max(map.getZoom(), 15),
        { duration: 0.45 },
      );
  }, [focus, map]);
  React.useEffect(() => {
    if (showAllRevision === 0 || pins.length === 0) return;
    if (pins.length === 1) {
      map.flyTo([pins[0].siteLatitude!, pins[0].siteLongitude!], 14, {
        duration: 0.45,
      });
      return;
    }
    map.fitBounds(
      pins.map(
        (appraisal) =>
          [appraisal.siteLatitude!, appraisal.siteLongitude!] as [
            number,
            number,
          ],
      ),
      { padding: [40, 40], maxZoom: 14 },
    );
  }, [map, pins, showAllRevision]);
  return null;
}

function MapClickCapture({
  enabled,
  onPlace,
}: {
  enabled: boolean;
  onPlace: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      if (enabled) onPlace(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function MapSizeInvalidator() {
  const map = useMap();
  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => map.invalidateSize());
    const timer = window.setTimeout(() => map.invalidateSize(), 150);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [map]);
  return null;
}

function InspectorMapViewport({ appraisal }: { appraisal: DevelopmentAppraisal }) {
  const map = useMap();
  React.useEffect(() => {
    if (!hasCoordinates(appraisal)) return;
    map.flyTo(
      [appraisal.siteLatitude!, appraisal.siteLongitude!],
      15,
      { duration: 0.35 },
    );
  }, [appraisal.id, appraisal.siteLatitude, appraisal.siteLongitude, map]);
  return null;
}

function InspectorLocationMap({
  appraisal,
}: {
  appraisal: DevelopmentAppraisal;
}) {
  const hasSavedLocation = hasCoordinates(appraisal);
  const centre: [number, number] = hasSavedLocation
    ? [appraisal.siteLatitude!, appraisal.siteLongitude!]
    : DEFAULT_MAP_CENTRE;
  const pinColour = siteStatusMapColour(appraisal.siteStatus);
  return (
    <section className="overflow-hidden rounded-app-sm border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-surface-950/45">
      <div className="flex items-start justify-between gap-3 px-3 py-2.5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Location map
          </div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {hasSavedLocation
              ? "Zoom and pan to review the saved site location."
              : "Set a location using Point on map to show the site pin."}
          </div>
        </div>
      </div>
      <div className="h-56 border-t border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
        <MapContainer
          center={centre}
          zoom={hasSavedLocation ? 15 : 7}
          scrollWheelZoom
          className="h-full w-full"
          aria-label="Site location map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={OPEN_STREET_MAP_TILE_URL}
          />
          <MapSizeInvalidator />
          <InspectorMapViewport appraisal={appraisal} />
          {hasSavedLocation ? (
            <CircleMarker
              center={[appraisal.siteLatitude!, appraisal.siteLongitude!]}
              radius={8}
              pathOptions={{ color: pinColour, fillColor: pinColour, fillOpacity: 0.9, weight: 2 }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                {appraisal.site || appraisal.name}
              </Tooltip>
            </CircleMarker>
          ) : null}
        </MapContainer>
      </div>
    </section>
  );
}

function FloatingMapLegend() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const drag = React.useRef<{
    pointerId: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const x = active.offsetX + event.clientX - active.x;
    const y = active.offsetY + event.clientY - active.y;
    setOffset({ x, y });
  };
  const finishDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
  };
  return (
    <div
      className="absolute right-4 top-4 z-[1000] touch-none cursor-grab active:cursor-grabbing"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex overflow-hidden rounded-app-sm border border-slate-200 bg-white/95 shadow-md backdrop-blur dark:border-slate-700 dark:bg-surface-900/95">
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white dark:text-slate-100 dark:hover:bg-surface-800"
          aria-expanded={isOpen}
        >
          <List className="h-4 w-4" />
          Legend
        </button>
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          className="border-l border-slate-200 px-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:hover:bg-surface-800 dark:hover:text-slate-100"
          aria-label="Drag legend"
          title="Drag legend"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      {isOpen && (
        <div className="mt-2 w-56 rounded-app-sm border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-surface-900/95">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Site status
          </div>
          <div className="space-y-2">
            {SITE_STATUS_OPTIONS.map((status) => (
              <div
                key={status.id}
                className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: siteStatusMapColour(status.id) }}
                />
                {status.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LandMapViewer({
  opportunities,
  selectedId,
  onSelect,
  onClose,
  onUpdateCoordinates,
}: {
  opportunities: LandOpportunity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onUpdateCoordinates: (
    appraisalId: string,
    latitude: number,
    longitude: number,
  ) => void;
}) {
  const selected =
    opportunities.find(({ appraisal }) => appraisal.id === selectedId) ??
    opportunities[0];
  const mappedAppraisals = React.useMemo(
    () =>
      opportunities
        .filter(({ mapAppraisal }) => hasCoordinates(mapAppraisal))
        .map(({ mapAppraisal }) => mapAppraisal),
    [opportunities],
  );
  const firstPin = mappedAppraisals[0];
  const initialCentre: [number, number] = firstPin
    ? [firstPin.siteLatitude!, firstPin.siteLongitude!]
    : DEFAULT_MAP_CENTRE;
  const [placingPin, setPlacingPin] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [latitudeDraft, setLatitudeDraft] = React.useState("");
  const [longitudeDraft, setLongitudeDraft] = React.useState("");
  const [locationSearch, setLocationSearch] = React.useState("");
  const [locationSearchResults, setLocationSearchResults] = React.useState<
    Array<{ displayName: string; latitude: number; longitude: number }>
  >([]);
  const [showAllRevision, setShowAllRevision] = React.useState(1);
  React.useEffect(() => {
    setPlacingPin(false);
    setMessage(null);
    setLatitudeDraft(
      selected && typeof selected.mapAppraisal.siteLatitude === "number"
        ? String(selected.mapAppraisal.siteLatitude)
        : "",
    );
    setLongitudeDraft(
      selected && typeof selected.mapAppraisal.siteLongitude === "number"
        ? String(selected.mapAppraisal.siteLongitude)
        : "",
    );
    setLocationSearch(selected?.appraisal.site || "");
    setLocationSearchResults([]);
  }, [
    selected?.appraisal.id,
    selected?.mapAppraisal.siteLatitude,
    selected?.mapAppraisal.siteLongitude,
  ]);
  const saveCoordinates = () => {
    if (!selected) return;
    const latitude = Number(latitudeDraft);
    const longitude = Number(longitudeDraft);
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setMessage(
        "Enter a latitude between -90 and 90 and a longitude between -180 and 180.",
      );
      return;
    }
    onUpdateCoordinates(selected.appraisal.id, latitude, longitude);
    setMessage("Location saved for this site.");
  };
  const locateAddress = async () => {
    if (!selected?.appraisal.site.trim()) return;
    setIsLocating(true);
    setMessage(null);
    try {
      const response = await fetch(
        `${NOMINATIM_SEARCH_URL}?format=jsonv2&limit=1&accept-language=en&q=${encodeURIComponent(selected.appraisal.site.trim())}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok)
        throw new Error("The address search could not be completed.");
      const result = (await response.json()) as Array<{
        lat?: string;
        lon?: string;
      }>;
      const latitude = Number(result[0]?.lat);
      const longitude = Number(result[0]?.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
        throw new Error(
          "No map location was found for the saved site address.",
        );
      onUpdateCoordinates(selected.appraisal.id, latitude, longitude);
      setMessage("Site address located and saved.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The address search could not be completed.",
      );
    } finally {
      setIsLocating(false);
    }
  };
  const searchLocation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = locationSearch.trim();
    if (!query) {
      setLocationSearchResults([]);
      setMessage("Enter an address, postcode, town, or place to search.");
      return;
    }
    setIsSearchingLocation(true);
    setMessage(null);
    try {
      const response = await fetch(
        `${NOMINATIM_SEARCH_URL}?format=jsonv2&limit=5&accept-language=en&q=${encodeURIComponent(query)}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) throw new Error("The location search could not be completed.");
      const results = (await response.json()) as Array<{
        display_name?: string;
        lat?: string;
        lon?: string;
      }>;
      const validResults = results
        .map((result) => ({
          displayName: result.display_name || "Unnamed location",
          latitude: Number(result.lat),
          longitude: Number(result.lon),
        }))
        .filter(
          (result) =>
            Number.isFinite(result.latitude) && Number.isFinite(result.longitude),
        );
      if (!validResults.length) {
        setLocationSearchResults([]);
        setMessage("No locations were found. Try a fuller address or postcode.");
        return;
      }
      setLocationSearchResults(validResults);
      setMessage("Choose a result to place and save the site pin.");
    } catch (error) {
      setLocationSearchResults([]);
      setMessage(
        error instanceof Error
          ? error.message
          : "The location search could not be completed.",
      );
    } finally {
      setIsSearchingLocation(false);
    }
  };
  const chooseLocationSearchResult = (result: {
    displayName: string;
    latitude: number;
    longitude: number;
  }) => {
    if (!selected) return;
    onUpdateCoordinates(selected.appraisal.id, result.latitude, result.longitude);
    setLatitudeDraft(String(result.latitude));
    setLongitudeDraft(String(result.longitude));
    setLocationSearchResults([]);
    setMessage("Search result selected and site pin saved.");
  };
  const placePin = (latitude: number, longitude: number) => {
    if (!selected) return;
    onUpdateCoordinates(selected.appraisal.id, latitude, longitude);
    setLatitudeDraft(String(latitude));
    setLongitudeDraft(String(longitude));
    setMessage("Pin placed and saved.");
    setPlacingPin(false);
  };
  return (
    <div className="absolute inset-0 z-30 flex min-h-0 flex-col overflow-hidden rounded-app bg-white dark:bg-surface-900">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-sky-50/85 px-5 py-3 dark:border-slate-800 dark:bg-sky-950/25">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-app-sm bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
            <MapIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">
              Land opportunity map
            </h2>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              One pin per site, with all versions grouped together.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAllRevision((value) => value + 1)}
            disabled={mappedAppraisals.length === 0}
            className="workspace-secondary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MapIcon className="h-4 w-4" />
            Show all locations
          </button>
          <button
            type="button"
            onClick={onClose}
            className="workspace-secondary-btn px-3 py-2 text-xs"
          >
            <X className="h-4 w-4" />
            Close map
          </button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_20rem] lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="relative min-h-0 border-r border-slate-200 dark:border-slate-800">
          <MapContainer
            center={initialCentre}
            zoom={firstPin ? 13 : 7}
            className="h-full w-full"
            aria-label="Land opportunity map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={OPEN_STREET_MAP_TILE_URL}
          />
          <MapSizeInvalidator />
            <MapViewport
              focus={selected?.mapAppraisal}
              pins={mappedAppraisals}
              showAllRevision={showAllRevision}
            />
            <MapClickCapture enabled={placingPin} onPlace={placePin} />
            {opportunities
              .filter(({ mapAppraisal }) => hasCoordinates(mapAppraisal))
              .map(({ appraisal, mapAppraisal }) => {
                const colour = siteStatusMapColour(appraisal.siteStatus);
                return (
                  <CircleMarker
                    key={appraisal.id}
                    center={[
                      mapAppraisal.siteLatitude!,
                      mapAppraisal.siteLongitude!,
                    ]}
                    radius={appraisal.id === selected?.appraisal.id ? 10 : 7}
                    pathOptions={{
                      color: colour,
                      fillColor: colour,
                      fillOpacity: 0.88,
                      weight: appraisal.id === selected?.appraisal.id ? 4 : 2,
                    }}
                    eventHandlers={{ click: () => onSelect(appraisal.id) }}
                  >
                    <Tooltip direction="top" offset={[0, -8]}>
                      {appraisal.site || appraisal.name}
                    </Tooltip>
                  </CircleMarker>
                );
              })}
          </MapContainer>
          <FloatingMapLegend />
          {placingPin && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-[1000] -translate-x-1/2 rounded-app-sm bg-slate-950/90 px-3 py-2 text-xs font-semibold text-white shadow-lg">
              Click the map to save this site location
            </div>
          )}
        </div>
        <aside className="min-h-0 overflow-y-auto bg-slate-50/85 p-4 dark:bg-surface-950/45">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Selected site
            <select
              value={selected?.appraisal.id ?? ""}
              onChange={(event) => onSelect(event.target.value)}
              className="mt-1.5 h-9 w-full rounded-app-sm border border-slate-300 bg-white px-2 text-sm font-medium text-slate-800 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
            >
              {opportunities.map(({ appraisal }) => (
                <option key={appraisal.id} value={appraisal.id}>
                  {appraisal.site || appraisal.name}
                </option>
              ))}
            </select>
          </label>
          {selected ? (
            <>
              <div className="mt-4 rounded-app-sm border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-surface-900">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selected.appraisal.site || selected.appraisal.name}
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3 text-xs font-medium text-slate-700 dark:border-slate-800 dark:text-slate-200">
                  {formatCoordinates(selected.mapAppraisal)}
                </div>
              </div>
              <form onSubmit={searchLocation} className="mt-4">
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Search location
                  <div className="mt-1.5 flex gap-2">
                    <input
                      value={locationSearch}
                      onChange={(event) => setLocationSearch(event.target.value)}
                      placeholder="Address, postcode, town or place"
                      className="h-9 min-w-0 flex-1 rounded-app-sm border border-slate-300 bg-white px-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
                    />
                    <button
                      type="submit"
                      disabled={isSearchingLocation || !locationSearch.trim()}
                      className="workspace-secondary-btn h-9 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSearchingLocation ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      Search
                    </button>
                  </div>
                </label>
              </form>
              {locationSearchResults.length > 0 ? (
                <div className="mt-2 overflow-hidden rounded-app-sm border border-slate-200 bg-white dark:border-slate-700 dark:bg-surface-900">
                  {locationSearchResults.map((result) => (
                    <button
                      key={`${result.latitude}-${result.longitude}`}
                      type="button"
                      onClick={() => chooseLocationSearchResult(result)}
                      className="block w-full border-b border-slate-100 px-3 py-2 text-left text-xs leading-5 text-slate-700 transition last:border-b-0 hover:bg-sky-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-sky-950/25"
                      title="Place the site pin here"
                    >
                      {result.displayName}
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                onClick={locateAddress}
                disabled={!selected.appraisal.site.trim() || isLocating}
                className="workspace-secondary-btn mt-3 w-full justify-center px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLocating ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Crosshair className="h-4 w-4" />
                )}
                Locate saved address
              </button>
              <button
                type="button"
                onClick={() => setPlacingPin((value) => !value)}
                className={`mt-2 flex w-full items-center justify-center gap-2 rounded-app-sm border px-3 py-2 text-xs font-semibold transition ${placingPin ? "border-primary-600 bg-primary-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-primary-300 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200"}`}
              >
                <MapPinned className="h-4 w-4" />
                {placingPin ? "Click map to place pin" : "Place pin on map"}
              </button>
              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Coordinates
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    Latitude
                    <input
                      value={latitudeDraft}
                      onChange={(event) => setLatitudeDraft(event.target.value)}
                      inputMode="decimal"
                      className="mt-1 h-9 w-full rounded-app-sm border border-slate-300 bg-white px-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    Longitude
                    <input
                      value={longitudeDraft}
                      onChange={(event) =>
                        setLongitudeDraft(event.target.value)
                      }
                      inputMode="decimal"
                      className="mt-1 h-9 w-full rounded-app-sm border border-slate-300 bg-white px-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={saveCoordinates}
                  className="workspace-secondary-btn mt-2 w-full justify-center px-3 py-2 text-xs"
                >
                  <Check className="h-4 w-4" />
                  Save coordinates
                </button>
              </div>
              {message && (
                <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {message}
                </p>
              )}
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function LandSiteInspector({
  opportunity,
  onClose,
  onSave,
  onMap,
  onMoveToAppraisal,
  onDelete,
}: {
  opportunity: LandOpportunity;
  onClose: () => void;
  onSave: (patch: Partial<DevelopmentAppraisal>) => void;
  onMap: () => void;
  onMoveToAppraisal: (patch: Partial<DevelopmentAppraisal>) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = React.useState(() =>
    draftForSite(opportunity.appraisal),
  );
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);
  React.useEffect(
    () => setDraft(draftForSite(opportunity.appraisal)),
    [opportunity.appraisal],
  );
  const patch = detailsPatch(draft);
  const enteredLandPrice = Number(draft.landPrice.replace(/[^0-9.-]/g, ""));
  const enteredAreaHectares = parsePositiveNumber(draft.areaHectares);
  const showLandValueRates =
    draft.landPriceKnown &&
    Number.isFinite(enteredLandPrice) &&
    enteredLandPrice > 0 &&
    Boolean(enteredAreaHectares);
  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-surface-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-surface-950/45">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
            Land Finder inspector
          </div>
          <h2 className="mt-1 text-base font-semibold text-slate-950 dark:text-slate-50">
            {opportunity.appraisal.site || opportunity.appraisal.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="workspace-secondary-btn h-9 w-9 justify-center p-0"
          aria-label="Close site inspector"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <section className={`rounded-app-sm border p-3 ${draft.offMarket ? "border-slate-400 bg-slate-100 dark:border-slate-600 dark:bg-surface-800" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-surface-950/45"}`}>
          <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <input
              type="checkbox"
              checked={draft.offMarket}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  offMarket: event.target.checked,
                }))
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-700"
            />
            <span>
              Off market
              <span className="mt-0.5 block text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">
                Pause this opportunity and disable its other site controls.
              </span>
            </span>
          </label>
        </section>
        <fieldset
          disabled={draft.offMarket}
          aria-disabled={draft.offMarket}
          className={`min-w-0 space-y-4 border-0 p-0 ${draft.offMarket ? "pointer-events-none opacity-40" : ""}`}
        >
        <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Site name
          <input
            value={draft.site}
            onChange={(event) =>
              setDraft((current) => ({ ...current, site: event.target.value }))
            }
            className="mt-1.5 h-10 w-full rounded-app-sm border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-100"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Country
            <select
              value={draft.country}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  country: event.target.value,
                  county: "",
                }))
              }
              className="mt-1.5 h-10 w-full rounded-app-sm border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-100"
            >
              <option value="">Not set</option>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            County
            <select
              value={draft.county}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  county: event.target.value,
                }))
              }
              className="mt-1.5 h-10 w-full rounded-app-sm border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-100"
              disabled={!draft.country}
            >
              <option value="">
                {draft.country ? "Not set" : "Choose a country first"}
              </option>
              {(
                COUNTIES_BY_COUNTRY[
                  draft.country as keyof typeof COUNTIES_BY_COUNTRY
                ] || []
              ).map((county) => (
                <option key={county} value={county}>
                  {county}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Site status
          <select
            value={draft.status}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                status: event.target.value as AppraisalSiteStatus,
              }))
            }
            className="mt-1.5 h-10 w-full rounded-app-sm border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-100"
          >
            {SITE_STATUS_OPTIONS.map((status) => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Planning status
          <select
            value={draft.planningStatus}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                planningStatus: event.target.value as AppraisalPlanningStatus,
              }))
            }
            className="mt-1.5 h-10 w-full rounded-app-sm border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-100"
          >
            {PLANNING_STATUS_OPTIONS.map((status) => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <section className="rounded-app-sm border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-surface-950/45">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Location
              </div>
              <div className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                {formatCoordinates(opportunity.mapAppraisal)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onSave(patch);
                onMap();
              }}
              className="workspace-secondary-btn px-3 py-2 text-xs"
            >
              <MapPinned className="h-4 w-4" />
              Point on map
            </button>
          </div>
        </section>
        <section className="rounded-app-sm border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-surface-950/45">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Site area
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Hectares
              <input
                value={draft.areaHectares}
                onChange={(event) => {
                  const areaHectares = parsePositiveNumber(event.target.value);
                  setDraft((current) => ({
                    ...current,
                    areaHectares: event.target.value,
                    areaAcres: areaHectares
                      ? formatAreaInput(areaHectares * ACRES_PER_HECTARE)
                      : "",
                  }));
                }}
                inputMode="decimal"
                placeholder="0.0000"
                className="mt-1.5 h-10 w-full rounded-app-sm border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
              />
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Acres
              <input
                value={draft.areaAcres}
                onChange={(event) => {
                  const areaAcres = parsePositiveNumber(event.target.value);
                  setDraft((current) => ({
                    ...current,
                    areaAcres: event.target.value,
                    areaHectares: areaAcres
                      ? formatAreaInput(areaAcres / ACRES_PER_HECTARE)
                      : "",
                  }));
                }}
                inputMode="decimal"
                placeholder="0.0000"
                className="mt-1.5 h-10 w-full rounded-app-sm border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Enter either unit; the other updates automatically.
          </p>
        </section>
        <section className="rounded-app-sm border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-surface-950/45">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <input
              type="checkbox"
              checked={draft.landPriceKnown}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  landPriceKnown: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300 text-primary-600"
            />
            Land price known
          </label>
          <label className="mt-3 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Land price
            <input
              value={draft.landPrice}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  landPrice: event.target.value,
                }))
              }
              disabled={!draft.landPriceKnown}
              inputMode="decimal"
              placeholder="£0"
              className="mt-1.5 h-10 w-full rounded-app-sm border border-slate-300 bg-white px-3 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100 dark:disabled:bg-surface-950"
            />
          </label>
          {showLandValueRates && enteredAreaHectares ? (
            <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
              <div className="rounded-app-sm bg-white px-2.5 py-2 dark:bg-surface-900">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  £/ac
                </dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {money(
                    enteredLandPrice /
                      (enteredAreaHectares * ACRES_PER_HECTARE),
                  )}
                </dd>
              </div>
              <div className="rounded-app-sm bg-white px-2.5 py-2 dark:bg-surface-900">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  £/ha
                </dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {money(enteredLandPrice / enteredAreaHectares)}
                </dd>
              </div>
            </dl>
          ) : null}
        </section>
        <InspectorLocationMap appraisal={opportunity.mapAppraisal} />
        </fieldset>
      </div>
      <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
        {isConfirmingDelete ? (
          <div className="flex w-full items-center justify-between gap-3 rounded-app-sm border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
            <span>
              Delete this site and {opportunity.versions.length} linked
              appraisal
              {opportunity.versions.length === 1 ? "" : "s"}?
            </span>
            <span className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="workspace-secondary-btn px-2 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1.5 rounded-app-sm bg-rose-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete site
              </button>
            </span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="mr-auto flex items-center gap-1.5 rounded-app-sm border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-200 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="h-4 w-4" />
              Delete site
            </button>
            <button
              type="button"
              onClick={() => onSave(patch)}
              className="workspace-secondary-btn px-3 py-2 text-xs"
            >
              <Check className="h-4 w-4" />
              Save site
            </button>
            <button
              type="button"
              onClick={() => onMoveToAppraisal(patch)}
              disabled={draft.offMarket}
              className="workspace-primary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              Move to appraisal
            </button>
          </>
        )}
      </footer>
    </aside>
  );
}

export function LandFinderWorkspace({
  onClose,
  onOpenAppraisals,
}: {
  onClose: () => void;
  onOpenAppraisals: () => void;
}) {
  const { appraisals, appSettings, setAppraisals } = useAppContext();
  const { showToast } = useToast();
  const [search, setSearch] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [county, setCounty] = React.useState("");
  const [isMapOpen, setIsMapOpen] = React.useState(false);
  const [selectedMapId, setSelectedMapId] = React.useState<string | null>(null);
  const [selectedInspectorId, setSelectedInspectorId] = React.useState<
    string | null
  >(null);
  const [isAddSiteOpen, setIsAddSiteOpen] = React.useState(false);
  const [isExportingReport, setIsExportingReport] = React.useState(false);
  const [siteDraft, setSiteDraft] = React.useState({
    site: "",
    kind: "HOUSE_BUILDING" as DevelopmentAppraisalKind,
    country: "",
    county: "",
  });
  const allOpportunities = React.useMemo<LandOpportunity[]>(() => {
    const grouped = new Map<string, DevelopmentAppraisal[]>();
    appraisals.forEach((appraisal) =>
      grouped.set(siteGroupKey(appraisal), [
        ...(grouped.get(siteGroupKey(appraisal)) || []),
        appraisal,
      ]),
    );
    return Array.from(grouped.entries())
      .map(([groupKey, versions]) => {
        const sortedVersions = versions
          .slice()
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
        const appraisal =
          sortedVersions.find((entry) => entry.status !== "ARCHIVED") ||
          sortedVersions[0];
        return {
          appraisal,
          mapAppraisal: sortedVersions.find(hasCoordinates) || appraisal,
          versions: sortedVersions,
          groupKey,
        };
      })
      .sort((left, right) =>
        right.appraisal.updatedAt.localeCompare(left.appraisal.updatedAt),
      );
  }, [appraisals]);
  const visibleOpportunities = React.useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return allOpportunities.filter(
      ({ appraisal, versions }) =>
        (!country ||
          appraisal.siteCountry === country ||
          inferLegacyCountry(appraisal) === country) &&
        (!county || appraisal.siteCounty === county) &&
        (!query ||
          versions.some((entry) =>
            [
              entry.name,
              entry.site,
              entry.reference,
              entry.siteCounty,
              entry.siteCountry,
              entry.siteRegion,
            ]
              .filter(Boolean)
              .some((value) => value!.toLocaleLowerCase().includes(query)),
          )),
    );
  }, [allOpportunities, country, county, search]);
  const selectedInspector =
    allOpportunities.find(
      ({ appraisal }) => appraisal.id === selectedInspectorId,
    ) || null;
  React.useEffect(() => {
    if (
      !allOpportunities.some(({ appraisal }) => appraisal.id === selectedMapId)
    )
      setSelectedMapId(allOpportunities[0]?.appraisal.id ?? null);
  }, [allOpportunities, selectedMapId]);
  const updateSiteGroup = React.useCallback(
    (appraisalId: string, patch: Partial<DevelopmentAppraisal>) => {
      setAppraisals((current) => {
        const selected = current.find(
          (appraisal) => appraisal.id === appraisalId,
        );
        if (!selected) return current;
        const key = siteGroupKey(selected);
        const updatedAt = new Date().toISOString();
        return current.map((appraisal) => {
          if (siteGroupKey(appraisal) !== key) return appraisal;
          if (appraisal.frozenAt) {
            // The site decision may change without altering a frozen financial version.
            return patch.siteStatus === undefined ? appraisal : {
              ...appraisal,
              siteStatus: patch.siteStatus,
              unviableMarkedAt: patch.siteStatus === 'NOT_VIABLE' ? appraisal.unviableMarkedAt : undefined,
            };
          }
          return {
            ...appraisal,
            ...patch,
            unviableMarkedAt: patch.siteStatus && patch.siteStatus !== 'NOT_VIABLE' ? undefined : appraisal.unviableMarkedAt,
            updatedAt,
          };
        });
      });
    },
    [setAppraisals],
  );
  const updateCoordinates = React.useCallback(
    (appraisalId: string, siteLatitude: number, siteLongitude: number) =>
      updateSiteGroup(appraisalId, { siteLatitude, siteLongitude }),
    [updateSiteGroup],
  );
  const deleteSiteGroup = React.useCallback(
    (appraisalId: string) => {
      setAppraisals((current) => {
        const selected = current.find(
          (appraisal) => appraisal.id === appraisalId,
        );
        if (!selected) return current;
        const key = siteGroupKey(selected);
        return current.filter((appraisal) => appraisal.frozenAt || siteGroupKey(appraisal) !== key);
      });
      setSelectedInspectorId(null);
      setSelectedMapId(null);
    },
    [setAppraisals],
  );
  const createSite = () => {
    const site = siteDraft.site.trim();
    if (!site) return;
    const next = createDefaultAppraisal(null, appSettings, siteDraft.kind);
    const appraisal: DevelopmentAppraisal = {
      ...next,
      name: site,
      site,
      siteCountry: siteDraft.country,
      siteCounty: siteDraft.county,
    };
    setAppraisals((current) => [appraisal, ...current]);
    setSiteDraft({ site: "", kind: "HOUSE_BUILDING", country: "", county: "" });
    setIsAddSiteOpen(false);
    setSelectedInspectorId(appraisal.id);
  };
  const moveToAppraisal = (
    opportunity: LandOpportunity,
    patch: Partial<DevelopmentAppraisal>,
  ) => {
    updateSiteGroup(opportunity.appraisal.id, patch);
    if (patch.siteLandPriceKnown && patch.siteLandPrice) {
      setAppraisals((current) =>
        current.map((appraisal) =>
          appraisal.id === opportunity.appraisal.id && !appraisal.frozenAt
            ? {
                ...appraisal,
                options: appraisal.options.map((option) => ({
                  ...option,
                  calculationMode: "KNOWN_LAND_PROFIT_ON_GDV",
                  knownLandValue: patch.siteLandPrice,
                })),
              }
            : appraisal,
        ),
      );
    }
    onOpenAppraisals();
  };
  const exportStatusReport = async () => {
    setIsExportingReport(true);
    try {
      const result = await exportLandFinderStatusReport(appraisals);
      showToast({
        type: result.saved ? "success" : "info",
        message: result.saved
          ? `Land Finder status report created for ${result.siteCount} sites.`
          : "Land Finder status report export was cancelled.",
      });
    } catch (error) {
      console.error("Land Finder status report export failed", error);
      showToast({
        type: "error",
        message: error instanceof Error ? error.message : "The Land Finder status report could not be created.",
      });
    } finally {
      setIsExportingReport(false);
    }
  };
  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-app border border-slate-200 bg-white shadow-app dark:border-slate-800 dark:bg-surface-900">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-sky-50/75 px-5 py-3 dark:border-slate-800 dark:bg-sky-950/20">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-app-sm bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
            <MapPinned className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-slate-950 dark:text-slate-50">
              Land Finder
            </h1>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              A compact register of site opportunities. Select a row to inspect
              and progress it.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddSiteOpen(true)}
            className="workspace-primary-btn px-3 py-2 text-xs"
          >
            <Plus className="h-4 w-4" />
            Add site
          </button>
          <button
            type="button"
            onClick={() => setIsMapOpen(true)}
            className="workspace-secondary-btn px-3 py-2 text-xs"
          >
            <MapIcon className="h-4 w-4" />
            Map viewer
          </button>
          <button
            type="button"
            onClick={() => void exportStatusReport()}
            disabled={isExportingReport}
            className="workspace-secondary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            {isExportingReport ? "Preparing report..." : "Report"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="workspace-secondary-btn px-3 py-2 text-xs"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
      </header>
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-surface-950/45">
        <label className="relative block w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search sites"
            aria-label="Search sites"
            className="h-9 w-full rounded-app-sm border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-primary-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
          />
        </label>
        <select
          value={country}
          onChange={(event) => {
            setCountry(event.target.value);
            setCounty("");
          }}
          className="h-9 w-52 rounded-app-sm border border-slate-300 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
        >
          <option value="">All countries</option>
          {COUNTRIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={county}
          onChange={(event) => setCounty(event.target.value)}
          disabled={!country}
          className="h-9 w-52 rounded-app-sm border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
        >
          <option value="">
            {country ? "All counties" : "Choose a country first"}
          </option>
          {(
            COUNTIES_BY_COUNTRY[country as keyof typeof COUNTIES_BY_COUNTRY] ||
            []
          ).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
            <tr>
              <th className="px-5 py-2.5">Site</th>
              <th className="px-4 py-2.5">Country</th>
              <th className="px-4 py-2.5">County</th>
              <th className="px-4 py-2.5">Location</th>
              <th className="px-4 py-2.5">Site status</th>
              <th className="px-5 py-2.5 text-right">Land price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {visibleOpportunities.map((opportunity) => {
              const { appraisal, mapAppraisal } = opportunity;
              const status = siteStatusInfo(appraisal.siteStatus);
              const isOffMarket = appraisal.siteOffMarket === true;
              return (
                <tr
                  key={appraisal.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedInspectorId(appraisal.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ")
                      setSelectedInspectorId(appraisal.id);
                  }}
                  className={`cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 ${isOffMarket ? "bg-slate-100/80 opacity-55 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800/80" : "hover:bg-sky-50/60 dark:hover:bg-sky-950/15"}`}
                >
                  <td className="px-5 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      <span>{appraisal.site || appraisal.name}</span>
                      {isOffMarket ? (
                        <span className="rounded-full border border-slate-300 bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          Off market
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {appraisal.siteCountry ||
                      inferLegacyCountry(appraisal) ||
                      "-"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {appraisal.siteCounty || "-"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${hasCoordinates(mapAppraisal) ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-400"}`}
                    >
                      {hasCoordinates(mapAppraisal) ? "Mapped" : "No pin"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                    {appraisal.siteLandPriceKnown ? (
                      money(appraisal.siteLandPrice || 0)
                    ) : (
                      <span className="font-medium text-slate-400">
                        Not known
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {visibleOpportunities.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No sites match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedInspector && (
        <LandSiteInspector
          opportunity={selectedInspector}
          onClose={() => setSelectedInspectorId(null)}
          onSave={(patch) =>
            updateSiteGroup(selectedInspector.appraisal.id, patch)
          }
          onMap={() => {
            setSelectedMapId(selectedInspector.appraisal.id);
            setIsMapOpen(true);
          }}
          onMoveToAppraisal={(patch) =>
            moveToAppraisal(selectedInspector, patch)
          }
          onDelete={() => deleteSiteGroup(selectedInspector.appraisal.id)}
        />
      )}
      {isAddSiteOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-app border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-surface-900">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
                  Land Finder
                </div>
                <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">
                  Add potential site
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSiteOpen(false)}
                className="workspace-secondary-btn h-9 w-9 justify-center p-0"
                aria-label="Close add site"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="space-y-4 p-5">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Site name or address
                <input
                  value={siteDraft.site}
                  onChange={(event) =>
                    setSiteDraft((current) => ({
                      ...current,
                      site: event.target.value,
                    }))
                  }
                  placeholder="e.g. Hamilton Road, Cambuslang"
                  autoFocus
                  className="mt-1.5 h-10 w-full rounded-app-sm border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-100"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Appraisal type
                  <select
                    value={siteDraft.kind}
                    onChange={(event) =>
                      setSiteDraft((current) => ({
                        ...current,
                        kind: event.target.value as DevelopmentAppraisalKind,
                      }))
                    }
                    className="mt-1.5 h-10 w-full rounded-app-sm border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-100"
                  >
                    <option value="HOUSE_BUILDING">House building</option>
                    <option value="COMMERCIAL">Commercial</option>
                  </select>
                </label>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Country
                  <select
                    value={siteDraft.country}
                    onChange={(event) =>
                      setSiteDraft((current) => ({
                        ...current,
                        country: event.target.value,
                        county: "",
                      }))
                    }
                    className="mt-1.5 h-10 w-full rounded-app-sm border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-100"
                  >
                    <option value="">Not set</option>
                    {COUNTRIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                County
                <select
                  value={siteDraft.county}
                  onChange={(event) =>
                    setSiteDraft((current) => ({
                      ...current,
                      county: event.target.value,
                    }))
                  }
                  disabled={!siteDraft.country}
                  className="mt-1.5 h-10 w-full rounded-app-sm border border-slate-300 bg-white px-3 text-sm text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-100"
                >
                  <option value="">
                    {siteDraft.country ? "Not set" : "Choose a country first"}
                  </option>
                  {(
                    COUNTIES_BY_COUNTRY[
                      siteDraft.country as keyof typeof COUNTIES_BY_COUNTRY
                    ] || []
                  ).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddSiteOpen(false)}
                className="workspace-secondary-btn px-3 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createSite}
                disabled={!siteDraft.site.trim()}
                className="workspace-primary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Create site
              </button>
            </footer>
          </div>
        </div>
      )}
      {isMapOpen && (
        <LandMapViewer
          opportunities={allOpportunities}
          selectedId={selectedMapId}
          onSelect={setSelectedMapId}
          onClose={() => setIsMapOpen(false)}
          onUpdateCoordinates={updateCoordinates}
        />
      )}
    </section>
  );
}
