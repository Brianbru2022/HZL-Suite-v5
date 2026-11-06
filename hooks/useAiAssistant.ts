
import React, { useCallback, useState } from 'react';
import { PromptType, AIClarification, Project, BoQItem, DimensionRow, ItemLibrary, PromptConfigContext, ItemType, AiGenerationOptions, AiMeasurementTarget, AiMeasurementItem } from '../types';
import { calculateItemQuantity, getSectionItems, reindexBillReferences, safeMul } from '../utils/calculations';
import { generateId } from '../utils/generateId';
import { feedbackError } from '../utils/feedback';
import { createSnapshotEntry, prependSnapshot, shouldAutoSnapshot } from '../utils/projectSnapshots';
import { appendLibraryItems } from '../utils/libraryRepository';

interface UseAiAssistantProps {
  currentProject: Project | undefined;
  libraries: ItemLibrary[];
  setLibraries: React.Dispatch<React.SetStateAction<ItemLibrary[]>>;
  updateProject: (id: string, data: Partial<Project>) => void;
  setIsPromptOpen: (val: boolean) => void;
  showToast?: (opts: { type: 'success' | 'error' | 'info'; message: string; duration?: number }) => void;
}

type AiFilePayload = { name: string; mimeType: string; data: string };
export type AiClarificationPhase = 'items' | 'measurements';

const MAX_AI_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function loadGeminiService() {
  return import('../services/geminiService');
}

