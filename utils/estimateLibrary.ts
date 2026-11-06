import type { Project, WorkspaceFolder } from '../types';
import {
  ALL_WORKSPACE_FOLDERS_ID,
  ALL_WORKSPACE_YEARS_ID,
  compareFolderYearsDesc,
  compareRevisionDesc,
  folderYearFromRevision,
  getUnfiledFolder,
  UNFILED_ESTIMATE_FOLDER_ID,
  UNFILED_ESTIMATE_FOLDER_NAME,
} from './workspaceFolders';

export type EstimateLibraryYearFolder = {
  year: string;
  projects: Project[];
};

export type EstimateLibraryFolder = {
  folderId: string;
  folderName: string;
  isUnfiled: boolean;
  projectCount: number;
  years: EstimateLibraryYearFolder[];
};

export type EstimateLibraryFolderOption = {
  id: string;
  label: string;
  count: number;
  isUnfiled?: boolean;
};

export type EstimateLibraryDropdownFilters = {
  folderId: string;
  year: string;
  search: string;
};

export type EstimateLibraryDropdownView = {
  selectedFolderId: string;
  selectedYear: string;
  folderOptions: EstimateLibraryFolderOption[];
  yearOptions: string[];
  projects: Project[];
};

function resolveEstimateFolderId(project: Project, estimateFolders: WorkspaceFolder[]) {
  if (!project.estimateFolderId) return UNFILED_ESTIMATE_FOLDER_ID;
  return estimateFolders.some((folder) => folder.id === project.estimateFolderId)
    ? project.estimateFolderId
    : UNFILED_ESTIMATE_FOLDER_ID;
}

export function buildEstimateLibraryFolders(projects: Project[], workspaceFolders: WorkspaceFolder[] = []): EstimateLibraryFolder[] {
  const estimateFolders = workspaceFolders.filter((folder) => folder.module === 'ESTIMATING');
  const folderMap = new Map<string, { folderName: string; isUnfiled: boolean; years: Map<string, Project[]> }>();
  const unfiled = getUnfiledFolder('ESTIMATING');

  estimateFolders.forEach((folder) => {
    folderMap.set(folder.id, {
      folderName: folder.name,
      isUnfiled: false,
      years: new Map(),
    });
  });

  projects.forEach((project) => {
    const assignedFolder = project.estimateFolderId
      ? estimateFolders.find((folder) => folder.id === project.estimateFolderId)
      : null;
    const folderId = assignedFolder?.id || unfiled.id;
    if (!folderMap.has(folderId)) {
      folderMap.set(folderId, {
        folderName: assignedFolder?.name || unfiled.name,
        isUnfiled: !assignedFolder,
        years: new Map(),
      });
    }
    const year = folderYearFromRevision(project.updatedAt);
    const yearMap = folderMap.get(folderId)!.years;
    if (!yearMap.has(year)) yearMap.set(year, []);
    yearMap.get(year)!.push(project);
  });

  return Array.from(folderMap.entries())
    .filter(([, folder]) => folder.years.size > 0 || !folder.isUnfiled)
    .sort(([, a], [, b]) => {
      if (a.isUnfiled && b.isUnfiled) return 0;
      if (a.isUnfiled) return 1;
      if (b.isUnfiled) return -1;
      return a.folderName.localeCompare(b.folderName);
    })
    .map(([folderId, folder]) => {
      const years = Array.from(folder.years.entries())
        .sort(([a], [b]) => compareFolderYearsDesc(a, b))
        .map(([year, yearProjects]) => ({
          year,
          projects: [...yearProjects].sort(compareRevisionDesc),
        }));

      return {
        folderId,
        folderName: folder.folderName,
        isUnfiled: folder.isUnfiled,
        projectCount: years.reduce((count, year) => count + year.projects.length, 0),
        years,
      };
    });
}

export function buildEstimateLibraryDropdownView(
  projects: Project[],
  workspaceFolders: WorkspaceFolder[] = [],
  filters: Partial<EstimateLibraryDropdownFilters> = {}
): EstimateLibraryDropdownView {
  const estimateFolders = workspaceFolders.filter((folder) => folder.module === 'ESTIMATING');
  const folderCounts = new Map<string, number>();
  projects.forEach((project) => {
    const folderId = resolveEstimateFolderId(project, estimateFolders);
    folderCounts.set(folderId, (folderCounts.get(folderId) || 0) + 1);
  });

  const folderOptions: EstimateLibraryFolderOption[] = [
    { id: ALL_WORKSPACE_FOLDERS_ID, label: 'All folders', count: projects.length },
    ...estimateFolders
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((folder) => ({
        id: folder.id,
        label: folder.name,
        count: folderCounts.get(folder.id) || 0,
      })),
    {
      id: UNFILED_ESTIMATE_FOLDER_ID,
      label: UNFILED_ESTIMATE_FOLDER_NAME,
      count: folderCounts.get(UNFILED_ESTIMATE_FOLDER_ID) || 0,
      isUnfiled: true,
    },
  ];
  const selectedFolderId = folderOptions.some((option) => option.id === filters.folderId)
    ? filters.folderId!
    : ALL_WORKSPACE_FOLDERS_ID;
  const folderFilteredProjects = selectedFolderId === ALL_WORKSPACE_FOLDERS_ID
    ? projects
    : projects.filter((project) => resolveEstimateFolderId(project, estimateFolders) === selectedFolderId);
  const yearOptions = Array.from(new Set(folderFilteredProjects.map((project) => folderYearFromRevision(project.updatedAt))))
    .sort(compareFolderYearsDesc);
  const selectedYear = filters.year && filters.year !== ALL_WORKSPACE_YEARS_ID && yearOptions.includes(filters.year)
    ? filters.year
    : ALL_WORKSPACE_YEARS_ID;
  const search = (filters.search || '').trim().toLowerCase();
  const searchedProjects = search
    ? folderFilteredProjects.filter((project) => (
        project.name.toLowerCase().includes(search)
        || (project.client || '').toLowerCase().includes(search)
        || (project.location || '').toLowerCase().includes(search)
        || (project.reference || '').toLowerCase().includes(search)
      ))
    : folderFilteredProjects;
  const projectsForYear = selectedYear === ALL_WORKSPACE_YEARS_ID
    ? searchedProjects
    : searchedProjects.filter((project) => folderYearFromRevision(project.updatedAt) === selectedYear);

  return {
    selectedFolderId,
    selectedYear,
    folderOptions,
    yearOptions,
    projects: [...projectsForYear].sort(compareRevisionDesc),
  };
}
