export type TradeAssignTarget = {
  id: string;
  label: string;
  kind: 'BILL' | 'SECTION' | 'PAGE';
  sectionId?: string;
  pageId?: string;
};

export type PromptHandler = (type: string, context?: any) => void;