/** Normalize text for duplicate matching: lowercase, trim, collapse spaces. */
function normalizeDescription(s: string): string {
  return (s ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Find first existing item matching type and normalized description, whose index is not in usedIndices. */
function findMatchingIndex<T extends { type: ItemType; description: string; reference?: string }>(
  items: T[],
  g: { type: ItemType; description: string; reference?: string },
  usedIndices: Set<number>
): number | null {
  const gNorm = normalizeDescription(g.description);
  for (let i = 0; i < items.length; i++) {
    if (usedIndices.has(i)) continue;
    const it = items[i];
    if (it.type !== g.type) continue;
    if (normalizeDescription(it.description) !== gNorm) continue;
    if (g.reference != null && g.reference !== '' && (it.reference ?? '') !== g.reference) continue;
    return i;
  }
  return null;
}

function buildAiDimensionRows(defaultDims?: { length?: number; width?: number; height?: number }, includeMeasurements?: boolean): DimensionRow[] {
  if (!includeMeasurements || !defaultDims) return [];
  return [{
    id: generateId(),
    multiplier: 1,
    length: defaultDims.length || 0,
    width: defaultDims.width || 0,
    height: defaultDims.height || 0,
    comment: 'AI Estimated',
    isDeduction: false,
  }];
}

function getResolvedAiOptions(
  explicitOptions?: AiGenerationOptions,
  contextOptions?: AiGenerationOptions
): AiGenerationOptions {
  return {
    includeRates: explicitOptions?.includeRates ?? contextOptions?.includeRates ?? true,
    includeMeasurements: explicitOptions?.includeMeasurements ?? contextOptions?.includeMeasurements ?? false,
  };
}

function isPricedItemType(type: ItemType): boolean {
  return ['PRICED', 'PROVISIONAL_SUM', 'PC_SUM'].includes(type);
}

function readFileAsBase64(file: File, maxBytes: number): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(`File "${file.name}" is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject('Failed to read file.');
        return;
      }
      const base64 = result.split(',')[1];
      if (!base64) {
        reject('Failed to encode file.');
        return;
      }
      resolve({ data: base64, mimeType: file.type || 'application/octet-stream' });
    };
    reader.onerror = () => {
      reject(reader.error?.message || 'Failed to read file.');
    };
    reader.readAsDataURL(file);
  });
}

export const useAiAssistant = ({ currentProject, libraries, setLibraries, updateProject, setIsPromptOpen, showToast }: UseAiAssistantProps) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAskingAiQuestions, setIsAskingAiQuestions] = useState(false);
  const [aiClarification, setAiClarification] = useState<AIClarification | null>(null);
  const [aiClarificationPhase, setAiClarificationPhase] = useState<AiClarificationPhase>('items');
  const [aiAnswers, setAiAnswers] = useState<string>("");
  const [aiConversationHistory, setAiConversationHistory] = useState<string[]>([]);
  const [aiItemFiles, setAiItemFiles] = useState<AiFilePayload[]>([]);
  const [aiMeasurementFiles, setAiMeasurementFiles] = useState<AiFilePayload[]>([]);
  const [aiMeasurementTargets, setAiMeasurementTargets] = useState<AiMeasurementTarget[]>([]);
  
  const [promptConfig, setPromptConfig] = useState<{
    type: PromptType; title: string; placeholder: string; defaultValue: string; context?: PromptConfigContext; showStandardToggle?: boolean; defaultStandard?: 'SMM7'|'NRM2';
  }>({ type: 'CREATE_PROJECT', title: '', placeholder: '', defaultValue: '' });

  const aiFiles = aiClarificationPhase === 'measurements' ? aiMeasurementFiles : aiItemFiles;
  const setAiFiles = useCallback((
    value: AiFilePayload[] | ((prev: AiFilePayload[]) => AiFilePayload[])
  ) => {
    const applyUpdate = (prev: AiFilePayload[]) => typeof value === 'function'
      ? (value as (prev: AiFilePayload[]) => AiFilePayload[])(prev)
      : value;

    if (aiClarificationPhase === 'measurements') {
      setAiMeasurementFiles((prev) => applyUpdate(prev));
      return;
    }
    setAiItemFiles((prev) => applyUpdate(prev));
  }, [aiClarificationPhase]);

  const resetAiWorkflowFiles = useCallback(() => {
    setAiItemFiles([]);
    setAiMeasurementFiles([]);
  }, []);

  const appendFilesToPhase = useCallback(async (phase: AiClarificationPhase, incomingFiles: File[]) => {
    if (!showToast || incomingFiles.length === 0) return;

    const appendToPhase = (nextFile: AiFilePayload) => {
      if (phase === 'measurements') {
        setAiMeasurementFiles((prev) => [...prev, nextFile]);
        return;
      }
      setAiItemFiles((prev) => [...prev, nextFile]);
    };

    for (const file of incomingFiles) {
      try {
        const { data, mimeType } = await readFileAsBase64(file, MAX_AI_FILE_SIZE_BYTES);
        appendToPhase({ name: file.name, mimeType, data });
      } catch (err) {
        showToast({ type: 'error', message: feedbackError(`Uploading "${file.name}" for AI`, err, 'Please try a smaller or different file.') });
      }
    }
  }, [showToast]);

  const handleFileUpload = useCallback(async (phase: AiClarificationPhase, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    await appendFilesToPhase(phase, files);
  }, [appendFilesToPhase]);

  const handlePaste = useCallback(async (phase: AiClarificationPhase, e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    if (!showToast) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          try {
            await appendFilesToPhase(phase, [new File([file], `Snapshot ${new Date().toLocaleTimeString()}.png`, { type: file.type || 'image/png' })]);
          } catch (err) {
            showToast({ type: 'error', message: feedbackError('Pasting image context for AI', err, 'Please try pasting the image again.') });
          }
        }
        break; // only first image
      }
    }
  }, [appendFilesToPhase, showToast]);

  const handleAiHierarchyGeneration = async (
    prompt: string, 
    answers: string, 
    standardOverride?: 'SMM7'|'NRM2',
    history?: string[],
    files?: {name: string, mimeType: string, data: string}[],
    aiOptions?: AiGenerationOptions
  ) => {
    const { libId, folderId, sectionId, pageId, billId, standard, aiOptions: contextAiOptions } = promptConfig.context ?? {};
    const finalStandard = standardOverride || standard || currentProject?.measurementStandard || 'SMM7';
    const resolvedAiOptions = getResolvedAiOptions(aiOptions, contextAiOptions);
    const includeRates = resolvedAiOptions.includeRates;
    const includeMeasurements = resolvedAiOptions.includeMeasurements;
    const hierarchyGenerationOptions: AiGenerationOptions = includeMeasurements
      ? { ...resolvedAiOptions, includeMeasurements: false }
      : resolvedAiOptions;

    setIsAiLoading(true);
    setIsAskingAiQuestions(false);
    setAiClarificationPhase('items');
    setPromptConfig((prev) => ({
      ...prev,
      context: { ...prev.context, aiPhase: 'items' },
    }));

    try {
      let existingContext: string[] = [];
      
      // Extract Context for AI Awareness
      if (libId && folderId && sectionId) {
        const sect = libraries.find(l => l.id === libId)?.folders.find(f => f.id === folderId)?.sections.find(s => s.id === sectionId);
        existingContext = pageId
          ? sect?.pages?.find((page) => page.id === pageId)?.items.map(i => i.description) ?? []
          : sect?.items.map(i => i.description) ?? [];
      } else if (billId && sectionId && currentProject) {
        const sect = currentProject.bills.find(b => b.id === billId)?.sections.find(s => s.id === sectionId);
        existingContext = sect ? getSectionItems(sect).map(i => i.description) : [];
      }
      
      // Fallback for empty answer if files are provided
      const finalAnswers = (!answers && files && files.length > 0) ? "See attached files for details." : answers;

      const { generateBoQHierarchy } = await loadGeminiService();
      const result = await generateBoQHierarchy(prompt, finalStandard, existingContext, finalAnswers, history, files, hierarchyGenerationOptions);
      
      if ('error' in result) {
        const msg = result.error;
        if (showToast) showToast({ type: 'error', message: feedbackError('AI hierarchy generation', msg, 'Please try the request again.') });
        setIsAiLoading(false);
        return;
      }
      const generated = result.data;
      
      if (!generated || generated.length === 0) {
        console.warn("AI returned no items.");
        setIsAiLoading(false);
        return;
      }

      // LIBRARY MODE UPDATE
      if (libId && folderId && sectionId) {
        const additions: BoQItem[] = generated.map((g) => ({
          id: generateId(),
          type: g.type,
          description: g.description,
          unit: g.unit || '',
          reference: '',
          rate: includeRates ? (g.estimatedRate || 0) : 0,
          quantity: 0,
          total: 0,
          dimensionRows: buildAiDimensionRows(g.defaultDims, includeMeasurements),
        }));
        await appendLibraryItems({ libraryId: libId, folderId, sectionId, pageId }, additions);
        setLibraries((prev: ItemLibrary[]) => prev.map((library) => (
          library.id !== libId
            ? library
            : {
                ...library,
                itemCount: (library.itemCount || 0) + additions.length,
                folders: library.folders.map((folder) => (
                  folder.id !== folderId
                    ? folder
                    : {
                        ...folder,
                        itemCount: (folder.itemCount || 0) + additions.length,
                        sections: folder.sections.map((section) => (
                          section.id !== sectionId
                            ? section
                            : { ...section, itemCount: (section.itemCount || 0) + additions.length }
                        )),
                      }
                )),
              }
        )));
      } 
      // PROJECT BILL MODE UPDATE (rewrite in place instead of duplicating)
      else if (billId && sectionId && currentProject) {
        const section = currentProject.bills.find(b => b.id === billId)?.sections.find(s => s.id === sectionId);
        const existingItems = section?.pages && section.pages.length > 0
          ? section.pages.flatMap((p) => p.items || [])
          : (section?.items ?? []);
        const updatesById: Record<string, BoQItem> = {};
        const additions: BoQItem[] = [];
        const usedIndices = new Set<number>();
        let phaseTwoTargets: AiMeasurementTarget[] = [];

        generated.forEach(g => {
          const idx = findMatchingIndex(existingItems, g, usedIndices);
          if (idx !== null) {
            usedIndices.add(idx);
            const match = existingItems[idx];
            const locks = match.aiLocks || { description: false, rate: false, measurements: false };
            const resolvedUnit = g.unit ?? match.unit ?? '';
            const dims: DimensionRow[] = locks.measurements
              ? (match.dimensionRows ?? [])
              : includeMeasurements
              ? [...(match.dimensionRows ?? []), ...buildAiDimensionRows(g.defaultDims, includeMeasurements)]
              : (match.dimensionRows ?? []);
            const nextQuantity = locks.measurements
              ? match.quantity
              : isPricedItemType(g.type) && includeMeasurements && dims.length > 0
              ? calculateItemQuantity(dims, resolvedUnit)
              : match.quantity;
            const nextRate = locks.rate
              ? (match.rate ?? 0)
              : includeRates
                ? (g.estimatedRate ?? match.rate ?? 0)
                : (match.rate ?? 0);
            updatesById[match.id] = {
              ...match,
              description: locks.description ? match.description : g.description,
              unit: resolvedUnit,
              quantity: isPricedItemType(g.type) ? nextQuantity : match.quantity,
              rate: nextRate,
              total: isPricedItemType(g.type) ? safeMul(isPricedItemType(g.type) ? nextQuantity : match.quantity, nextRate) : match.total,
              dimensionRows: dims,
            };
          } else {
            const resolvedUnit = g.unit || '';
            const dims: DimensionRow[] = buildAiDimensionRows(g.defaultDims, includeMeasurements);
            const quantity = isPricedItemType(g.type)
              ? (includeMeasurements && dims.length > 0 ? calculateItemQuantity(dims, resolvedUnit) : 1)
              : 0;
            const rate = includeRates ? (g.estimatedRate || 0) : 0;
            additions.push({
              id: generateId(),
              type: g.type,
              description: g.description,
              unit: resolvedUnit,
              reference: '',
              quantity,
              rate,
              total: safeMul(quantity, rate),
              dimensionRows: dims
            });
          }
        });

        const updatedProject = {
          ...currentProject,
          bills: currentProject.bills.map(b =>
            b.id === billId
              ? {
                  ...b,
                  sections: b.sections.map(s =>
                    s.id === sectionId
                      ? s.pages && s.pages.length > 0
                        ? {
                            ...s,
                            pages: s.pages.map((page, pageIndex) => ({
                              ...page,
                              items: [
                                ...(page.items || []).map((i) => updatesById[i.id] ?? i),
                                ...(pageIndex === s.pages!.length - 1 ? additions : []),
                              ],
                            })),
                          }
                        : {
                            ...s,
                            items: [
                              ...s.items.map(i => updatesById[i.id] ?? i),
                              ...additions,
                            ],
                          }
                      : s
                  ),
                }
              : b
          ),
        };

        const targetBillIndex = updatedProject.bills.findIndex(b => b.id === billId);
        if (targetBillIndex !== -1) {
          updatedProject.bills[targetBillIndex] = reindexBillReferences(
            updatedProject.bills[targetBillIndex],
            targetBillIndex
          );
        }

        if (includeMeasurements) {
          const updatedSection = updatedProject.bills
            .find((bill) => bill.id === billId)
            ?.sections.find((entry) => entry.id === sectionId);
          phaseTwoTargets = (updatedSection ? getSectionItems(updatedSection) : [])
            .filter((item) => isPricedItemType(item.type))
            .map((item) => ({
              description: item.description,
              unit: item.unit,
              type: item.type,
            }));
        }

        const snapshotPatch = shouldAutoSnapshot(currentProject)
          ? {
              snapshots: prependSnapshot(
                currentProject.snapshots,
                createSnapshotEntry(
                  currentProject,
                  `Before AI bill generation ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
                  'Automatic restore point created before AI bulk generation updated the live bill.'
                )
              ),
            }
          : {};

        updateProject(currentProject.id, { bills: updatedProject.bills, ...snapshotPatch });

        if (includeMeasurements && phaseTwoTargets.length > 0) {
          setAiMeasurementTargets(phaseTwoTargets);
          setAiClarificationPhase('measurements');
          setAiMeasurementFiles([]);
          setAiConversationHistory([]);
          setAiAnswers('');
          setPromptConfig((prev) => ({
            ...prev,
            context: { ...prev.context, aiPhase: 'measurements' },
          }));

          const { captureBoQMeasurements } = await loadGeminiService();
          const measurementStep = await captureBoQMeasurements(phaseTwoTargets, [], []);
          if ('error' in measurementStep) {
            if (showToast) {
              showToast({ type: 'error', message: feedbackError('AI measurement setup', measurementStep.error, 'Please try the measurement phase again.') });
            }
          } else if (measurementStep.data.needsClarification) {
            setAiClarification({
              needsClarification: true,
              phase: 'measurements',
              title: 'Phase 2 • Dimensions',
              description: 'Upload measurement drawings or answer the next specific measurement question. These files are kept separate from phase 1 item/specification drawings.',
              questions: measurementStep.data.question ? [measurementStep.data.question] : ['Please upload the measurement drawings for this section.'],
              canSkip: true,
            });
            setIsAskingAiQuestions(true);
          }
        }
      }
    } catch (e) {
      console.error("Critical AI Error", e);
      if (showToast) showToast({ type: 'error', message: feedbackError('AI hierarchy generation', e, 'Please try the request again.') });
    } finally {
      setIsAiLoading(false);
    }
  };

  const submitAiClarification = async (combinedAnswers?: string) => {
     const answersToUse = (combinedAnswers != null && combinedAnswers !== '') ? combinedAnswers : aiAnswers;
     if (!answersToUse && aiFiles.length === 0) return;
     const resolvedAiOptions = getResolvedAiOptions(undefined, promptConfig.context?.aiOptions);
     
     setIsAiLoading(true);
     
     const userEntry = `User Answer: ${answersToUse}`;
     const newHistory = [...aiConversationHistory, userEntry];
     
     // Only log file upload if files were actually present
     if (aiFiles.length > 0) {
        newHistory.push(`[Context: User provided ${aiFiles.length} file(s) for analysis]`);
     }

     if (aiClarificationPhase === 'measurements') {
       const { captureBoQMeasurements } = await loadGeminiService();
       const measurementResult = await captureBoQMeasurements(aiMeasurementTargets, newHistory, aiMeasurementFiles);

       if ('error' in measurementResult) {
         if (showToast) showToast({ type: 'error', message: feedbackError('AI measurement capture', measurementResult.error, 'Please try the measurement phase again.') });
         setIsAiLoading(false);
         return;
       }

       if (measurementResult.data.needsClarification) {
         setAiClarification({
           needsClarification: true,
           phase: 'measurements',
           title: 'Phase 2 • Dimensions',
           description: 'Upload measurement drawings or answer the next specific measurement question. These files are kept separate from phase 1 item/specification drawings.',
           questions: measurementResult.data.question ? [measurementResult.data.question] : ['Please provide the next missing dimension.'],
           canSkip: true,
         });
         setAiConversationHistory(newHistory);
         setAiAnswers('');
         setIsAiLoading(false);
         return;
       }

       const measurementItems = measurementResult.data.items ?? [];
       const { billId, sectionId } = promptConfig.context ?? {};
       if (!currentProject || !billId || !sectionId || measurementItems.length === 0) {
         setIsAiLoading(false);
         setIsAskingAiQuestions(false);
         return;
       }

       const normalizeMeasurementRows = (rows: AiMeasurementItem['dimensionRows']): DimensionRow[] =>
         rows.map((row) => ({
           id: generateId(),
           multiplier: row.multiplier ?? 1,
           length: row.length ?? 0,
           width: row.width ?? 0,
           height: row.height ?? 0,
           comment: row.comment || 'AI measured',
           isDeduction: row.isDeduction ?? false,
         }));

       const section = currentProject.bills.find((bill) => bill.id === billId)?.sections.find((entry) => entry.id === sectionId);
       const existingItems = section ? getSectionItems(section) : [];
       const updatesById: Record<string, BoQItem> = {};
       const usedIndices = new Set<number>();

       measurementItems.forEach((measurement) => {
         const idx = findMatchingIndex(existingItems, {
           type: (measurement.type as ItemType) || 'PRICED',
           description: measurement.description,
         }, usedIndices);
         if (idx === null) return;

         usedIndices.add(idx);
         const match = existingItems[idx];
         const dimensionRows = normalizeMeasurementRows(measurement.dimensionRows);
         const quantity = measurement.quantity ?? calculateItemQuantity(dimensionRows, measurement.unit ?? match.unit ?? '');
         if (match.aiLocks?.measurements) return;
         updatesById[match.id] = {
           ...match,
           dimensionRows,
           quantity,
           total: safeMul(quantity, match.rate),
         };
       });

       const updatedProject = {
         ...currentProject,
         bills: currentProject.bills.map((bill) =>
           bill.id === billId
             ? {
                 ...bill,
                 sections: bill.sections.map((sectionEntry) =>
                   sectionEntry.id === sectionId
                     ? sectionEntry.pages && sectionEntry.pages.length > 0
                       ? {
                           ...sectionEntry,
                           pages: sectionEntry.pages.map((page) => ({
                             ...page,
                             items: (page.items || []).map((item) => updatesById[item.id] ?? item),
                           })),
                         }
                       : {
                           ...sectionEntry,
                           items: sectionEntry.items.map((item) => updatesById[item.id] ?? item),
                         }
                     : sectionEntry
                 ),
               }
             : bill
         ),
       };

       const snapshotPatch = shouldAutoSnapshot(currentProject)
         ? {
             snapshots: prependSnapshot(
               currentProject.snapshots,
               createSnapshotEntry(
                 currentProject,
                 `Before AI measurements ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
                 'Automatic restore point created before AI measurement take-off updated live quantities.'
               )
             ),
           }
         : {};

       updateProject(currentProject.id, { bills: updatedProject.bills, ...snapshotPatch });
       setAiClarification(null);
       setIsAskingAiQuestions(false);
       setAiAnswers('');
       setAiConversationHistory([]);
       setAiMeasurementFiles([]);
       if (showToast) {
         showToast({ type: 'success', message: `AI measurements applied to ${Object.keys(updatesById).length} item${Object.keys(updatesById).length === 1 ? '' : 's'}.` });
       }
       setIsAiLoading(false);
       return;
     }

     const { analyzeBoQRequest } = await loadGeminiService();
     const analysisResult = await analyzeBoQRequest(answersToUse, newHistory, aiItemFiles, resolvedAiOptions, 'items');
     
     if ('error' in analysisResult) {
       if (showToast) showToast({ type: 'error', message: feedbackError('AI request analysis', analysisResult.error, 'Please try the request again.') });
       setIsAiLoading(false);
       return;
     }
     const analysis = analysisResult.data;
     if (analysis.needsClarification) {
        setAiClarification({
          needsClarification: true,
          phase: 'items',
          title: 'Phase 1 • Bill items',
          description: 'Use this phase for work scope, specification notes, and item descriptions. Drawings added here are only used for bill-item generation.',
          questions: analysis.questions,
          canSkip: true,
        });
        setAiConversationHistory(newHistory);
        setAiAnswers("");
        setIsAiLoading(false);
     } else {
        const { standard } = promptConfig.context ?? {};
        const useStandard = standard || currentProject?.measurementStandard || 'SMM7';
        await handleAiHierarchyGeneration(promptConfig.defaultValue, answersToUse, useStandard, newHistory, aiItemFiles, resolvedAiOptions);
     }
  };

  return {
    isAiLoading,
    setIsAiLoading,
    isAskingAiQuestions,
    setIsAskingAiQuestions,
    aiClarification,
    setAiClarification,
    aiClarificationPhase,
    setAiClarificationPhase,
    aiAnswers,
    setAiAnswers,
    aiConversationHistory,
    setAiConversationHistory,
    aiFiles,
    setAiFiles,
    resetAiWorkflowFiles,
    promptConfig,
    setPromptConfig,
    handleFileUpload,
    handlePaste,
    handleAiHierarchyGeneration,
    submitAiClarification
  };
};
