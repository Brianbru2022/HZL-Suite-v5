// Source: Allanwater Fee Summary, 22-12-22 v6, Sheet1. Source values are retained for review.
export const ENGINEERING_SOURCE_FILE = "Copy of Allanwater Fee Summary Spreadsheet - 22-12-22 v6.xlsx";
export const ENGINEERING_SOURCE_NOTES = "Kirkfieldbank has 105 houses but a stated total of 46; column G is excluded from equation fitting. Positive numeric fees are fitted to both a per-unit equation and a fixed-plus-variable equation. The model with lower leave-one-site-out prediction error is selected. A positive fixed fee reduces the effective cost per dwelling as the site grows. These are December 2022 allowances, not current quotations. 3.01 uses the source house counts; fees per house type use distinct scheduled types excluding flats. 6.02-initial is £750 per distinct house type. Additional specialist foundation designs (workbook 6.02), any included reinforcement and bar-bending schedules (6.07), and additional flatted-block foundation designs are assessed separately in Abnormals; the source references £750 per additional type and £2,000 per additional flatted block, without automatic charges. Included services are mapped to the relevant parent scope for review; confirm those fee boundaries in the appointment. Items 1.04 and 1.06 are always £0. The surveyor's fee is a separate user-entered site-specific cost under 1.04-survey and is not a source workbook fee. Workbook items 1.13 remediation strategy and verification, 1.14 stockpile testing, 2.07 off-site works design, 3.SA safety audit, 4.04 retaining wall setting out and 5.01 retaining structure design are assessed separately in Abnormals. The 3.SA workbook allowance was £1,000, the 4.04 allowance was £25 per dwelling and the 5.01 allowance was £1,000 per retaining design type in December 2022; none is an automatic cost.";
export interface EngineeringFeeDefinition { id: string; label: string; scope: string; row: number; group: number; kind: "FIXED" | "FORMULA" | "RATE" | "INCLUDED"; driver: string; rate: number | null; fixedFee:number; fit:{selected:string;alternativeFixed:number;alternativeRate:number;perUnitRate:number;looFixed:number;looPerUnit:number;observations:number;minimum:number;maximum:number} | null; parent: string | null; abnormal: boolean; siteSpecific?: boolean; zeroCost?: boolean; zeroCostNote?: string; compulsory: boolean; references: Array<{site: string; units: number; houses: number; value: string | number; cell: string; excludedFromFit: boolean}>; }
export const ENGINEERING_FEE_ITEMS: EngineeringFeeDefinition[] = [
  {
    "id": "1.01",
    "label": "Desktop study and conceptual site model",
    "scope": "Prepare a desktop survey for the site complete with a conceptual site model, site history and historical maps, including providing details of potential geo-enviromental and geo-technical constraints, and provide advice on abnormals, foundations [complete with foundation zoning plan] and other restrictions.",
    "row": 12,
    "group": 1,
    "kind": "FIXED",
    "driver": "item",
    "rate": 1500.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 1500.0,
        "cell": "C12",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 1500.0,
        "cell": "D12",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 500.0,
        "cell": "E12",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 1500.0,
        "cell": "F12",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 1500.0,
        "cell": "G12",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 1500.0,
        "cell": "H12",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 1500.0,
        "cell": "I12",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 500.0,
        "cell": "J12",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 1500.0,
        "cell": "K12",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 1500.0,
        "cell": "L12",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "1.02",
    "label": "Initial site inspection",
    "scope": "Carry out a visible site inspection before commencement to ascertain the extent of existing services, existing water courses and obstructions and or restrictions. Advise and mitigate the impact of such elements during the design phases",
    "row": 13,
    "group": 1,
    "kind": "FIXED",
    "driver": "item",
    "rate": 275.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 600.0,
        "cell": "C13",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 300.0,
        "cell": "D13",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 200.0,
        "cell": "E13",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 300.0,
        "cell": "F13",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 250.0,
        "cell": "G13",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 500.0,
        "cell": "H13",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 250.0,
        "cell": "I13",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 500.0,
        "cell": "J13",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 250.0,
        "cell": "K13",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 250.0,
        "cell": "L13",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "1.03",
    "label": "Scottish Water PDE application",
    "scope": "Make PDE application to Scottish Water",
    "row": 14,
    "group": 1,
    "kind": "FIXED",
    "driver": "item",
    "rate": 300.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 300.0,
        "cell": "C14",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 300.0,
        "cell": "D14",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 200.0,
        "cell": "E14",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 300.0,
        "cell": "F14",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 300.0,
        "cell": "G14",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 300.0,
        "cell": "H14",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 300.0,
        "cell": "I14",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 300.0,
        "cell": "J14",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 300.0,
        "cell": "K14",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 300.0,
        "cell": "L14",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "1.04",
    "label": "Topographical survey procurement",
    "scope": "Arrange for a minimum of 3 quotes to carry out and complete a topographical survey, compare quotes and advise on preferred contractor. No separate fee for this procurement activity; price the surveyor's work under 1.04-survey.",
    "row": 15,
    "group": 1,
    "kind": "FIXED",
    "driver": "item",
    "rate": 0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "zeroCost": true,
    "zeroCostNote": "£0 for arranging and reviewing survey quotations; surveyor's fee is separately priced under 1.04-survey.",
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Topo has been done - DWG required",
        "cell": "C15",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Required",
        "cell": "D15",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Topo has been done - DWG required",
        "cell": "E15",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Required",
        "cell": "F15",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Topo has been done - DWG required",
        "cell": "G15",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Topo has been done - DWG required",
        "cell": "H15",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "DWG of the topo received",
        "cell": "I15",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Required",
        "cell": "J15",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Required",
        "cell": "K15",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Completed already (DWG required)",
        "cell": "L15",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "1.04-survey",
    "label": "Topographical survey by surveyor",
    "scope": "Allow the surveyor's fee for carrying out the topographical survey and supplying the agreed survey drawings and data. Enter the quoted or provisional survey cost; the engineer's procurement activity under 1.04 remains £0.",
    "row": 15,
    "group": 1,
    "kind": "FIXED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": true,
    "siteSpecific": true,
    "compulsory": false,
    "references": []
  },
  {
    "id": "1.05",
    "label": "Ground investigation and interpretation",
    "scope": "Arrange for a detailed ground investigation report complete with soil analysis and advise on any ground matters or remediation required as a result. Provide an interprative ground investigation report.",
    "row": 16,
    "group": 1,
    "kind": "FIXED",
    "driver": "item",
    "rate": 750.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 750.0,
        "cell": "C16",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 750.0,
        "cell": "D16",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 250.0,
        "cell": "E16",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 750.0,
        "cell": "F16",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 750.0,
        "cell": "G16",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 750.0,
        "cell": "H16",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 750.0,
        "cell": "I16",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Desktop completed by Goevia in 2021",
        "cell": "J16",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 750.0,
        "cell": "K16",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "SI completed by BSA in June 2022",
        "cell": "L16",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "1.06",
    "label": "Coal mining risk assessment",
    "scope": "Obtain a Coal Mining Risk Assessment and advise on the contents of the report.",
    "row": 17,
    "group": 1,
    "kind": "FIXED",
    "driver": "item",
    "rate": 0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "zeroCost": true,
    "zeroCostNote": "£0 for obtaining and advising on the Coal Mining Risk Assessment. Any third-party assessment fee, if needed, is priced separately in Site-specific works.",
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Not required - PP granted",
        "cell": "C17",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Probably required",
        "cell": "D17",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Not required",
        "cell": "E17",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Not required",
        "cell": "F17",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Not required",
        "cell": "G17",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Not required",
        "cell": "H17",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Required",
        "cell": "I17",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Coal mining risk assessment done - High risk area - boreholes required to confirm",
        "cell": "J17",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Required",
        "cell": "K17",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Required",
        "cell": "L17",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "1.07",
    "label": "Flood risk assessment",
    "scope": "Carry out and complete a Flood Risk Assessment, complete with site visits, all as required and to the extent as to satisfy the requirements of the local authorities, Scottish Water and SEPA.",
    "row": 18,
    "group": 1,
    "kind": "FIXED",
    "driver": "item",
    "rate": 2500.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "No fluvial flood risk to site with only minor risk of pluvial flooding within site. Fee of £1500 for a Flood Risk Statement should it be requested by LA",
        "cell": "C18",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Risk of pluvial flooding noted in Margaret Parker Avenue and site entrance. Flood Risk Assessment required including assessment of overland flow pathways. £3,500",
        "cell": "D18",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Not required - Approved",
        "cell": "E18",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Not required - Approved",
        "cell": "F18",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Not required - Planning granted with no conditions in relation to Flood Risk ",
        "cell": "G18",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Approved on appeal with no condition in relation to Flood Risk. FRA prepared in 2012 and therefore could be a requirment for an updated report. £5,000 ",
        "cell": "H18",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Not required - Planning gratned with no condition in relation to Flood Risk. Unnamed draiange ditch in southern site, allow £1,500 for Flood Risk Statement should LA request one. ",
        "cell": "I18",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Not Required - Planning granted with not conditions in relation to Flood Risk",
        "cell": "J18",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "PP granted already.",
        "cell": "K18",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Not required - Planning granted with no condition in relation to Flood Risk",
        "cell": "L18",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "1.08",
    "label": "Additional DIA iterations",
    "scope": "Include up to three iterations of the DIA to reflect changes to the development layout following preperation of the report.",
    "row": 19,
    "group": 1,
    "kind": "FIXED",
    "driver": "item",
    "rate": 0.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 0.0,
        "cell": "C19",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 0.0,
        "cell": "D19",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 0.0,
        "cell": "E19",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 0.0,
        "cell": "F19",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "",
        "cell": "G19",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "",
        "cell": "H19",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "",
        "cell": "I19",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "",
        "cell": "J19",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "",
        "cell": "K19",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "",
        "cell": "L19",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "1.09",
    "label": "Utility record plans",
    "scope": "Obtain copies of all utility record plans in and adjacent to the site, issue a copy to the client and other design team members and advise on design amendments to minimise impact of existing services.",
    "row": 20,
    "group": 1,
    "kind": "FIXED",
    "driver": "item",
    "rate": 1000.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 1000.0,
        "cell": "C20",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 1000.0,
        "cell": "D20",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "SGN and SPEN issued",
        "cell": "E20",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "SGN and SPEN issued",
        "cell": "F20",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 1000.0,
        "cell": "G20",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 1000.0,
        "cell": "H20",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 1000.0,
        "cell": "I20",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 1000.0,
        "cell": "J20",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 1000.0,
        "cell": "K20",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 1000.0,
        "cell": "L20",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "1.10",
    "label": "Existing services and diversions review",
    "scope": "Review existing services and advise on any diversion works required to be undertaken",
    "row": 21,
    "group": 1,
    "kind": "FIXED",
    "driver": "item",
    "rate": 500.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 500.0,
        "cell": "C21",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 500.0,
        "cell": "D21",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 0.0,
        "cell": "E21",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 0.0,
        "cell": "F21",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 500.0,
        "cell": "G21",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 500.0,
        "cell": "H21",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 500.0,
        "cell": "I21",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 500.0,
        "cell": "J21",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 500.0,
        "cell": "K21",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 500.0,
        "cell": "L21",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "1.11",
    "label": "Scope and programme",
    "scope": "Include for a programme detailing the timeframe for the completion of each element of Schedule of Services detailed within this document",
    "row": 22,
    "group": 1,
    "kind": "FIXED",
    "driver": "item",
    "rate": 0.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 0.0,
        "cell": "C22",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 0.0,
        "cell": "D22",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 0.0,
        "cell": "E22",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 0.0,
        "cell": "F22",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 0.0,
        "cell": "G22",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 0.0,
        "cell": "H22",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 0.0,
        "cell": "I22",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 0.0,
        "cell": "J22",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 0.0,
        "cell": "K22",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 0.0,
        "cell": "L22",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "1.12",
    "label": "Site clearance drawing",
    "scope": "Provide a drawing detailing all site clearance works, including any specifications",
    "row": 23,
    "group": 1,
    "kind": "FIXED",
    "driver": "item",
    "rate": 500.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 500.0,
        "cell": "C23",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 500.0,
        "cell": "D23",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 250.0,
        "cell": "E23",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 250.0,
        "cell": "F23",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 500.0,
        "cell": "G23",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 500.0,
        "cell": "H23",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 500.0,
        "cell": "I23",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 500.0,
        "cell": "J23",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 500.0,
        "cell": "K23",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 500.0,
        "cell": "L23",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "1.15",
    "label": "WIRAS",
    "scope": "Carry out and complete WIRAS testing on site and advise on results",
    "row": 26,
    "group": 1,
    "kind": "FIXED",
    "driver": "item",
    "rate": 0.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C26",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D26",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 0.0,
        "cell": "E26",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F26",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G26",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H26",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I26",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J26",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K26",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L26",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "1.16",
    "label": "Transport assessment",
    "scope": "Carry out a full tranpsort assessment and advise on results",
    "row": 27,
    "group": 1,
    "kind": "FIXED",
    "driver": "item",
    "rate": 1500.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Completed by vendor",
        "cell": "C27",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Approved - unlikely to be required",
        "cell": "D27",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Approved - unlikely to be required",
        "cell": "E27",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Not required - Approved",
        "cell": "F27",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Approved - unlikely to be required",
        "cell": "G27",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Approved - unlikely to be required",
        "cell": "H27",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Approved - unlikely to be required",
        "cell": "I27",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Small Site - Unlikely to be required",
        "cell": "J27",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Potential for Visibility Assessment  - £1,500",
        "cell": "K27",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Small Site - Unlikely to be required",
        "cell": "L27",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "2.01",
    "label": "Roads and footways detailed design",
    "scope": "Prepare detailed design drawings and specification for roads and footways",
    "row": 30,
    "group": 2,
    "kind": "FORMULA",
    "driver": "units",
    "rate": 382.97,
    "fixedFee": 606.51,
    "fit": {
      "selected": "Fixed plus variable fee",
      "alternativeFixed": 606.51,
      "alternativeRate": 382.97,
      "perUnitRate": 408.43,
      "looFixed": 922.6,
      "looPerUnit": 930.59,
      "observations": 9,
      "minimum": 3.0,
      "maximum": 40.0
    },
    "parent": null,
    "abnormal": false,
    "compulsory": true,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 16000.0,
        "cell": "C30",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 5000.0,
        "cell": "D30",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 1500.0,
        "cell": "E30",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 5000.0,
        "cell": "F30",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 15000.0,
        "cell": "G30",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 10000.0,
        "cell": "H30",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 6800.0,
        "cell": "I30",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 2000.0,
        "cell": "J30",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 1200.0,
        "cell": "K30",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 2000.0,
        "cell": "L30",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "2.02",
    "label": "Roads tender drawings",
    "scope": "Prepare detailed tender drawings and specification for roads and footways",
    "row": 32,
    "group": 2,
    "kind": "FIXED",
    "driver": "item",
    "rate": 1000.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 1000.0,
        "cell": "C32",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 1000.0,
        "cell": "D32",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 0.0,
        "cell": "E32",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 500.0,
        "cell": "F32",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 1000.0,
        "cell": "G32",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 1000.0,
        "cell": "H32",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 1000.0,
        "cell": "I32",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 1000.0,
        "cell": "J32",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 1000.0,
        "cell": "K32",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 1000.0,
        "cell": "L32",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "2.03",
    "label": "Roads construction drawings",
    "scope": "Prepare detailed construction drawings and specification for roads and footways",
    "row": 33,
    "group": 2,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "2.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C33",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D33",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E33",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F33",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G33",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H33",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I33",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J33",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K33",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L33",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "2.04",
    "label": "Roads authority liaison",
    "scope": "Liaise with the local authorities, Allanwater, the architect, and any other third party required to complete the designs",
    "row": 34,
    "group": 2,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "2.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C34",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D34",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E34",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F34",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G34",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H34",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I34",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J34",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K34",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L34",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "2.05",
    "label": "Roads bonds and RCC sections",
    "scope": "Advise on road bonds for the site and split the application into sections not exceeding £500k road bonds. Make RCC applications for the site.",
    "row": 35,
    "group": 2,
    "kind": "FIXED",
    "driver": "item",
    "rate": 1000.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 1000.0,
        "cell": "C35",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 1000.0,
        "cell": "D35",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Not required",
        "cell": "E35",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 1000.0,
        "cell": "F35",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 2000.0,
        "cell": "G35",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 1000.0,
        "cell": "H35",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 1000.0,
        "cell": "I35",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 1000.0,
        "cell": "J35",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 1000.0,
        "cell": "K35",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 1000.0,
        "cell": "L35",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "2.06",
    "label": "Street lighting design and quotations",
    "scope": "Obtain street lighting quotations [minimum 3], review quotes and advise on preferred contractor and co-ordinate during the design phases. NOTE - FEE PROVIDED FOR DBA TO UNDERTAKE DESIGN",
    "row": 36,
    "group": 2,
    "kind": "RATE",
    "driver": "units",
    "rate": 25,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 1000.0,
        "cell": "C36",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 275.0,
        "cell": "D36",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 500.0,
        "cell": "E36",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 150.0,
        "cell": "F36",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 2000.0,
        "cell": "G36",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 625.0,
        "cell": "H36",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 425.0,
        "cell": "I36",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 125.0,
        "cell": "J36",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 75.0,
        "cell": "K36",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 125.0,
        "cell": "L36",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "3.01",
    "label": "Foul and surface water drainage design",
    "scope": "Prepare detailed design drawings and specifications for foul and surface water drainage systems for the site.",
    "row": 40,
    "group": 3,
    "kind": "FORMULA",
    "driver": "houses",
    "rate": 242.55,
    "fixedFee": 1786.3,
    "fit": {
      "selected": "Fixed plus variable fee",
      "alternativeFixed": 1786.3,
      "alternativeRate": 242.55,
      "perUnitRate": 320.16,
      "looFixed": 2587.53,
      "looPerUnit": 3089.12,
      "observations": 9,
      "minimum": 3.0,
      "maximum": 40.0
    },
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 10000.0,
        "cell": "C40",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 6000.0,
        "cell": "D40",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 1500.0,
        "cell": "E40",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 4000.0,
        "cell": "F40",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 20000.0,
        "cell": "G40",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 10000.0,
        "cell": "H40",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 5000.0,
        "cell": "I40",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 2500.0,
        "cell": "J40",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 2000.0,
        "cell": "K40",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 2000.0,
        "cell": "L40",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "3.02",
    "label": "Drainage tender drawings",
    "scope": "Prepare detailed tender drawings and specifications for foul and surface water drainage systems for the site.",
    "row": 41,
    "group": 3,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "3.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C41",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D41",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E41",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F41",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G41",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H41",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I41",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J41",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K41",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L41",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "3.03",
    "label": "Drainage construction drawings",
    "scope": "Prepare detailed construction drawings and specifications for foul and surface water drainage systems for the site.",
    "row": 42,
    "group": 3,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "3.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C42",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D42",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E42",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F42",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G42",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H42",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I42",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J42",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K42",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L42",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "3.04",
    "label": "SuDS design",
    "scope": "Review requirement for SUDS, swales and attenuations systems and include for the design drawings and specifications for the site.",
    "row": 43,
    "group": 3,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "3.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C43",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D43",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E43",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F43",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G43",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H43",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I43",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J43",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K43",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L43",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "3.05",
    "label": "Scottish Water and DIA additional works",
    "scope": "Review all requirements from Scottish Water and works associated with the DIA and include for completing the design and providing design, tender and construction drawings and specifications for these works.",
    "row": 44,
    "group": 3,
    "kind": "FIXED",
    "driver": "item",
    "rate": 250.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "None anticipated",
        "cell": "C44",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "TBC following PDE",
        "cell": "D44",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 500.0,
        "cell": "E44",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 0.0,
        "cell": "F44",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "TBC",
        "cell": "G44",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "TBC",
        "cell": "H44",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "TBC",
        "cell": "I44",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "TBC",
        "cell": "J44",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "TBC",
        "cell": "K44",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "TBC",
        "cell": "L44",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "3.06",
    "label": "Disconnector design",
    "scope": "Include for all drainage designs for disconnectors to the point of connection to the existing system",
    "row": 45,
    "group": 3,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "3.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C45",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D45",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E45",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F45",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G45",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H45",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I45",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J45",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K45",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L45",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "3.07",
    "label": "Plot drainage design",
    "scope": "With liaison with the architect, include all drainage designs or design developments from the disconnectors to and including the plots",
    "row": 46,
    "group": 3,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "3.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C46",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D46",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E46",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F46",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G46",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H46",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I46",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J46",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K46",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L46",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "3.08",
    "label": "Hydraulic calculations and technical approval",
    "scope": "Include calculatons for sewer gradients, pipe diameters, on-site flood storage for 1:200 year events and submission to Scottish Water, the local authorities and SEPA. Liaise and amend as suited to obtain technical approval.",
    "row": 47,
    "group": 3,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "3.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C47",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D47",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E47",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F47",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G47",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H47",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I47",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J47",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K47",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L47",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "3.09",
    "label": "SEPA and Scottish Water liaison",
    "scope": "Include all liasion, addressing and/or reporting to SEPA and Scottish Water",
    "row": 48,
    "group": 3,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "3.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C48",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D48",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E48",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F48",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G48",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H48",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I48",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J48",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K48",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L48",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "4.01",
    "label": "Development levels and topographical information",
    "scope": "Review topographical survey information and establish appropriate development levels in conjunction with the architect and Allanwater. ",
    "row": 52,
    "group": 4,
    "kind": "FORMULA",
    "driver": "units",
    "rate": 99.85,
    "fixedFee": 0,
    "fit": {
      "selected": "Per-unit fee",
      "alternativeFixed": 99.91,
      "alternativeRate": 95.66,
      "perUnitRate": 99.85,
      "looFixed": 189.46,
      "looPerUnit": 168.14,
      "observations": 9,
      "minimum": 3.0,
      "maximum": 40.0
    },
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 4000.0,
        "cell": "C52",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 1100.0,
        "cell": "D52",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 500.0,
        "cell": "E52",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 1000.0,
        "cell": "F52",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 5000.0,
        "cell": "G52",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 2500.0,
        "cell": "H52",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 1500.0,
        "cell": "I52",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 500.0,
        "cell": "J52",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 300.0,
        "cell": "K52",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 500.0,
        "cell": "L52",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "4.02",
    "label": "Foundation and slab setting out",
    "scope": "Provide setting out co-ordinates for foundations and slabs [all corners], drainage [under plots where raft foundations are required]. ",
    "row": 53,
    "group": 4,
    "kind": "FORMULA",
    "driver": "houses",
    "rate": 25.12,
    "fixedFee": 0,
    "fit": {
      "selected": "Per-unit fee",
      "alternativeFixed": 67.55,
      "alternativeRate": 22.18,
      "perUnitRate": 25.12,
      "looFixed": 89.3,
      "looPerUnit": 77.9,
      "observations": 9,
      "minimum": 3.0,
      "maximum": 40.0
    },
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 1000.0,
        "cell": "C53",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 250.0,
        "cell": "D53",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 100.0,
        "cell": "E53",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 200.0,
        "cell": "F53",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 1000.0,
        "cell": "G53",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 420.0,
        "cell": "H53",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 500.0,
        "cell": "I53",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 200.0,
        "cell": "J53",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 200.0,
        "cell": "K53",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 200.0,
        "cell": "L53",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "4.03",
    "label": "Fence and garden wall setting out",
    "scope": "Provide setting out co-ordinates for all site fencing, garden walls",
    "row": 54,
    "group": 4,
    "kind": "FORMULA",
    "driver": "units",
    "rate": 24.77,
    "fixedFee": 0,
    "fit": {
      "selected": "Per-unit fee",
      "alternativeFixed": 72.21,
      "alternativeRate": 21.74,
      "perUnitRate": 24.77,
      "looFixed": 92.59,
      "looPerUnit": 84.19,
      "observations": 9,
      "minimum": 3.0,
      "maximum": 40.0
    },
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 1000.0,
        "cell": "C54",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 250.0,
        "cell": "D54",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 100.0,
        "cell": "E54",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 200.0,
        "cell": "F54",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 1000.0,
        "cell": "G54",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 500.0,
        "cell": "H54",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 500.0,
        "cell": "I54",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 200.0,
        "cell": "J54",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 200.0,
        "cell": "K54",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 200.0,
        "cell": "L54",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "4.05",
    "label": "External civil works setting out",
    "scope": "Provide all level and setting out information associated with external civil works",
    "row": 56,
    "group": 4,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "4.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C56",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D56",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E56",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F56",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G56",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H56",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I56",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J56",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K56",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L56",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "4.06",
    "label": "Roads and planning layout coordination",
    "scope": "Include for detailed discussions with the roads department, planning and the architect in respect of the internal road/parking layout. The designs should be completed taking cognaisance of adequate parking provision, bin travel distances, footpath widths etc.",
    "row": 57,
    "group": 4,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "4.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C57",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D57",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E57",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F57",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G57",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H57",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I57",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J57",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K57",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L57",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "4.07",
    "label": "Swept path analysis",
    "scope": "Include the provision of swept path analysis.",
    "row": 58,
    "group": 4,
    "kind": "FORMULA",
    "driver": "units",
    "rate": 3.31,
    "fixedFee": 360.66,
    "fit": {
      "selected": "Fixed plus variable fee",
      "alternativeFixed": 360.66,
      "alternativeRate": 3.31,
      "perUnitRate": 16.03,
      "looFixed": 178.24,
      "looPerUnit": 255.99,
      "observations": 4,
      "minimum": 11.0,
      "maximum": 40.0
    },
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 500.0,
        "cell": "C58",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 500.0,
        "cell": "D58",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 0.0,
        "cell": "E58",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 0.0,
        "cell": "F58",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 1000.0,
        "cell": "G58",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 500.0,
        "cell": "H58",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 250.0,
        "cell": "I58",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 0.0,
        "cell": "J58",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 0.0,
        "cell": "K58",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 0.0,
        "cell": "L58",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "4.08",
    "label": "Cut and fill analysis",
    "scope": "Carry out and complete a detailed cut and fill drawing and analysis at\ndesign, tender and construction stages, always to maximise effiency.",
    "row": 59,
    "group": 4,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "3.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "included in 3.01",
        "cell": "C59",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "included in 3.01",
        "cell": "D59",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E59",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F59",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G59",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H59",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I59",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J59",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K59",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L59",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "4.09",
    "label": "Cross sections",
    "scope": "Provide cross-sections through the site showing variances from existing level to proposed levels following the completion of the cut and fill analysis all at design, tender and construction phases",
    "row": 60,
    "group": 4,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "3.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "included in 3.01",
        "cell": "C60",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "included in 3.01",
        "cell": "D60",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E60",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F60",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G60",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H60",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I60",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J60",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K60",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L60",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "4.10",
    "label": "Earthworks specification",
    "scope": "Provide an earthworks specification",
    "row": 61,
    "group": 4,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "3.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "included in 3.01",
        "cell": "C61",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "included in 3.01",
        "cell": "D61",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E61",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F61",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G61",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H61",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I61",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J61",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K61",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L61",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "6.01",
    "label": "Foundation advice and detailed design",
    "scope": "Advise on the foundation types and provide details design drawings at design, tender and construction stages ",
    "row": 67,
    "group": 6,
    "kind": "RATE",
    "driver": "units",
    "rate": 30,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "£30/unit",
        "cell": "C67",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "£30/unit",
        "cell": "D67",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "£30/unit",
        "cell": "E67",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "£30/unit",
        "cell": "F67",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "£30/unit",
        "cell": "G67",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "£30/unit",
        "cell": "H67",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "£30/unit",
        "cell": "I67",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "£30/unit",
        "cell": "J67",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "£30/unit",
        "cell": "K67",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "£30/unit",
        "cell": "L67",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "6.02-initial",
    "label": "Foundation design per house type",
    "scope": "Provide the standard foundation design for each distinct house type in the schedule. Additional specialist foundation designs outside those house types are separately allocated to Abnormals.",
    "row": 68,
    "group": 6,
    "kind": "RATE",
    "driver": "types",
    "rate": 750,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": true,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "£750/housetype",
        "cell": "C68",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "£750/housetype",
        "cell": "D68",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "£750/housetype",
        "cell": "E68",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "£750/housetype",
        "cell": "F68",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "£750/housetype",
        "cell": "G68",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "£750/housetype & £2,000/flatted block",
        "cell": "H68",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "£750/housetype",
        "cell": "I68",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "£750/housetype",
        "cell": "J68",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "£750/housetype",
        "cell": "K68",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "£750/housetype",
        "cell": "L68",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "6.03",
    "label": "Foundation and slab general arrangements",
    "scope": "Prepare general arrangement drawings and specifications for the foundations, ground slabs and the like, together with any relevant bearing capacities and working loads. ",
    "row": 69,
    "group": 6,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "6.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C69",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D69",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E69",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F69",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G69",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H69",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I69",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J69",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K69",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L69",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "6.04",
    "label": "Building warrant and Premier Guarantee submissions",
    "scope": "Prepare and submit drawings and details in support of Building Warrant and Premier Guarantee. Include for amends to the designs and issue of revised drawings as required by the local authority and Premier Guarantee",
    "row": 70,
    "group": 6,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "6.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C70",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D70",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E70",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F70",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G70",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H70",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I70",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J70",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K70",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L70",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "6.05",
    "label": "DPM, gas barrier and tanking liaison",
    "scope": "Liaise with the Architect in relation to any damp proof membrane, gas membrane and tanking designs Required",
    "row": 71,
    "group": 6,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "6.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "",
        "cell": "C71",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D71",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E71",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F71",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G71",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H71",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I71",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J71",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K71",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L71",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "6.06",
    "label": "Gas membrane design",
    "scope": "Include for the design of any gas membranes as required by the local authority, always advising on potential options to maximise efficiency.",
    "row": 72,
    "group": 6,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "6.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C72",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D72",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E72",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F72",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G72",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H72",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I72",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J72",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K72",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L72",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "7.01",
    "label": "Timber kit design",
    "scope": "Provide detailed timber kit designs including all necessary calculations, drawings and specifications ",
    "row": 76,
    "group": 7,
    "kind": "RATE",
    "driver": "types",
    "rate": 1300,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "£1,300/housetype",
        "cell": "C76",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "£1,300/housetype",
        "cell": "D76",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "£1,300/housetype",
        "cell": "E76",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "£1,300/housetype",
        "cell": "F76",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "£1,300/housetype",
        "cell": "G76",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "£1,300/housetype & £800/flatted unit",
        "cell": "H76",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "£1,300/housetype",
        "cell": "I76",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "£1,300/housetype",
        "cell": "J76",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "£1,300/housetype",
        "cell": "K76",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "£1,300/housetype",
        "cell": "L76",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "7.02",
    "label": "Superstructure general arrangements and steelwork",
    "scope": "Conclude superstructure general arrangement drawings including all loadbearing elements, lintels etc, complete with design of any necessary steelwork",
    "row": 77,
    "group": 7,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "7.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C77",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D77",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E77",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F77",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G77",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H77",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I77",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J77",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K77",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L77",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "7.03",
    "label": "SER certificate",
    "scope": "Submit the necessary SER certification and structural drawings and structural drawings in respect of Building Warrant approvals to the Architect for submission purposes.",
    "row": 78,
    "group": 7,
    "kind": "FIXED",
    "driver": "item",
    "rate": 300,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 300.0,
        "cell": "C78",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 300.0,
        "cell": "D78",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 300.0,
        "cell": "E78",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 300.0,
        "cell": "F78",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 300.0,
        "cell": "G78",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 300.0,
        "cell": "H78",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 300.0,
        "cell": "I78",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 300.0,
        "cell": "J78",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 300.0,
        "cell": "K78",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 300.0,
        "cell": "L78",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "7.04",
    "label": "SER specialist design checks",
    "scope": "Undertake SER check on all specialist contractors designs including timber kit, roof trusses, steelwork and precast design. ",
    "row": 79,
    "group": 7,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "7.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C79",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D79",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E79",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F79",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G79",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H79",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I79",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J79",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K79",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L79",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "7.05",
    "label": "Fabrication compatibility review",
    "scope": "Review all subcontractors fabrication and construction drawings to ensure compatibility with the design. ",
    "row": 80,
    "group": 7,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "7.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C80",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D80",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E80",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F80",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G80",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H80",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I80",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J80",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K80",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L80",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "8.01",
    "label": "Scottish Water adoption",
    "scope": "Co-ordinate and manage the adoption process to Scottish Water up to the point of full adoption",
    "row": 83,
    "group": 8,
    "kind": "FIXED",
    "driver": "item",
    "rate": 500.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 1500.0,
        "cell": "C83",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 1000.0,
        "cell": "D83",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 0.0,
        "cell": "E83",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 0.0,
        "cell": "F83",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 2000.0,
        "cell": "G83",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 500.0,
        "cell": "H83",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 500.0,
        "cell": "I83",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 500.0,
        "cell": "J83",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 500.0,
        "cell": "K83",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 500.0,
        "cell": "L83",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "8.02",
    "label": "Roads adoption",
    "scope": "Co-ordinate and manage the adoption process to the roads department up to the point of full adoption by the council. ",
    "row": 84,
    "group": 8,
    "kind": "FIXED",
    "driver": "item",
    "rate": 750.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 1500.0,
        "cell": "C84",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 1000.0,
        "cell": "D84",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 500.0,
        "cell": "E84",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 0.0,
        "cell": "F84",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 1000.0,
        "cell": "G84",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 1000.0,
        "cell": "H84",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 1000.0,
        "cell": "I84",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 500.0,
        "cell": "J84",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 500.0,
        "cell": "K84",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 500.0,
        "cell": "L84",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "8.03",
    "label": "Planning close-out",
    "scope": "Co-ordinate with the architect to ensure all outstanding planning conditions are cleared by the council.",
    "row": 85,
    "group": 8,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "2.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C85",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D85",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E85",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F85",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G85",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H85",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I85",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J85",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K85",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L85",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "9.01",
    "label": "Paper and electronic drawings",
    "scope": "Provide two paper copies and unlimited electronic drawings at design, tender and construction phases. Provide an additional two paper copies of any drawing amendments during each of these phases. ",
    "row": 88,
    "group": 9,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "2.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C88",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D88",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E88",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F88",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G88",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H88",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I88",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J88",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K88",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L88",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "9.02",
    "label": "Design team meetings (up to eight)",
    "scope": "Allow for Eight attendances to design team meeting",
    "row": 89,
    "group": 9,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "2.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "",
        "cell": "C89",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "",
        "cell": "D89",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E89",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F89",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G89",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H89",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I89",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J89",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K89",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L89",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "9.03",
    "label": "Site visit package (four visits)",
    "scope": "Allow for four attendances to site during the construction phase ",
    "row": 90,
    "group": 9,
    "kind": "FIXED",
    "driver": "item",
    "rate": 1200.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 2000.0,
        "cell": "C90",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 1200.0,
        "cell": "D90",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 800.0,
        "cell": "E90",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 2000.0,
        "cell": "F90",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 1000.0,
        "cell": "G90",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 2000.0,
        "cell": "H90",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 1000.0,
        "cell": "I90",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 1200.0,
        "cell": "J90",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 1000.0,
        "cell": "K90",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 1200.0,
        "cell": "L90",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "9.04",
    "label": "Additional meeting or visit",
    "scope": "Allow for additional attendances to design team or other meetings [cost per visit] ",
    "row": 91,
    "group": 9,
    "kind": "RATE",
    "driver": "visits",
    "rate": 300.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 300.0,
        "cell": "C91",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 300.0,
        "cell": "D91",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 300.0,
        "cell": "E91",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 300.0,
        "cell": "F91",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 300.0,
        "cell": "G91",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 300.0,
        "cell": "H91",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 300.0,
        "cell": "I91",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 300.0,
        "cell": "J91",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 300.0,
        "cell": "K91",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 300.0,
        "cell": "L91",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "9.05",
    "label": "Additional site visit",
    "scope": "Allow for additional attendances to site during the construction phase [cost per visit]",
    "row": 92,
    "group": 9,
    "kind": "RATE",
    "driver": "visits",
    "rate": 300.0,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 500.0,
        "cell": "C92",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 300.0,
        "cell": "D92",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 200.0,
        "cell": "E92",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 500.0,
        "cell": "F92",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 250.0,
        "cell": "G92",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 500.0,
        "cell": "H92",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 250.0,
        "cell": "I92",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 300.0,
        "cell": "J92",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 250.0,
        "cell": "K92",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 300.0,
        "cell": "L92",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "9.06",
    "label": "RFIs and design revisions",
    "scope": "Allow for all necessary design revisions or clarifications as a result of RFI's issued by the Allanwater or their design team",
    "row": 93,
    "group": 9,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "2.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C93",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D93",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E93",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F93",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G93",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H93",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I93",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J93",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K93",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L93",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "9.07",
    "label": "SER charges",
    "scope": "Detail charges for SER submission ",
    "row": 94,
    "group": 9,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "7.03",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C94",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D94",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E94",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F94",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G94",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H94",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I94",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J94",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K94",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L94",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "9.08",
    "label": "Premier Guarantee liaison",
    "scope": "Include for all liaisons with Premier Guarantee including clarifications on designs and calculations ",
    "row": 95,
    "group": 9,
    "kind": "FIXED",
    "driver": "item",
    "rate": 1000,
    "fixedFee": 0,
    "fit": null,
    "parent": null,
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": 1000.0,
        "cell": "C95",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": 1000.0,
        "cell": "D95",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": 1000.0,
        "cell": "E95",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": 1000.0,
        "cell": "F95",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": 1000.0,
        "cell": "G95",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": 1000.0,
        "cell": "H95",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": 1000.0,
        "cell": "I95",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 1000.0,
        "cell": "J95",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": 1000.0,
        "cell": "K95",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": 1000.0,
        "cell": "L95",
        "excludedFromFit": false
      }
    ]
  },
  {
    "id": "9.09",
    "label": "Third-party design compliance",
    "scope": "Review all 3rd party designs from consultants and contractors to ensure compliance with design",
    "row": 96,
    "group": 9,
    "kind": "INCLUDED",
    "driver": "item",
    "rate": null,
    "fixedFee": 0,
    "fit": null,
    "parent": "2.01",
    "abnormal": false,
    "compulsory": false,
    "references": [
      {
        "site": "Newton St Boswells",
        "units": 40.0,
        "houses": 40.0,
        "value": "Included",
        "cell": "C96",
        "excludedFromFit": false
      },
      {
        "site": "Western Road, Kilmarnock",
        "units": 11.0,
        "houses": 11.0,
        "value": "Included",
        "cell": "D96",
        "excludedFromFit": false
      },
      {
        "site": "Clarkston",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "E96",
        "excludedFromFit": false
      },
      {
        "site": "Baldovan, Dundee",
        "units": 6.0,
        "houses": 6.0,
        "value": "Included",
        "cell": "F96",
        "excludedFromFit": false
      },
      {
        "site": "Kirkfieldbank",
        "units": 46.0,
        "houses": 105.0,
        "value": "Included",
        "cell": "G96",
        "excludedFromFit": true
      },
      {
        "site": "Aucheblae",
        "units": 25.0,
        "houses": 21.0,
        "value": "Included",
        "cell": "H96",
        "excludedFromFit": false
      },
      {
        "site": "Glenmavis",
        "units": 17.0,
        "houses": 17.0,
        "value": "Included",
        "cell": "I96",
        "excludedFromFit": false
      },
      {
        "site": "Kippielaw Hatchary, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "J96",
        "excludedFromFit": false
      },
      {
        "site": "Lanark",
        "units": 3.0,
        "houses": 3.0,
        "value": "Included",
        "cell": "K96",
        "excludedFromFit": false
      },
      {
        "site": "Newmills Road, Dalkeith",
        "units": 5.0,
        "houses": 5.0,
        "value": "Included",
        "cell": "L96",
        "excludedFromFit": false
      }
    ]
  }
];
